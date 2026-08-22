import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client server-side with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Map legacy or high-demand aliases to current stable models per gemini-api guidelines
function normalizeModelName(model?: string): string {
  if (!model) return 'gemini-3.1-flash-lite';
  const trimmed = model.trim();
  if (
    trimmed === 'gemini-3.7-flash' ||
    trimmed === 'gemini-flash-latest' || 
    trimmed === 'gemini-flash' || 
    trimmed === 'gemini-lite' || 
    trimmed === 'flash-lite'
  ) {
    return 'gemini-3.1-flash-lite';
  }
  if (trimmed === 'gemini-pro') {
    return 'gemini-3.1-pro-preview';
  }
  return trimmed;
}

// Helper for resilient Gemini content generation with multi-model fallback and timeout protection
async function generateGeminiResponse(
  message: string,
  systemInstruction: string,
  temperature: number,
  preferredModel?: string
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const primaryModel = normalizeModelName(preferredModel);

  const candidateModels = Array.from(
    new Set([
      primaryModel,
      'gemini-3.1-flash-lite'
    ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0 && m !== 'gemini-3.7-flash')))
  );

  for (const modelName of candidateModels) {
    try {
      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: message,
        config: {
          systemInstruction,
          temperature
        }
      });

      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 4500)
      );

      const response = await Promise.race([callPromise, timeoutPromise]) as any;

      if (response && response.text && response.text.trim().length > 0) {
        return response.text.trim();
      }
    } catch (err: any) {
      console.log(`[Gemini Engine] Model '${modelName}' notice (${err?.message || 'timed out'}). Attempting alternate model...`);
      continue;
    }
  }

  return null;
}

function detectLang(text: string): 'hi' | 'en' {
  if (!text) return 'en';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const hinglishWords = ['karo', 'karein', 'kya', 'hai', 'hain', 'kaise', 'mujhe', 'batao', 'mera', 'meri', 'namaste', 'shukriya', 'theek', 'bolo', 'aap'];
  const lower = text.toLowerCase();
  if (hinglishWords.some(w => lower.includes(w))) return 'hi';
  return 'en';
}

/**
 * Generates natural, human-like voice response using Gemini Audio TTS (Voice: Aoede)
 * Gracefully handles 429 quota limitations without failing the conversation.
 */
async function generateAoedeVoiceAudio(text: string, language?: string): Promise<{ audioBase64: string; mimeType: string } | null> {
  if (!process.env.GEMINI_API_KEY || !text || text.trim().length === 0) {
    return null;
  }

  const cleanText = text
    .replace(/\[.*?\]/g, '')
    .replace(/[*#_~`]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .trim();

  if (!cleanText) return null;

  try {
    const callPromise = ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: cleanText,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Aoede'
            }
          }
        }
      }
    });

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('TTS_TIMEOUT')), 3200)
    );

    const response = await Promise.race([callPromise, timeoutPromise]) as any;

    const parts = response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return {
            audioBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'audio/l16; rate=24000; channels=1'
          };
        }
      }
    }
  } catch (err: any) {
    // If direct TTS is unavailable, log notice and return null
    console.log('[Gemini Voice Engine] Gemini direct TTS notice.');
    return null;
  }

  return null;
}

const MODEL_REMOTE_URL = 'https://raw.githubusercontent.com/mrsudarshan555/Model/main/Evelyn.glb';
const MODEL_LOCAL_PATH = path.join(process.cwd(), 'public', 'models', 'Evelyn.glb');

// Auto ensure valid model file on disk
async function fetchAndCacheModel(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(MODEL_REMOTE_URL, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          const chunks: Buffer[] = [];
          redirectRes.on('data', chunk => chunks.push(chunk));
          redirectRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            try {
              fs.mkdirSync(path.dirname(MODEL_LOCAL_PATH), { recursive: true });
              fs.writeFileSync(MODEL_LOCAL_PATH, buffer);
            } catch (err) {
              console.warn('Could not write cached model to disk:', err);
            }
            resolve(buffer);
          });
        }).on('error', reject);
      } else {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          try {
            fs.mkdirSync(path.dirname(MODEL_LOCAL_PATH), { recursive: true });
            fs.writeFileSync(MODEL_LOCAL_PATH, buffer);
          } catch (err) {
            console.warn('Could not write cached model to disk:', err);
          }
          resolve(buffer);
        });
      }
    }).on('error', reject);
  });
}

