/**
 * MAYRA Voice & Live Audio Speech Engine
 * Powered by Pure Gemini Aoede Natural Voice Synthesis & Web Audio API (24kHz PCM).
 * Includes robust AudioContext lifecycle management, echo cancellation & feedback prevention,
 * and media stream cleanup.
 */

const LANGUAGE_STORAGE_KEY = 'mayra_preferred_language';

export type MayraLanguage = 'en' | 'hi';

let outputAudioContext: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
const audioResponseCache = new Map<string, string>();

/**
 * Standard Hardware Echo Cancellation & Noise Suppression Constraints
 * Explicitly prevents acoustic feedback loops and squealing.
 */
export const MICROPHONE_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: false
};

// Global registry of active microphone streams for clean session tear-down
let activeMicStream: MediaStream | null = null;

/**
 * Clean up existing audio streams and tracks before starting a new recording session
 */
export function cleanupAudioStreams(stream?: MediaStream | null): void {
  const target = stream || activeMicStream;
  if (target) {
    try {
      target.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // Ignore track stop errors
        }
      });
    } catch (e) {
      // Ignore
    }
  }
  if (!stream && activeMicStream) {
    activeMicStream = null;
  }
}

/**
 * Safely requests a microphone stream with echo cancellation and stores it for tracking
 */
export async function acquireMicrophoneStream(): Promise<MediaStream | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('[MAYRA Pipeline] GET_USER_MEDIA: NOT_SUPPORTED');
    return null;
  }

  // Clean up any stale streams first
  cleanupAudioStreams();

  try {
    console.log('[MAYRA Pipeline] GET_USER_MEDIA: REQUESTING');
    const stream = await navigator.mediaDevices.getUserMedia(MICROPHONE_CONSTRAINTS);
    activeMicStream = stream;
    const audioTracks = stream.getAudioTracks();
    const isActive = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
    console.log('[MAYRA Pipeline] STREAM_ACTIVE:', isActive ? 'ACTIVE' : 'INACTIVE', {
      trackCount: audioTracks.length,
      label: audioTracks[0]?.label || 'Default Mic'
    });
    return stream;
  } catch (err) {
    console.warn('[MAYRA Pipeline] GET_USER_MEDIA_ERROR:', err);
    return null;
  }
}

/**
 * Safe singleton AudioContext accessor.
 * Prevents rapid re-initialization loops and buffer overflows.
 */
export function getAudioContext(): AudioContext {
  if (!outputAudioContext || outputAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
  }
  return outputAudioContext;
}

/**
 * Prewarms AudioContext on user gesture without throwing or rapid loops
 */
export function prewarmAudioEngine(): void {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    // Ignore prewarm errors
  }
}

/**
 * Cleanly stops any active speech playback source
 */
export function stopCurrentSpeech(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {
      // Ignore
    }
    currentSourceNode = null;
  }
}

/**
 * Plays 16-bit PCM little-endian 24kHz audio base64 through Web Audio API
 */
export function playRawPcm24kAudio(
  base64Data: string,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || !base64Data) {
    return false;
  }

  try {
    stopCurrentSpeech();
    const audioCtx = getAudioContext();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert Int16 PCM to Float32 [-1, 1]
    const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    if (int16Array.length === 0) return false;

    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    currentSourceNode = source;
    console.log('[MAYRA Pipeline] PLAY_PCM_AUDIO: STARTED (24kHz Raw PCM Aoede Buffer, Samples:', float32Array.length, ')');

    if (onStart) onStart();

    source.onended = () => {
      console.log('[MAYRA Pipeline] PLAY_PCM_AUDIO: COMPLETED');
      if (currentSourceNode === source) {
        currentSourceNode = null;
      }
      if (onEnd) onEnd();
    };

    source.start(0);
    return true;
  } catch (err) {
    console.warn('[Voice Engine] Web Audio PCM playback error:', err);
    return false;
  }
}

export function getSavedLanguage(): MayraLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'hi' || saved === 'en') return saved;
  } catch (e) {
    // Ignore storage errors
  }
  return 'en';
}

export function saveLanguagePreference(lang: MayraLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Detects whether a string is primarily Hindi (Devanagari or Romanized Hinglish) or English
 */
export function detectLanguage(text: string): MayraLanguage {
  if (!text || typeof text !== 'string') return 'en';
  
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    return 'hi';
  }

  const hinglishWords = [
    'namaste', 'kaise', 'kaisi', 'haal', 'kya', 'hai', 'hain', 'ho', 'hoga',
    'batao', 'karo', 'shukriya', 'dhanyawad', 'dhanyavaad', 'aap', 'tum', 'mera',
    'meri', 'mere', 'accha', 'theek', 'bolo', 'sunao', 'kuch', 'kaam', 'madad',
    'chahiye', 'kaun', 'kahan', 'kab', 'kyun', 'nahi', 'haan', 'namaskar'
  ];

  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = lower.split(/\s+/).filter(Boolean);
  
  let hinglishCount = 0;
  for (const w of words) {
    if (hinglishWords.includes(w)) {
      hinglishCount++;
    }
  }

  if (hinglishCount >= 1 && words.length <= 4) {
    return 'hi';
  }
  if (words.length > 0 && hinglishCount / words.length >= 0.25) {
    return 'hi';
  }

  return 'en';
}

/**
 * Generates dynamic greeting according to user language preference
 */
export function getDynamicGreeting(name: string = 'Zafer', lang: MayraLanguage = 'en'): string {
  if (lang === 'hi') {
    return `Hii ${name}, kya haal hai? Aaj hum kya karein?`;
  }
  return `Hi ${name}, how's it going? What are we doing today?`;
}

/**
 * Strips formatting, markdown, and meta headers from text before speaking aloud
 */
export function sanitizeTextForSpeech(text: string): string {
  return text
    .replace(/\[.*?\]/g, '')
    .replace(/[*#_~`]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Speaks text using Direct Gemini Aoede Voice API (24kHz PCM)
 * Pure direct audio pipeline without any browser speech synthesis fallback.
 */
export async function speakText(
  text: string, 
  lang: MayraLanguage = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  audioBase64Payload?: string | null
): Promise<void> {
  const cleanText = sanitizeTextForSpeech(text);
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // 1. If audio base64 is already provided in the response payload, play directly
  if (audioBase64Payload) {
    audioResponseCache.set(`${lang}:${cleanText}`, audioBase64Payload);
    const success = playRawPcm24kAudio(audioBase64Payload, onStart, onEnd);
    if (success) return;
  }

  // 2. Check local audio response cache for zero network latency
  const cacheKey = `${lang}:${cleanText}`;
  if (audioResponseCache.has(cacheKey)) {
    const cachedAudio = audioResponseCache.get(cacheKey)!;
    const played = playRawPcm24kAudio(cachedAudio, onStart, onEnd);
    if (played) return;
  }

  // 3. Attempt direct natural Gemini Aoede Voice from backend
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, language: lang }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        audioResponseCache.set(cacheKey, data.audioBase64);
        const played = playRawPcm24kAudio(data.audioBase64, onStart, onEnd);
        if (played) return;
      }
    }
  } catch (err) {
    // Network or timeout notice
  }

  // Pure direct pipeline: if server audio is not available, do NOT play robotic browser voice.
  if (onEnd) {
    onEnd();
  }
}
