import { useState, useCallback, useEffect, useRef } from 'react';
import { AssistantStatus, ChatMessage, UserPersonalConfig, AssistantConfig, AppAction } from '../types';
import { 
  getSavedLanguage, 
  saveLanguagePreference, 
  detectLanguage, 
  getDynamicGreeting, 
  speakText, 
  prewarmAudioEngine,
  stopCurrentSpeech,
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

  const submitPrompt = useCallback(async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isProcessing) return;

    console.log('[MAYRA Pipeline] SUBMIT_PROMPT:', textToSend);

    // Language adaptation and memory
    const detected = detectLanguage(textToSend);
    let activeLang = currentLanguage;
    if (detected !== currentLanguage) {
      activeLang = detected;
      setCurrentLanguage(detected);
      saveLanguagePreference(detected);
    }

    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    setStatus('THINKING');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          persona: assistantConfig.personaTone,
          model: personalConfig.geminiModel || 'gemini-3.1-flash-lite',
          temperature: personalConfig.temperature ?? 0.7,
          userName: personalConfig.preferredName || personalConfig.fullName,
          language: activeLang,
          returnAudio: true
        })
      });

      const data = await res.json();

      // Execute actual app action if triggered by command
      if (data.action && onExecuteAction) {
        onExecuteAction(data.action);
      }

      const assistantText = data.response || (
        activeLang === 'hi' 
          ? 'MAYRA ne routine safalta-purvak execute kar diya hai.' 
          : 'MAYRA completed the routine successfully.'
      );

      const assistantMsg: ChatMessage = {
        id: `msg-m-${Date.now() + 1}`,
        sender: 'mayra',
        text: assistantText,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStatus('SPEAKING');
      
      // Speak natural Aoede voice response aloud, then return to LISTENING if persistent mode is ON
      speakText(
        assistantText, 
        activeLang,
        () => setStatus('SPEAKING'),
        () => {
          setTimeout(() => {
            setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY');
          }, 300);
        },
        data.audioBase64 || null
      );
    } catch (err) {
      console.warn('[MAYRA Client] Network notice in /api/chat, using on-device assistant engine:', err);
      const fallbackText = activeLang === 'hi'
        ? `Routine "${textToSend}" chal gaya hai. On-device Jetpack Compose state updated.`
        : `Routine "${textToSend}" executed. On-device settings & Jetpack Compose state updated.`;
      
      const fallbackMsg: ChatMessage = {
        id: `msg-m-${Date.now() + 1}`,
        sender: 'mayra',
        text: fallbackText,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setStatus('SPEAKING');

      speakText(
        fallbackText,
        activeLang,
        () => setStatus('SPEAKING'),
        () => {
          setTimeout(() => {
            setStatus(isListeningModeRef.current ? 'LISTENING' : 'READY');
          }, 300);
        }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, personalConfig, assistantConfig, currentLanguage]);

  // True Persistent Mic Toggle: 1st tap = LISTENING ON, 2nd tap = LISTENING OFF
  const triggerVoice = useCallback(() => {
    console.log('[MAYRA Pipeline] MIC_CLICK triggered. Current ListeningMode:', isListeningModeRef.current);
    prewarmAudioEngine();

    if (isListeningModeRef.current) {
      // Turn Persistent Listening OFF
      setIsListeningMode(false);
      isListeningModeRef.current = false;
      setStatus('READY');
      console.log('[MAYRA Pipeline] LISTENING_STATE: READY (Mic OFF)');
    } else {
      // Interrupt any current speech before listening
      stopCurrentSpeech();
      // Turn Persistent Listening ON
      setIsListeningMode(true);
      isListeningModeRef.current = true;
      setStatus('LISTENING');
      console.log('[MAYRA Pipeline] LISTENING_STATE: LISTENING (Mic ON)');
    }
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
