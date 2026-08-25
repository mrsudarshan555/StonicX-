import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChatMessage, AssistantStatus } from '../../types';
import { 
  Send, Mic, Sparkles, Copy, 
  Paperclip, X, FileText, Image as ImageIcon
} from 'lucide-react';
import { AttachmentBottomSheet, AttachmentItem } from '../common/AttachmentBottomSheet';
import { getDynamicSuggestions } from '../../utils/dynamicSuggestions';

interface ChatScreenProps {
  messages: ChatMessage[];
  status: AssistantStatus;
  inputText: string;
  setInputText: (val: string) => void;
  onSubmitPrompt: (customText?: string, image?: { base64: string; mimeType?: string; name?: string; size?: string }) => void;
  onTriggerVoice: () => void;
  onClearChat: () => void;
  onOpenVisionScanner?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  status,
  inputText,
  setInputText,
  onSubmitPrompt,
  onTriggerVoice,
  onClearChat,
  onOpenVisionScanner
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<AttachmentItem | null>(null);
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // Keyboard open/close layout coordinator via visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualResize = () => {
      if (!window.visualViewport) return;
      const visualHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const offset = Math.max(0, windowHeight - visualHeight - (window.visualViewport.offsetTop || 0));
      setKeyboardOffset(offset);
      if (offset > 40) {
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };

    window.visualViewport.addEventListener('resize', handleVisualResize);
    window.visualViewport.addEventListener('scroll', handleVisualResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualResize);
      window.visualViewport?.removeEventListener('scroll', handleVisualResize);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isDoc = attachedFile?.mimeType?.includes('pdf') || 
                  attachedFile?.mimeType?.includes('text') || 
                  attachedFile?.mimeType?.includes('csv') || 
                  attachedFile?.mimeType?.includes('json') ||
                  attachedFile?.name.match(/\.(pdf|txt|csv|json|md|doc|docx)$/i);

    const defaultPrompt = isDoc
      ? `Please read and analyze this attached document (${attachedFile?.name}). Summarize key points and explain its contents.`
      : 'Please analyze what is in this image in detail.';

    const promptToSend = attachedFile && !inputText.trim()
      ? defaultPrompt
      : inputText;
    
    const filePayload = attachedFile?.dataUrl 
      ? { 
          base64: attachedFile.dataUrl, 
          mimeType: attachedFile.mimeType || (isDoc ? 'application/pdf' : 'image/jpeg'),
          name: attachedFile.name,
          size: attachedFile.size
        }
      : undefined;

    console.log('[MAYRA ChatScreen] Submitting message with attachment data:', {
      prompt: promptToSend,
      hasAttachment: Boolean(attachedFile),
      attachmentName: attachedFile?.name,
      mimeType: filePayload?.mimeType,
      dataUrlLength: attachedFile?.dataUrl ? attachedFile.dataUrl.length : 0
    });

