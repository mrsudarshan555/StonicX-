import { useState, useCallback, useEffect, useRef } from 'react';
import { AssistantStatus, ChatMessage, UserPersonalConfig, AssistantConfig, AppAction } from '../types';
import { 
  getSavedLanguage, 
  saveLanguagePreference, 
  detectLanguage, 
  getDynamicGreeting, 
  speakText, 
  prewarmAudioEngine,
  playCustomActivationSound,
  stopCurrentSpeech,
  startPcm16kCapture,
  stopPcm16kCapture,
  schedulePcm24kChunk,
  flushQueuedAudio,
  getAudioContext,
  MayraLanguage 
} from '../utils/speechEngine';

export interface UseMayraAssistantProps {
  personalConfig: UserPersonalConfig;
  assistantConfig: AssistantConfig;
  onExecuteAction?: (action: AppAction) => void;
}

export function useMayraAssistant({ personalConfig, assistantConfig, onExecuteAction }: UseMayraAssistantProps) {
  const [status, setStatus] = useState<AssistantStatus>('READY');
  const [isListeningMode, setIsListeningMode] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<MayraLanguage>(() => getSavedLanguage());
  
  const isListeningModeRef = useRef<boolean>(false);
  isListeningModeRef.current = isListeningMode;

  const wsRef = useRef<WebSocket | null>(null);
  const activeModelMsgIdRef = useRef<string | null>(null);
  const activeUserMsgIdRef = useRef<string | null>(null);

  const userName = personalConfig.preferredName || personalConfig.fullName || 'Zafer';
  const initialGreeting = useRef(getDynamicGreeting(userName, getSavedLanguage())).current;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'mayra',
      text: initialGreeting,
      timestamp: Date.now()
    }
  ]);

  const hasGreetedRef = useRef(false);

  // Dynamic natural voice greeting and pre-warming on app launch
  useEffect(() => {
    prewarmAudioEngine();

    const handleFirstTouch = () => {
      prewarmAudioEngine();
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('click', handleFirstTouch, { passive: true });
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });

    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;

    // Small delay to allow audio context readiness
    const timer = setTimeout(() => {
      setStatus('SPEAKING');
      speakText(
        initialGreeting, 
        currentLanguage,
        () => setStatus('SPEAKING'),
        () => {
          setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY');
        }
      );
    }, 800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [initialGreeting, currentLanguage]);

  // Connects or retrieves the persistent Live WebSocket connection
  const getOrConnectLiveWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      console.log('[LIVE_WS_STATE] CONNECTING ->', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[LIVE_WS_STATE] OPEN - Connected to persistent Gemini Live session');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 1. Model Audio Chunks (24 kHz Aoede raw PCM)
          if (data.audio) {
            console.log('[LIVE_AUDIO_CHUNK_RECEIVED] Size:', data.audio.length, 'bytes base64');
            schedulePcm24kChunk(
              data.audio,
              () => {
                setStatus('SPEAKING');
              },
              () => {
                setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY');
              }
            );
          }

          // 2. Model Live Output Transcription
          if (data.transcription) {
            console.log('[LIVE_MODEL_TEXT_RECEIVED] Text:', data.transcription);
            setMessages((prev) => {
              if (activeModelMsgIdRef.current) {
                const id = activeModelMsgIdRef.current;
                const existing = prev.find((m) => m.id === id);
                if (existing) {
                  return prev.map((m) =>
                    m.id === id ? { ...m, text: `${m.text}${data.transcription}` } : m
                  );
                }
              }
              const newId = `msg-m-${Date.now()}`;
              activeModelMsgIdRef.current = newId;
              return [
                ...prev,
                {
                  id: newId,
                  sender: 'mayra',
                  text: data.transcription,
                  timestamp: Date.now()
                }
              ];
            });
          }

          // 3. User Live Input Transcription
          if (data.userTranscription) {
            setMessages((prev) => {
              if (activeUserMsgIdRef.current) {
                const id = activeUserMsgIdRef.current;
                return prev.map((m) =>
                  m.id === id ? { ...m, text: m.text + ' ' + data.userTranscription } : m
                );
              } else {
                const newId = `msg-u-${Date.now()}`;
                activeUserMsgIdRef.current = newId;
                return [
                  ...prev,
                  {
                    id: newId,
                    sender: 'user',
                    text: data.userTranscription,
                    timestamp: Date.now()
                  }
                ];
              }
            });
          }

          // 4. Turn Complete -> Reset active message trackers
          if (data.turnComplete) {
            activeModelMsgIdRef.current = null;
            activeUserMsgIdRef.current = null;
          }

          // 5. Interrupted -> Flush active playback and return to LISTENING
          if (data.interrupted) {
            console.log('[MAYRA Pipeline] LIVE_EVENT: INTERRUPTED (User speaking)');
            flushQueuedAudio();
            setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY');
            activeModelMsgIdRef.current = null;
            activeUserMsgIdRef.current = null;
          }

          // 6. Action Execution (e.g. SAVE_MEMORY, NAVIGATE_TAB, OPEN_SETTINGS)
          if (data.action && onExecuteAction) {
            console.log('[MAYRA Pipeline] LIVE_ACTION_EXECUTED:', data.action.type);
            onExecuteAction(data.action);
          }
        } catch (e) {
          // Ignore JSON parse error
        }
      };

      ws.onerror = (err) => {
        console.warn('[LIVE_WS_STATE] ERROR:', err);
      };

      ws.onclose = () => {
        console.log('[LIVE_WS_STATE] CLOSED');
        wsRef.current = null;
      };

      wsRef.current = ws;
      return ws;
    } catch (err) {
      console.warn('[LIVE_WS_STATE] INIT_ERROR:', err);
      return null;
    }
  }, [onExecuteAction]);

  // Unified sendGeminiText: Old APK style persistent Gemini Live session text turn
  const sendGeminiText = useCallback(async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    console.log(`[HOME_TEXT_SUBMIT] Typed prompt submitted: "${trimmed}"`);
    console.log(`[TEXT_SEND_REQUEST] Sending text turn to Live Session`);

    // Ensure AudioContext is running on user gesture
    prewarmAudioEngine();
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    // Language adaptation and memory
    const detected = detectLanguage(trimmed);
    if (detected !== currentLanguage) {
      setCurrentLanguage(detected);
      saveLanguagePreference(detected);
    }

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: Date.now()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setStatus('THINKING');
    activeModelMsgIdRef.current = null;

    // Connect or reuse existing persistent WebSocket
    const ws = getOrConnectLiveWs();
    console.log(`[LIVE_WS_STATE] ReadyState: ${ws?.readyState}`);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ text: trimmed }));
      console.log(`[LIVE_TEXT_SENT] Dispatched text to /api/live-ws`);
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener('open', () => {
        try {
          ws.send(JSON.stringify({ text: trimmed }));
          console.log(`[LIVE_TEXT_SENT] Dispatched queued text on WebSocket OPEN`);
        } catch (err) {
          console.warn('[LIVE_TEXT_SEND_ERROR]', err);
        }
      }, { once: true });
    } else {
      // Fallback via /api/chat if WebSocket is unavailable
      try {
        console.log('[LIVE_WS_STATE] Fallback to /api/chat');
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            persona: assistantConfig.personaTone,
            model: personalConfig.geminiModel || 'gemini-3.1-flash-lite',
            temperature: personalConfig.temperature ?? 0.7,
            userName: personalConfig.preferredName || personalConfig.fullName,
            language: detected,
            returnAudio: true
          })
        });
        const data = await res.json();
        if (data.action && onExecuteAction) {
          onExecuteAction(data.action);
        }
        const reply = data.response || 'Routine executed.';
        const assistantMsg: ChatMessage = {
          id: `msg-m-${Date.now() + 1}`,
          sender: 'mayra',
          text: reply,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.audioBase64) {
          schedulePcm24kChunk(
            data.audioBase64,
            () => setStatus('SPEAKING'),
            () => setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY')
          );
        } else {
          speakText(
            reply,
            detected,
            () => setStatus('SPEAKING'),
            () => setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY')
          );
        }
      } catch (e) {
        console.warn('Fallback error:', e);
        setStatus('READY');
      }
    }
  }, [currentLanguage, assistantConfig, personalConfig, onExecuteAction, getOrConnectLiveWs]);

  // Main prompt submission for typed chat input (Home Screen / Chat Screen)
  const submitPrompt = useCallback((customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;
    sendGeminiText(textToSend);
  }, [inputText, sendGeminiText]);

  // True Persistent Mic Toggle: 1st tap = LISTENING ON, 2nd tap = LISTENING OFF
  const triggerVoice = useCallback(async () => {
    console.log('[MAYRA Pipeline] MIC_CLICK triggered. Current ListeningMode:', isListeningModeRef.current);
    prewarmAudioEngine();

    if (isListeningModeRef.current) {
      // Turn Persistent Listening OFF
      setIsListeningMode(false);
      isListeningModeRef.current = false;
      stopPcm16kCapture();
      flushQueuedAudio();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
      setStatus('READY');
      console.log('[MAYRA Pipeline] LISTENING_STATE: READY (Mic OFF)');
    } else {
      // Play custom activation sound strictly ONCE on explicit physical user mic click
      playCustomActivationSound();
      // Interrupt any current speech before listening
      flushQueuedAudio();
      // Turn Persistent Listening ON
      setIsListeningMode(true);
      isListeningModeRef.current = true;
      setStatus('LISTENING');
      console.log('[MAYRA Pipeline] LISTENING_STATE: LISTENING (Mic ON)');

      // Connect WebSocket and start continuous raw 16kHz PCM stream
      const ws = getOrConnectLiveWs();
      const started = await startPcm16kCapture((pcmBase64) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ audio: pcmBase64 }));
        }
      });

      if (!started) {
        console.warn('[MAYRA Pipeline] Could not start PCM capture. Retrying permission.');
      }
    }
  }, [getOrConnectLiveWs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPcm16kCapture();
      flushQueuedAudio();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    status,
    setStatus,
    isListeningMode,
    setIsListeningMode,
    inputText,
    setInputText,
    isProcessing,
    messages,
    setMessages,
    submitPrompt,
    triggerVoice,
    clearChat,
    currentLanguage,
    setCurrentLanguage
  };
}