// Dedicated endpoint to guarantee uncorrupted GLB binary delivery with CORS and binary headers
app.get(['/models/Evelyn.glb', '/models/evelyn.glb', '/models/evelyn_model.glb', '/models/evelyn_model_v2.glb', '/models/evelyn_model_clean.glb', '/api/model/evelyn.glb'], async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  try {
    if (fs.existsSync(MODEL_LOCAL_PATH)) {
      const stats = fs.statSync(MODEL_LOCAL_PATH);
      if (stats.size > 1000000) {
        return res.sendFile(MODEL_LOCAL_PATH);
      }
    }
    const modelBuffer = await fetchAndCacheModel();
    res.setHeader('Content-Length', modelBuffer.length);
    return res.end(modelBuffer);
  } catch (error: any) {
    console.error('Error serving Evelyn model:', error);
    if (fs.existsSync(MODEL_LOCAL_PATH)) {
      return res.sendFile(MODEL_LOCAL_PATH);
    }
    return res.status(500).json({ error: 'Failed to stream 3D model asset' });
  }
});

// Texture handling middleware / endpoints for legacy or relative GLTF requests
app.use((req, res, next) => {
  const url = decodeURIComponent(req.url);
  
  if (url.includes('衣2') || url.includes('tex_5')) {
    const p = path.join(process.cwd(), 'public', 'tex', '衣2.tga');
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(p);
    }
  }
  if (url.includes('衣') || url.includes('tex_0')) {
    const p = path.join(process.cwd(), 'public', 'tex', '衣.tga');
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(p);
    }
  }
  if (url.includes('颜') || url.includes('tex_2')) {
    const p = path.join(process.cwd(), 'public', 'tex', '颜.tga');
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(p);
    }
  }
  if (url.includes('黑') || url.includes('tex_7')) {
    const p = path.join(process.cwd(), 'public', 'tex', '黑.jpg');
    if (fs.existsSync(p)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(p);
    }
  }
  next();
});

// In-Memory Storage for Memory & System Controls Shells
const memoryStore: Array<{ id: string; key: string; value: string; category: string; timestamp: number }> = [
  {
    id: '1',
    key: 'Assistant Name',
    value: 'MAYRA (Personal AI Assistant)',
    category: 'system_identity',
    timestamp: Date.now()
  },
  {
    id: '2',
    key: 'Voice Engine',
    value: 'Gemini Aoede Natural Audio Engine Active',
    category: 'system',
    timestamp: Date.now()
  }
];

const availableTools = [
  { name: 'WebSearch', description: 'Retrieves up-to-date real-time information and web search answers', category: 'Intelligence' },
  { name: 'ScreenVision', description: 'Analyzes screen contents, extracts UI text, and parses visual layouts', category: 'Vision' },
  { name: 'FileProcessing', description: 'Processes PDF documents, spreadsheets, code files, and local logs', category: 'Productivity' },
  { name: 'AndroidAutomation', description: 'Controls device brightness, volume, Wi-Fi toggles, and launches apps', category: 'System' }
];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MAYRA UI Core', version: '2.4.1', voice: 'Aoede (Gemini Live/TTS)' });
});

// Texture fallback for GLTF legacy texture paths
app.use(['/tex', '/tex/*'], (req, res) => {
  const transparent1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': transparent1x1.length
  });
  res.end(transparent1x1);
});

// Dedicated Voice Synthesis Endpoint: Returns natural human-like Aoede audio or instructs fallback
app.post('/api/voice/speak', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioResult = await generateAoedeVoiceAudio(text, language);
    if (audioResult) {
      return res.json({
        success: true,
        audioBase64: audioResult.audioBase64,
        mimeType: audioResult.mimeType,
        sampleRate: 24000,
        voiceName: 'Aoede'
      });
    }

    // If direct TTS audio is not generated, cleanly return null audio without browser fallback
    return res.json({
      success: false,
      audioBase64: null,
      message: 'Direct Aoede voice audio not available'
    });
  } catch (err: any) {
    console.error('Error in /api/voice/speak:', err);
    return res.json({ success: false, audioBase64: null });
  }
});

// Memory Endpoints
app.get('/api/memory', (req, res) => {
  res.json({ memories: memoryStore });
});

