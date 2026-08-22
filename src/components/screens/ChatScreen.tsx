import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, AssistantStatus } from '../../types';
import { 
  Send, Mic, Sparkles, Copy, 
  Trash2, Paperclip, X, FileText
} from 'lucide-react';
import { AttachmentBottomSheet } from '../common/AttachmentBottomSheet';

interface ChatScreenProps {
  messages: ChatMessage[];
  status: AssistantStatus;
  inputText: string;
  setInputText: (val: string) => void;
  onSubmitPrompt: () => void;
  onTriggerVoice: () => void;
  onClearChat: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  status,
  inputText,
  setInputText,
  onSubmitPrompt,
  onTriggerVoice,
  onClearChat
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setAttachedFile({ name: file.name, size: sizeStr });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (attachedFile && !inputText.trim()) {
      setInputText(`[Attached file: ${attachedFile.name} (${attachedFile.size})]`);
    }
    onSubmitPrompt();
    setAttachedFile(null);
  };

  const samplePrompts = [
    'Summarize current Android architecture status',
    'What skills are currently active in MAYRA?',
    'How does Voice Guardian protect my commands?'
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#070913] text-slate-200 relative">
      
      {/* Messages Stream - Top-aligned standard conversation flow */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col min-h-0">
        <div className="space-y-3.5 w-full flex flex-col">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed font-sans transition-all ${
                    isUser
                      ? 'bg-blue-600/85 backdrop-blur-xl border border-white/20 text-white rounded-br-sm shadow-[0_8px_25px_rgba(37,99,235,0.3)]'
                      : 'bg-white/[0.07] backdrop-blur-2xl border border-white/15 text-slate-100 rounded-bl-sm shadow-[0_8px_32px_rgba(0,0,0,0.37)]'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[9px] font-mono text-cyan-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> MAYRA
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

                  <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                </div>

                {isUser && (
                  <span className="text-[8px] font-mono text-slate-500 px-1.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {status === 'THINKING' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.07] backdrop-blur-2xl border border-cyan-400/30 rounded-2xl rounded-bl-sm w-fit text-xs text-cyan-300 font-mono shadow-[0_8px_32px_rgba(0,0,0,0.35)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>MAYRA is reasoning...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Suggested Chips (if few messages) */}
      {messages.length < 3 && (
        <div className="px-3.5 py-1.5 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
          {samplePrompts.map((p) => (
            <button
              key={p}
              onClick={() => {
                setInputText(p);
              }}
              className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl border border-white/15 rounded-xl text-[10px] text-slate-200 whitespace-nowrap shrink-0 transition-all shadow-sm"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input for Attachment */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Input Bar with Fixed Bottom Alignment */}
      <div className="p-3 border-t border-white/10 bg-slate-950/80 backdrop-blur-2xl flex flex-col gap-1.5 shrink-0 sticky bottom-0 z-10">
        {/* Attached File Chip (if any) */}
        {attachedFile && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl text-[11px] font-mono text-cyan-300 shadow-md">
            <div className="flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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
          className="bg-slate-900/75 backdrop-blur-2xl border border-white/15 focus-within:border-cyan-400/50 rounded-2xl flex items-center px-2 py-1.5 gap-1.5 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          {/* Left: Attachment Paperclip Button (Gemini-Style Action Sheet) */}
          <button
            type="button"
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] rounded-xl transition-all shrink-0"
            title="Attach photo, video, audio or document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Left: Voice Assistant Mic Button */}
          <button
            type="button"
            onClick={onTriggerVoice}
            className={`p-1.5 rounded-xl transition-all shrink-0 border ${
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
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to MAYRA..."
            className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-slate-400 font-sans min-w-0"
          />

          {/* Right: Send Button inside input */}
          <button
            type="submit"
            disabled={!inputText.trim() && !attachedFile}
            className="p-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-white transition-all shadow-md active:scale-95 shrink-0"
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
          setAttachedFile({
            name: item.name,
            size: item.size
          });
        }}
      />

    </div>
  );
};