    onSubmitPrompt(promptToSend, filePayload);
    setAttachedFile(null);
  };

  const [rotationSeed, setRotationSeed] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationSeed(prev => (prev + 1) % 10);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const samplePrompts = useMemo(() => {
    return getDynamicSuggestions(messages, 'en', rotationSeed);
  }, [messages, rotationSeed]);

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#070913] text-slate-200 relative min-h-0 transition-[padding-bottom] duration-200 ease-out"
      style={keyboardOffset > 0 ? { paddingBottom: `${keyboardOffset}px` } : undefined}
    >
      
      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col min-h-0 scrollbar-thin">
        <div className="space-y-3 w-full flex flex-col">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-sans transition-all ${
                    isUser
                      ? 'bg-blue-600/85 backdrop-blur-xl border border-white/20 text-white rounded-br-sm shadow-[0_4px_20px_rgba(37,99,235,0.25)]'
                      : 'bg-white/[0.07] backdrop-blur-2xl border border-white/15 text-slate-100 rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] font-mono text-cyan-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        <span>MAYRA</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(msg.text)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Copy response"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Render attached image or document in user bubble if present */}
                  {msg.image && (msg.image.url || msg.image.base64) && (
                    <div className="mb-2">
                      {msg.image.mimeType?.startsWith('image/') || (!msg.image.mimeType && !msg.image.name?.match(/\.(pdf|txt|csv|json|md|doc|docx)$/i)) ? (
                        <div className="overflow-hidden rounded-lg border border-white/20 max-w-[220px]">
                          <img 
                            src={msg.image.url || msg.image.base64} 
                            alt="Attached vision snapshot" 
                            className="w-full h-auto object-cover max-h-48"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-black/40 rounded-xl border border-white/20 text-left max-w-[240px]">
                          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-white truncate">{msg.image.name || 'Document'}</p>
                            <p className="text-[9px] text-slate-300 uppercase">{msg.image.mimeType?.split('/')[1] || 'PDF'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                </div>
              </div>
            );
          })}

          {/* Thinking / Reasoning Indicator */}
          {status === 'THINKING' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.07] backdrop-blur-2xl border border-cyan-400/30 rounded-2xl rounded-bl-sm w-fit text-xs text-cyan-300 font-mono shadow-md animate-pulse">
              <Sparkles className="w-3 h-3 animate-spin text-cyan-400" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Suggested Chips (if few messages) */}
      {messages.length < 3 && (
        <div className="px-3.5 py-1 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
          {samplePrompts.map((p) => (
            <button
              key={p}
              onClick={() => {
                setInputText(p);
              }}
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-full text-[10px] text-slate-300 whitespace-nowrap shrink-0 transition-all shadow-sm"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar with Rounded Rectangle Proportion */}
      <div className="p-3 bg-transparent flex flex-col gap-1.5 shrink-0 sticky bottom-0 z-10">
        {/* Attached File Chip (if any) */}
        {attachedFile && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl text-[11px] font-mono text-cyan-300 shadow-md">
            <div className="flex items-center gap-2 truncate">
              {attachedFile.dataUrl && (attachedFile.mimeType?.startsWith('image/') || attachedFile.type === 'gallery' || attachedFile.type === 'photo') ? (
                <img 
                  src={attachedFile.dataUrl} 
                  alt="Thumb" 
                  className="w-5 h-5 rounded object-cover border border-cyan-400/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{attachedFile.name}</span>
              <span className="text-[9px] text-cyan-400/60">({attachedFile.size})</span>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="p-0.5 text-slate-400 hover:text-red-400 rounded-md transition-colors ml-2"
              title="Remove attachment"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleFormSubmit}
          className="bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-white/[0.14] backdrop-blur-2xl border border-white/15 focus-within:border-cyan-400/50 rounded-xl flex items-center px-2.5 py-1.5 gap-1.5 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] focus-within:shadow-[0_4px_24px_rgba(6,182,212,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]"
        >
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] rounded-lg transition-all shrink-0"
            title="Attach photo, video, audio or document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Assistant Mic Button */}
          <button
            type="button"
            onClick={onTriggerVoice}
            className={`p-1.5 rounded-lg transition-all shrink-0 border ${
              status === 'LISTENING'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.8)] animate-pulse'
                : 'bg-transparent text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] border-transparent'
            }`}
            title={status === 'LISTENING' ? 'Listening... Tap to stop' : 'Voice Assistant'}
          >
            <Mic className={`w-4 h-4 ${status === 'LISTENING' ? 'fill-white/20' : 'fill-none'}`} />
          </button>

          {/* Center: Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 120);
            }}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-slate-400 font-sans min-w-0"
          />

          {/* Right: Send Button inside input */}
          <button
            type="submit"
            disabled={!inputText.trim() && !attachedFile}
            className="p-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-white transition-all shadow-md active:scale-95 shrink-0"
            title="Send prompt"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Modern Glassmorphic Attachment Bottom Sheet */}
      <AttachmentBottomSheet
        isOpen={isAttachmentSheetOpen}
        onClose={() => setIsAttachmentSheetOpen(false)}
        onSelectAttachment={(item) => {
          setAttachedFile(item);
        }}
        onOpenVisionScanner={onOpenVisionScanner}
      />

    </div>
  );
};