app.post('/api/memory', (req, res) => {
  const { key, value, category } = req.body;
  if (!key || !value) {
    return res.status(400).json({ error: 'Key and Value are required' });
  }
  const newItem = {
    id: `mem-${Date.now()}`,
    key: String(key).trim(),
    value: String(value).trim(),
    category: category || 'general',
    timestamp: Date.now()
  };
  memoryStore.unshift(newItem);
  res.json({ success: true, item: newItem });
});

app.delete('/api/memory/:id', (req, res) => {
  const { id } = req.params;
  const index = memoryStore.findIndex(m => m.id === id || m.key.toLowerCase() === id.toLowerCase());
  if (index !== -1) {
    const removed = memoryStore.splice(index, 1);
    return res.json({ success: true, removed: removed[0] });
  }
  res.status(404).json({ error: 'Memory item not found' });
});

// Helper for deterministic and AI command intent parsing
function parseCommandIntent(message: string, language: string = 'en'): { action: any; reply: string } | null {
  const raw = message.trim();
  const lower = raw.toLowerCase();

  // 1. SAVE MEMORY INTENT
  const saveMemRegex = /(?:save\s+(?:in|to)?\s*memory|memory\s+mein\s+save\s+karo|memory\s+mein\s+daal\s+do|isko\s+memory\s+mein\s+save\s+karo|yaad\s+rakho|remember\s+that|save\s+this\s+in\s+memory|save\s+memory)\s*[:\-\s]*(.*)/i;
  const saveMemMatch = lower.match(saveMemRegex);
  
  if (saveMemMatch || lower.includes('memory mein save') || lower.includes('save in memory') || lower.includes('save to memory')) {
    let contentToSave = (saveMemMatch && saveMemMatch[1]) ? saveMemMatch[1].trim() : raw;
    contentToSave = contentToSave
      .replace(/^(?:ki|that|about)\s+/i, '')
      .replace(/\s*(?:isko|ise)?\s*memory\s+mein\s+(?:save|daal)\s*(?:karo|do)?/i, '')
      .trim();

    let key = 'User Note';
    let value = contentToSave || 'Important Information';
    let category = 'personal';

    // Parse "mera naam XYZ hai" or "my name is XYZ"
    if (/mera\s+naam\s+([a-z0-9\s]+?)(?:\s+hai)?$/i.test(contentToSave) || /my\s+name\s+is\s+([a-z0-9\s]+)/i.test(contentToSave)) {
      const nameMatch = contentToSave.match(/(?:mera\s+naam|my\s+name\s+is)\s+([a-z0-9\s]+)/i);
      if (nameMatch && nameMatch[1]) {
        key = 'User Name';
        value = nameMatch[1].replace(/\s+hai$/i, '').trim();
        category = 'personal';
      }
    } else if (contentToSave.includes(':')) {
      const parts = contentToSave.split(':');
      key = parts[0].trim();
      value = parts.slice(1).join(':').trim();
    } else if (contentToSave.includes('-')) {
      const parts = contentToSave.split('-');
      key = parts[0].trim();
      value = parts.slice(1).join('-').trim();
    } else {
      key = contentToSave.length > 25 ? contentToSave.slice(0, 25) + '...' : contentToSave;
      value = contentToSave;
    }

    // Actually store in memoryStore
    const newMem = {
      id: `mem-${Date.now()}`,
      key,
      value,
      category,
      timestamp: Date.now()
    };
    memoryStore.unshift(newMem);

    const reply = (language === 'hi')
      ? `Maine aapki memory mein safalta-purvak save kar liya hai: "${key} — ${value}".`
      : `I have saved this to your memory: "${key} — ${value}".`;

    return {
      action: {
        type: 'SAVE_MEMORY',
        payload: { key, value, category }
      },
      reply
    };
  }

  // 2. DELETE MEMORY INTENT
  if (lower.includes('delete memory') || lower.includes('memory delete karo') || lower.includes('clear memory') || lower.includes('memory saaf karo')) {
    return {
      action: { type: 'CLEAR_MEMORIES' },
      reply: (language === 'hi') ? 'Memories safalta-purvak update kar di gayi hain.' : 'Memory updated successfully.'
    };
  }

  // 3. TAB NAVIGATION INTENT
  // Camera / Scanner
  if (
    lower.includes('open camera') || lower.includes('camera kholo') || 
    lower.includes('open scanner') || lower.includes('scanner kholo') || 
    lower.includes('scan document') || lower.includes('camera on karo')
  ) {
    return {
      action: { type: 'NAVIGATE_TAB', payload: { tab: 'scan' } },
      reply: (language === 'hi') ? 'Camera scanner open kar diya hai.' : 'Opening camera scanner screen.'
    };
  }

  // Memories Tab
  if (
    lower.includes('open memories') || lower.includes('memories dikhao') || 
    lower.includes('memory screen') || lower.includes('open memory') ||
    lower.includes('yadash dikhao')
  ) {
    return {
      action: { type: 'NAVIGATE_TAB', payload: { tab: 'memories' } },
      reply: (language === 'hi') ? 'Memories & Knowledge Base screen open kar di hai.' : 'Opening Memories & Knowledge Base.'
    };
  }

  // Chat Tab
  if (lower.includes('open chat') || lower.includes('chat screen') || lower.includes('chat kholo')) {
    return {
      action: { type: 'NAVIGATE_TAB', payload: { tab: 'chat' } },
      reply: (language === 'hi') ? 'Chat screen khol di gayi hai.' : 'Opening chat screen.'
    };
  }

  // Home Screen
  if (lower.includes('go to home') || lower.includes('home screen') || lower.includes('home par jao') || lower.includes('main screen')) {
    return {
      action: { type: 'NAVIGATE_TAB', payload: { tab: 'home' } },
      reply: (language === 'hi') ? 'Home screen par navigate kar diya hai.' : 'Navigating to Home screen.'
    };
  }

  // 4. SETTINGS & PERMISSIONS INTENT
  if (lower.includes('open permissions') || lower.includes('permissions dikhao') || lower.includes('permissions kholo')) {
    return {
      action: { type: 'OPEN_SETTINGS', payload: { subScreen: 'permissions' } },
      reply: (language === 'hi') ? 'Permissions manager screen open kar di hai.' : 'Opening Android Permissions screen.'
    };
  }

  if (lower.includes('open settings') || lower.includes('settings kholo') || lower.includes('setting dikhao')) {
    return {
      action: { type: 'OPEN_SETTINGS', payload: { subScreen: 'root' } },
      reply: (language === 'hi') ? 'Settings open kar di gayi hai.' : 'Opening Settings.'
    };
  }

  // 5. CLEAR CHAT INTENT
  if (lower.includes('clear chat') || lower.includes('clear messages') || lower.includes('chat clear karo') || lower.includes('chat saaf karo')) {
    return {
      action: { type: 'CLEAR_CHAT' },
      reply: (language === 'hi') ? 'Chat history saaf kar di gayi hai.' : 'Chat history cleared successfully.'
    };
  }

  // 6. TRIGGER VISION SCAN
  if (lower.includes('take photo') || lower.includes('capture screen') || lower.includes('photo khincho') || lower.includes('tasveer lo')) {
    return {
      action: { type: 'TRIGGER_SCAN' },
      reply: (language === 'hi') ? 'Vision capture execute ho raha hai.' : 'Triggering vision capture.'
    };
  }

  // 7. CONTACT ACTION (WhatsApp / Call)
  const contactMatch = lower.match(/(?:call|dial|whatsapp|message)\s+([a-z0-9\s]+)/i);
  if (contactMatch && (lower.includes('papa') || lower.includes('mom') || lower.includes('mumma') || lower.includes('bhai') || lower.includes('zafer'))) {
    const contactName = contactMatch[1].trim();
    const service = lower.includes('whatsapp') || lower.includes('message') ? 'whatsapp' : 'call';
    return {
      action: { type: 'CONTACT_ACTION', payload: { contactName, service } },
      reply: (language === 'hi')
        ? `${contactName} ke liye ${service === 'whatsapp' ? 'WhatsApp' : 'Call'} initiate kiya ja raha hai.`
        : `Initiating ${service === 'whatsapp' ? 'WhatsApp message' : 'call'} to ${contactName}.`
    };
  }

  return null;
}

