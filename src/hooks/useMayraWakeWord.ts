import { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantStatus } from '../types';
import { 
  getSavedLanguage, 
  prewarmAudioEngine, 
  cleanupAudioStreams, 
  acquireMicrophoneStream 
} from '../utils/speechEngine';

interface UseMayraWakeWordProps {
  onWakeWordDetected: (transcript?: string) => void;
  onSpeechCaptured?: (transcript: string) => void;
  status: AssistantStatus;
  isListeningMode?: boolean;
  enabled?: boolean;
}

/**
 * useMayraWakeWord: Resilient Android & Web Speech Recognition Voice Engine
 * - Clean SpeechRecognition without conflicting getUserMedia hardware locks
 * - Anti-Loop Guard: Eliminates repetitive synthetic beeping / rapid restart loops
 * - Multi-language STT support (hi-IN, en-IN, en-US) for natural Hindi/Hinglish speech
 * - Voice Activity Detection with graceful silence debounce and clean turn-taking
 * - Echo cancellation and automatic suppression while assistant is speaking or thinking
 */
export function useMayraWakeWord({
  onWakeWordDetected,
  onSpeechCaptured,
  status,
  isListeningMode = false,
  enabled = true
}: UseMayraWakeWordProps) {
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [lastDetectedPhrase, setLastDetectedPhrase] = useState<string | null>(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState<boolean | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const currentInterimTextRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);

  // Anti-looping & state lifecycle guards
  const isStartedRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const consecutiveErrorCountRef = useRef<number>(0);
  const lastStartTimeRef = useRef<number>(0);

  const isEnabledRef = useRef(enabled);
  const statusRef = useRef(status);
  const isListeningModeRef = useRef(isListeningMode);

  isEnabledRef.current = enabled;
  statusRef.current = status;
  isListeningModeRef.current = isListeningMode;

  // Wake-word regex matching "mayra", "hey mayra", "myra", "mayra utho", "ok mayra", "mira"
  const WAKE_WORD_REGEX = /(?:hey|ok|hi|hello|namaste|sun)?\s*(?:mayra|myra|mira|maira)\s*(?:utho|jaago|listen|wake\s*up)?/i;

  // Dispatch captured speech safely with debouncing & state suppression
  const dispatchCapturedSpeech = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Strict echo/state suppression
    if (statusRef.current === 'SPEAKING' || statusRef.current === 'THINKING') return;

    const now = Date.now();
    if (now - lastProcessedTimeRef.current < 1000) return;
    lastProcessedTimeRef.current = now;

    console.log('[MAYRA Pipeline] TRANSCRIPT:', trimmed);
    console.log('[MAYRA Pipeline] STT_STATE: COMPLETED');
    console.log('[MAYRA Pipeline] COMMAND_STATE: DISPATCHING');
    setLastDetectedPhrase(trimmed);
    currentInterimTextRef.current = '';
    consecutiveErrorCountRef.current = 0;

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop recognition before submitting to avoid overlapping input while processing
    if (recognitionRef.current && isStartedRef.current) {
      try {
        isStoppingRef.current = true;
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }

    if (onSpeechCaptured) {
      onSpeechCaptured(trimmed);
    } else {
      onWakeWordDetected(trimmed);
    }
  }, [onSpeechCaptured, onWakeWordDetected]);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        isStoppingRef.current = true;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    isStartedRef.current = false;
    isStoppingRef.current = false;
    setIsListeningForWakeWord(false);
  }, []);

  const startListening = useCallback(async () => {
    // Echo Suppression: Never listen while assistant is actively speaking or thinking
    if (
      typeof window === 'undefined' || 
      statusRef.current === 'SPEAKING' || 
      statusRef.current === 'THINKING' ||
      isStartingRef.current ||
      isStartedRef.current
    ) {
      return;
    }

    // Prevent rapid restart spam (throttle to at least 800ms between start calls)
    const now = Date.now();
    if (now - lastStartTimeRef.current < 800) {
      return;
    }
    lastStartTimeRef.current = now;

    prewarmAudioEngine();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Voice Engine] SpeechRecognition API not available in current browser environment.');
      setIsListeningForWakeWord(false);
      return;
    }

    // Ensure microphone permission & hardware echo cancellation are primed cleanly
    if (hasMicrophonePermission === null) {
      try {
        const stream = await acquireMicrophoneStream();
        if (stream) {
          console.log('[MAYRA Pipeline] MIC_PERMISSION: GRANTED');
          console.log('[MAYRA Pipeline] MIC_STREAM: ACTIVE');
          setHasMicrophonePermission(true);
          // Release test probe tracks so SpeechRecognition has sole control
          cleanupAudioStreams(stream);
        } else {
          console.warn('[MAYRA Pipeline] MIC_PERMISSION: DENIED / UNAVAILABLE');
          setHasMicrophonePermission(false);
        }
      } catch (e) {
        console.error('[MAYRA Pipeline] MIC_STREAM_ERROR:', e);
      }
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
        recognitionRef.current = null;
      }

      isStartingRef.current = true;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      // Select dynamic STT language based on user preference
      const langPref = getSavedLanguage();
      recognition.lang = (langPref === 'hi') ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        console.log('[MAYRA Pipeline] RECOGNITION_START: STARTED (Lang: ' + recognition.lang + ')');
        console.log('[MAYRA Pipeline] LISTENING_STATE: LISTENING');
        isStartingRef.current = false;
        isStartedRef.current = true;
        isStoppingRef.current = false;
        consecutiveErrorCountRef.current = 0;
        setIsListeningForWakeWord(true);
        setHasMicrophonePermission(true);
      };

      recognition.onaudiostart = () => {
        console.log('[MAYRA Pipeline] AUDIO_EVENT_RECEIVED: AUDIOPATH_ACTIVE');
      };

      recognition.onspeechstart = () => {
        console.log('[MAYRA Pipeline] AUDIO_EVENT_RECEIVED: USER_SPEECH_DETECTED');
      };

      recognition.onresult = (event: any) => {
        // Strict echo suppression: Ignore inputs if assistant is speaking or thinking
        if (statusRef.current === 'SPEAKING' || statusRef.current === 'THINKING') {
          return;
        }

        const results = event.results;
        let interimText = '';
        let isFinalResult = false;

        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const text = result[0]?.transcript?.trim() || '';
          if (!text) continue;

          if (result.isFinal) {
            isFinalResult = true;
            interimText = text;
          } else {
            interimText = text;
          }
        }

        if (!interimText) return;
        console.log('[MAYRA Pipeline] ONRESULT:', isFinalResult ? 'FINAL' : 'INTERIM', '| TEXT:', interimText);
        console.log('[MAYRA Pipeline] TRANSCRIPT_TEXT:', interimText);
        const lower = interimText.toLowerCase();

        // Mode A: Persistent Mic Mode (User tapped Mic ON)
        if (isListeningModeRef.current) {
          currentInterimTextRef.current = interimText;

          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          if (isFinalResult && interimText.length > 1) {
            // For final results, brief 500ms debounce to allow multi-clause natural speaking
            silenceTimeoutRef.current = setTimeout(() => {
              if (
                currentInterimTextRef.current &&
                currentInterimTextRef.current.length >= 2 &&
                statusRef.current !== 'SPEAKING' &&
                statusRef.current !== 'THINKING'
              ) {
                dispatchCapturedSpeech(currentInterimTextRef.current);
              }
            }, 500);
          } else {
            // Natural 1400ms silence detection: gives user time to complete their thought
            silenceTimeoutRef.current = setTimeout(() => {
              if (
                currentInterimTextRef.current && 
                currentInterimTextRef.current.length >= 2 &&
                statusRef.current !== 'SPEAKING' && 
                statusRef.current !== 'THINKING'
              ) {
                dispatchCapturedSpeech(currentInterimTextRef.current);
              }
            }, 1400);
          }
          return;
        }

        // Mode B: Background Wake-Word Detection ("Mayra", "Hey Mayra", "Mayra utho")
        if (WAKE_WORD_REGEX.test(lower)) {
          console.log('[Wake-Word] Trigger detected:', interimText);
          setLastDetectedPhrase(interimText);

          // Extract any query that immediately followed the wake word
          const match = lower.match(WAKE_WORD_REGEX);
          let followingQuery = '';
          if (match && match.index !== undefined) {
            const matchedLength = match[0].length;
            followingQuery = interimText.substring(match.index + matchedLength).trim();
          }

          try {
            isStoppingRef.current = true;
            recognition.stop();
          } catch (e) {
            // Ignore
          }
          setIsListeningForWakeWord(false);
          isStartedRef.current = false;
          onWakeWordDetected(followingQuery);
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        const errType = event.error;

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setHasMicrophonePermission(false);
          setIsListeningForWakeWord(false);
          isStartedRef.current = false;
          consecutiveErrorCountRef.current = 10; // Prevent loop
        } else if (errType === 'no-speech') {
          consecutiveErrorCountRef.current += 1;
        } else if (errType === 'language-not-supported') {
          // Fallback to en-US if hi-IN is not bundled in specific browser
          try {
            recognition.lang = 'en-US';
          } catch (e) {
            // Ignore
          }
        } else if (errType === 'aborted') {
          // Normal during controlled stop/abort
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isStartedRef.current = false;
        setIsListeningForWakeWord(false);

        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }

        // Anti-Beep Guard: Only restart if listening is actively desired, assistant is calm,
        // and we are not in an error loop (consecutive errors < 4)
        const shouldRestart = 
          isEnabledRef.current && 
          !isStoppingRef.current &&
          consecutiveErrorCountRef.current < 4 &&
          (isListeningModeRef.current || statusRef.current === 'READY' || statusRef.current === 'LISTENING') && 
          statusRef.current !== 'SPEAKING' && 
          statusRef.current !== 'THINKING';

        if (shouldRestart) {
          // Safe 800ms debounce prevents browser activation tone / beeping loop
          restartTimeoutRef.current = setTimeout(() => {
            if (
              isEnabledRef.current && 
              statusRef.current !== 'SPEAKING' && 
              statusRef.current !== 'THINKING' &&
              !isStartedRef.current
            ) {
              startListening();
            }
          }, 800);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      isStartedRef.current = false;
      console.warn('[Voice Engine] SpeechRecognition start warning:', err);
      setIsListeningForWakeWord(false);
    }
  }, [dispatchCapturedSpeech, hasMicrophonePermission, onWakeWordDetected]);

  // Synchronize microphone listening with assistant state & echo suppression
  useEffect(() => {
    if (
      enabled && 
      (isListeningMode || status === 'READY' || status === 'LISTENING') && 
      status !== 'SPEAKING' && 
      status !== 'THINKING'
    ) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, isListeningMode, status, startListening, stopListening]);

  return {
    isListeningForWakeWord,
    lastDetectedPhrase,
    hasMicrophonePermission,
    startListening,
    stopListening
  };
}
