import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantStatus, UserPersonalConfig, AssistantConfig, PermissionItem, CharacterModelMetadata } from '../../types';
import { MayraAvatar } from '../character/MayraAvatar';
import { useCharacterController } from '../../hooks/useCharacterController';
import { MayraLogo } from '../common/MayraLogo';
import { AttachmentBottomSheet } from '../common/AttachmentBottomSheet';
import { speakText } from '../../utils/speechEngine';
import { 
  Settings as SettingsIcon, Mic, Send, Paperclip, 
  Sparkles, ScreenShare, Lock, Unlock, FileText, 
  X, PenTool
} from 'lucide-react';

interface HomeScreenProps {
  status: AssistantStatus;
  personalConfig: UserPersonalConfig;
  assistantConfig: AssistantConfig;
  permissions: PermissionItem[];
  inputText: string;
  setInputText: (text: string) => void;
  onSubmitPrompt: (customText?: string) => void;
  onTriggerVoice: () => void;
  onSelectAction: (action: string) => void;
  onOpenSettings: () => void;
  onOpenPermissions: () => void;
  onOpenWhiteboard?: () => void;
  modelMetadata?: CharacterModelMetadata;
  proactiveEnabled?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  status,
  personalConfig,
  assistantConfig,
  permissions,
  inputText,
  setInputText,
  onSubmitPrompt,
  onTriggerVoice,
  onSelectAction,
  onOpenSettings,
  onOpenPermissions,
  onOpenWhiteboard,
  modelMetadata,
  proactiveEnabled = true
}) => {
  const {
    transform,
    lockState,
    isDragging,
    toggleLock,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleWheel
  } = useCharacterController(status);

  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [screenShareNotice, setScreenShareNotice] = useState<string | null>(null);
  const [lockToast, setLockToast] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState<boolean>(false);
  const [isProactivePromptActive, setIsProactivePromptActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleLock = () => {
    toggleLock();
    const nextLocked = !lockState.isLocked;
    setLockToast(nextLocked ? 'Character Pose & Orbit Locked' : 'Character Pose Unlocked');
    setTimeout(() => {
      setLockToast(null);
    }, 2200);
  };

  // 15-Second Idle Check-In
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (isProactivePromptActive) {
      setIsProactivePromptActive(false);
    }

    if (proactiveEnabled && status === 'READY') {
      idleTimerRef.current = setTimeout(() => {
        setIsProactivePromptActive(true);
      }, 15000);
    }
  }, [proactiveEnabled, status, isProactivePromptActive]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer, inputText]);

  const handleToggleScreenShare = async () => {
    resetIdleTimer();
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setIsScreenSharing(true);
          setScreenShareNotice('Screen stream connected to MAYRA Vision');
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            setScreenShareNotice(null);
          };
        } else {
          setIsScreenSharing(true);
          setScreenShareNotice('Screen stream connected to MAYRA Vision');
        }
      } catch (err) {
        setIsScreenSharing(!isScreenSharing);
        setScreenShareNotice(isScreenSharing ? null : 'Screen stream connected');
      }
    } else {
      setIsScreenSharing(false);
      setScreenShareNotice(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetIdleTimer();
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
    resetIdleTimer();
    const promptToSend = attachedFile && !inputText.trim()
      ? `[Attached file: ${attachedFile.name} (${attachedFile.size})]`
      : inputText;
    console.log(`[HOME_TEXT_SUBMIT] Typed prompt submitted: "${promptToSend.trim()}"`);
    onSubmitPrompt(promptToSend);
    setAttachedFile(null);
  };

  const getAssistantMessage = () => {
    switch (status) {
      case 'SPEAKING':
        return 'Speaking response...';
      case 'THINKING':
        return 'Reasoning with Gemini Neural Engine...';
      case 'LISTENING':
        return 'Listening... speak now';
      case 'READY':
      default: {
        if (isProactivePromptActive) {
          const name = personalConfig.preferredName || personalConfig.fullName || 'Zafer';
          return `${name}, I'm right here if you need anything.`;
        }
        const name = personalConfig.preferredName || personalConfig.fullName || 'Zafer';
        return `Hi ${name}, what should we do today?`;
      }
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'LISTENING':
        return {
          label: 'LISTENING',
          badgeColor: 'text-cyan-300 bg-cyan-950/70 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]',
          dotColor: 'bg-cyan-400'
        };
      case 'THINKING':
        return {
          label: 'REASONING',
          badgeColor: 'text-amber-300 bg-amber-950/70 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
          dotColor: 'bg-amber-400'
        };
      case 'SPEAKING':
        return {
          label: 'SPEAKING',
          badgeColor: 'text-emerald-300 bg-emerald-950/70 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
          dotColor: 'bg-emerald-400'
        };
      case 'READY':
      default:
        return {
          label: 'ONLINE',
          badgeColor: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
          dotColor: 'bg-cyan-400'
        };
    }
  };

  const statusBadge = getStatusBadge();
  const userName = personalConfig.preferredName || personalConfig.fullName || 'Zafer';

  const quickPrompts = [
    'Analyze screen',
    'Summarize notes',
    'Draft an email',
    'Plan my schedule',
    'Explain a concept'
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#070914] text-slate-100 select-none">
      
      {/* 1. Dynamic Space Backdrop Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B18] via-[#050711] to-[#030408] pointer-events-none" />

      {/* 2. FULL-SCREEN MAYRA 3D CHARACTER LAYER */}
      <MayraAvatar
        status={status}
        scaleMultiplier={1.0}
        characterZoom={100}
        characterSkinTone={assistantConfig?.characterSkinTone ?? 50}
        transform={transform}
        lockState={lockState}
        modelMetadata={modelMetadata}
        isDragging={isDragging}
        onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
        onTriggerVoice={onTriggerVoice}
      />

      {/* 3. MINIMAL TOP FLOATING HEADER (Clean & Uncluttered) */}
      <div className="relative z-20 w-full px-3.5 pt-2 flex flex-col gap-1.5 pointer-events-auto">
        <header className="w-full flex items-center justify-between">
          {/* Left: MAYRA Branding & Online Status */}
          <div className="flex items-center gap-2 min-w-0">
            <MayraLogo size={24} showGlow={true} />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono font-black text-sm text-white tracking-wider truncate">
                MAYRA
              </span>
              <div className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold tracking-wider flex items-center gap-1 shrink-0 ${statusBadge.badgeColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor} animate-ping`} />
                <span>{statusBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Right: Sleek Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenWhiteboard && (
              <button
                onClick={onOpenWhiteboard}
                className="p-1.5 bg-white/[0.06] hover:bg-cyan-500/20 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 rounded-xl text-slate-300 hover:text-cyan-300 transition-all"
                title="Interactive Whiteboard Tool"
              >
                <PenTool className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleToggleScreenShare}
              className={`p-1.5 rounded-xl border backdrop-blur-xl transition-all ${
                isScreenSharing
                  ? 'bg-cyan-500/25 border-cyan-400/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isScreenSharing ? 'Disconnect Screen Share' : 'Connect Screen Stream'}
            >
              <ScreenShare className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleLock}
              className={`p-1.5 rounded-xl backdrop-blur-xl border transition-all ${
                lockState.isLocked
                  ? 'bg-amber-500/25 border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300 hover:text-white'
              }`}
              title={lockState.isLocked ? 'Character Locked' : 'Character Unlocked'}
            >
              {lockState.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
              title={`Settings (${userName})`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Minimal Subtle Top Greeting Text without heavy box */}
        <div className="w-full text-center py-0.5">
          <p className="text-xs font-medium text-slate-300/80 tracking-wide">
            Hi {userName}, what should we do today?
          </p>
        </div>
      </div>

      {/* Floating Notices */}
      {lockToast && (
        <div className="relative z-30 mx-auto mt-1 px-3.5 py-1 bg-[#080D20]/90 backdrop-blur-xl border border-amber-500/40 rounded-full text-[10px] font-mono text-amber-300 flex items-center gap-1.5 shadow-[0_4px_20px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>{lockToast}</span>
        </div>
      )}

      {screenShareNotice && (
        <div className="relative z-30 mx-auto mt-1 px-3 py-1 bg-slate-900/70 backdrop-blur-xl border border-cyan-400/30 rounded-full text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-[0_4px_20px_rgba(6,182,212,0.25)] animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{screenShareNotice}</span>
        </div>
      )}

      {/* 4. LOWER INTERACTION STAGE: Dynamic Prompts / Status & Sleek Input Bar */}
      <div className="relative z-20 w-full px-3.5 pb-2 flex flex-col items-center gap-2 pointer-events-auto">
        
        {/* Dynamic Status / Response Card: Shown when SPEAKING / THINKING / LISTENING */}
        {status !== 'READY' ? (
          <div className="w-full max-w-sm px-3.5 py-2 bg-[#0D1124]/85 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-xl transition-all flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full ${statusBadge.dotColor} animate-pulse shrink-0`} />
              <p className="text-xs text-slate-200 leading-relaxed font-sans truncate">
                {getAssistantMessage()}
              </p>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2 animate-spin" />
          </div>
        ) : (
          /* Repositioned Quick Prompt Chips: Aligned right above the input bar */
          <div className="w-full max-w-sm flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-none">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setInputText(prompt);
                }}
                className="px-3 py-1.5 bg-[#101528]/80 hover:bg-[#1A223E] border border-white/10 hover:border-cyan-400/50 rounded-full text-[11px] text-slate-300 hover:text-white whitespace-nowrap backdrop-blur-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Attached File Chip */}
        {attachedFile && (
          <div className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-xl text-[11px] font-mono text-cyan-300 shadow-md">
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

        {/* Sleek Bottom Chat Input Bar */}
        <form
          onSubmit={handleFormSubmit}
          className="w-full max-w-sm bg-[#101426]/90 backdrop-blur-2xl border border-white/15 focus-within:border-cyan-400/50 rounded-2xl flex items-center px-2 py-1.5 gap-1.5 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          <button
            type="button"
            onClick={() => setIsAttachmentSheetOpen(true)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.08] rounded-xl transition-all shrink-0"
            title="Attach photo, video, audio or document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask MAYRA..."
            className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-slate-400 font-sans min-w-0"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && !attachedFile}
            className="p-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-white transition-all shadow-md active:scale-95 shrink-0"
            title="Send prompt"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>

      {/* Attachment Action Sheet */}
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