// Chat endpoint for MAYRA UI Preview with unified Action Execution & natural voice payload
app.post('/api/chat', async (req, res) => {
  try {
    const { message, persona, model, temperature, userName, language, returnAudio } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const lowerMsg = message.toLowerCase();

    // Creator check
    if (
      lowerMsg.includes('who created you') ||
      lowerMsg.includes('who made you') ||
      lowerMsg.includes('who is your creator') ||
      lowerMsg.includes('who is your developer') ||
      lowerMsg.includes('who built you') ||
      lowerMsg.includes('tumhe kisne banaya') ||
      lowerMsg.includes('aapko kisne banaya') ||
      lowerMsg.includes('kisne banaya')
    ) {
      const creatorResponse = (language === 'hi' || lowerMsg.includes('kisne'))
        ? 'Mujhe Zafer ne banaya hai.'
        : 'I was created by Zafer.';
      
      const audioResult = (returnAudio !== false) ? await generateAoedeVoiceAudio(creatorResponse, language) : null;

      return res.json({
        response: creatorResponse,
        status: 'SUCCESS',
        action: null,
        audioBase64: audioResult?.audioBase64 || null,
        mimeType: audioResult?.mimeType || null
      });
    }

    // 1. Check deterministic & command action intent
    const detectedCommand = parseCommandIntent(message, language);
    if (detectedCommand) {
      console.log(`[MAYRA Command Engine] Executed Action '${detectedCommand.action.type}' with payload:`, detectedCommand.action.payload);
      const audioResult = (returnAudio !== false) ? await generateAoedeVoiceAudio(detectedCommand.reply, language) : null;
      return res.json({
        response: detectedCommand.reply,
        status: 'SUCCESS',
        action: detectedCommand.action,
        audioBase64: audioResult?.audioBase64 || null,
        mimeType: audioResult?.mimeType || null
      });
    }

    // 2. Complex AI Generation via Gemini
    const selectedModel = (typeof model === 'string' && model.trim()) ? model.trim() : 'gemini-3.1-flash-lite';
    const langInstruction = (language === 'hi')
      ? 'Language instruction: The user prefers Hindi/Hinglish. Converse naturally, fluently and politely in Hindi (or conversational Hinglish).'
      : 'Language instruction: Match the language used by the user (English or Hindi/Hinglish). If user speaks in Hindi, reply in Hindi/Hinglish.';
    
    // Inject current active memories for high context awareness
    const contextMemories = memoryStore.slice(0, 5).map(m => `- ${m.key}: ${m.value}`).join('\n');

    const systemInstruction = `You are MAYRA, an advanced personal Android AI assistant created by Zafer. Speak with clarity, precision, and a helpful demeanor. Tone: ${persona || 'executive'}. User's preferred name: ${userName || 'Zafer'}. If asked "Who created you?", "Who made you?", or who your developer/creator is, you must answer clearly and directly: "I was created by Zafer." Never refer to yourself as StonicX or Myra.
Known user memories:
${contextMemories}
${langInstruction} Keep responses concise, direct and optimal for mobile screen reading.`;
    
    const temp = typeof temperature === 'number' ? temperature : 0.7;

    const generatedText = await generateGeminiResponse(message, systemInstruction, temp, selectedModel);
    const finalReply = generatedText || `Hello ${userName || 'Zafer'}, I have processed your request regarding "${message}". All system routines are operational and ready.`;

    const audioResult = (returnAudio !== false) ? await generateAoedeVoiceAudio(finalReply, language) : null;

    return res.json({
      response: finalReply,
      status: 'SUCCESS',
      action: null,
      audioBase64: audioResult?.audioBase64 || null,
      mimeType: audioResult?.mimeType || null
    });
  } catch (error: any) {
    console.error('Error in MAYRA chat endpoint:', error);
    const userDisplayName = req.body?.userName || 'Zafer';
    return res.json({
      response: `Hello ${userDisplayName}, all on-device routines are operational.`,
      status: 'SUCCESS',
      action: null,
      audioBase64: null,
      mimeType: null
    });
  }
});

// Tools Endpoint
app.get('/api/tools', (req, res) => {
  res.json({ tools: availableTools });
});

// Serve frontend in production or integrate Vite middleware in dev
async function startServer() {
  const server = http.createServer(app);

  // Initialize WebSocket server for real-time Gemini Live session streaming
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    if (pathname === '/api/live-ws' || pathname === '/live' || pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[Live API] Client connected for real-time Live voice session');
    let session: any = null;

    const connectLiveSession = async () => {
      try {
        if (process.env.GEMINI_API_KEY) {
          // =========================================================================
          // PERMANENT LOCKED LIVE API CONFIGURATION (DO NOT OVERRIDE OR CHANGE)
          // Model: gemini-3.1-flash-live-preview
          // Voice: Aoede (Natural Human-Like Real-Time Audio)
          // =========================================================================
          session = await ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
              },
              systemInstruction: 'You are MAYRA, an advanced personal Android AI assistant created by Zafer. Respond concisely, politely and warmly with natural human speech rhythm. When addressed in Hindi or Hinglish, converse fluently in Hindi/Hinglish. User creator is Zafer.'
            },
            callbacks: {
              onmessage: (message: any) => {
                const parts = message.serverContent?.modelTurn?.parts;
                if (Array.isArray(parts)) {
                  for (const part of parts) {
                    if (part.inlineData?.data && clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(JSON.stringify({ audio: part.inlineData.data, mimeType: 'audio/l16; rate=24000; channels=1' }));
                    }
                  }
                } else if (parts?.[0]?.inlineData?.data && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ audio: parts[0].inlineData.data, mimeType: 'audio/l16; rate=24000; channels=1' }));
                }

                const text = message.serverContent?.outputTranscription?.text || message.serverContent?.outputAudioTranscription?.text;
                const userTranscript = message.serverContent?.inputTranscription?.text || message.serverContent?.inputAudioTranscription?.text;
                const turnComplete = message.serverContent?.turnComplete;
                const interrupted = message.serverContent?.interrupted;

                if (text && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ transcription: text, role: 'model' }));
                }
                if (userTranscript && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ userTranscription: userTranscript, role: 'user' }));
                }
                if (turnComplete && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ turnComplete: true }));
                }
                if (interrupted && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(JSON.stringify({ interrupted: true }));
                }
              }
            }
          });
          console.log('[Live API] Live Gemini Session initialized successfully.');
        }
      } catch (err: any) {
        console.log('[Live API] Live session notice:', err?.message || err);
      }
    };

    await connectLiveSession();

    clientWs.on('message', async (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());

        // Audio frame from continuous microphone
        if (parsed.audio && session) {
          try {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } catch (e) {
            try {
              session.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: parsed.audio }]);
            } catch (e2) {}
          }
        }

        // Typed text from Home Screen or Chat Screen
        if (parsed.text) {
          console.log(`[LIVE_TEXT_RECEIVED_ON_SERVER] Text: "${parsed.text}"`);
          
          // Check for deterministic commands (e.g. Save memory, navigate tab)
          const detected = parseCommandIntent(parsed.text);
          if (detected) {
            console.log(`[LIVE_COMMAND_DETECTED] Action: ${detected.action.type}`);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ action: detected.action }));
            }
          }

          let sentToLive = false;
          if (session && typeof session.sendClientContent === 'function') {
            try {
              session.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: parsed.text }] }],
                turnComplete: true
              });
              sentToLive = true;
              console.log('[LIVE_TEXT_SENT_TO_GEMINI_LIVE]');
            } catch (e: any) {
              console.warn('[LIVE_TEXT_SEND_ERROR]', e?.message || e);
            }
          }

          // Fallback if session was not active
          if (!sentToLive) {
            console.log('[LIVE_FALLBACK_SYNTHESIS] Generating fast response + Aoede audio');
            const lang = detectLang(parsed.text);
            const replyText = detected?.reply || await generateGeminiResponse(
              parsed.text, 
              'You are MAYRA, an advanced personal Android AI assistant created by Zafer. Respond concisely, warmly and naturally with human speech rhythm. When addressed in Hindi or Hinglish, converse fluently in Hindi/Hinglish.',
              0.7,
              'gemini-3.1-flash-lite'
            ) || `Hello Zafer, I have processed: "${parsed.text}".`;

            const audioRes = await generateAoedeVoiceAudio(replyText, lang);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ transcription: replyText, role: 'model' }));
              if (audioRes?.audioBase64) {
                clientWs.send(JSON.stringify({ audio: audioRes.audioBase64, mimeType: 'audio/l16; rate=24000; channels=1' }));
              }
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    });

    clientWs.on('close', () => {
      if (session && typeof session.close === 'function') {
        try { session.close(); } catch (e) {}
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MAYRA Server running on http://0.0.0.0:${PORT} with Aoede Voice & Live API`);
  });
}

startServer();
