import React, { useState } from 'react';
import { 
  AssistantStatus, UserPersonalConfig, AssistantConfig, 
  VoiceGuardianConfig, AdvancedConfig, SkillItem, SubAgentItem, 
  IntegrationItem, MemoryItem, ChatMessage, SettingsSubScreen, ActiveTab,
  PermissionItem, AppearanceConfig, AgentTaskContext
} from '../types';
import { HomeScreen } from './screens/HomeScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { MemoriesScreen } from './screens/MemoriesScreen';
import { ChatScreen } from './screens/ChatScreen';
import { MayraSettingsScreen } from './settings/MayraSettingsScreen';
import { MayraLogo } from './common/MayraLogo';
import { VoiceControlOrb } from './voice/VoiceControlOrb';
import { useMayraWakeWord } from '../hooks/useMayraWakeWord';
import { FloatingMayraOverlay } from './overlay/FloatingMayraOverlay';
import { AgentTaskHUD } from './agent/AgentTaskHUD';
import { 
  Home, Camera, Brain, MessageSquare, 
  Settings as SettingsIcon, Shield,
  Trash2, Plus
} from 'lucide-react';
import { getThemePreset } from '../utils/themePresets';

interface AndroidPhoneFrameProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  currentSubScreen: SettingsSubScreen;
  setCurrentSubScreen: (screen: SettingsSubScreen) => void;
  status: AssistantStatus;
  isListeningMode?: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  onSubmitPrompt: (customText?: string, image?: { base64: string; mimeType?: string; name?: string; size?: string }) => void;
  onTriggerVoice: () => void;
  onSelectRoutineAction: (action: string) => void;
  onSendVisionQuery: (query: string, image?: { base64: string; mimeType?: string }) => void;
  onClearChat: () => void;
  // Agent V1 Props
  activeAgentTask?: AgentTaskContext | null;
  onApproveAgentAction?: () => void;
  onRejectAgentAction?: () => void;
  onCancelAgentTask?: () => void;
  // Configs
  personalConfig: UserPersonalConfig;
  setPersonalConfig: React.Dispatch<React.SetStateAction<UserPersonalConfig>>;
  assistantConfig: AssistantConfig;
  setAssistantConfig: React.Dispatch<React.SetStateAction<AssistantConfig>>;
  appearanceConfig: AppearanceConfig;
  setAppearanceConfig: React.Dispatch<React.SetStateAction<AppearanceConfig>>;
  voiceGuardianConfig: VoiceGuardianConfig;
  setVoiceGuardianConfig: React.Dispatch<React.SetStateAction<VoiceGuardianConfig>>;
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  permissions: PermissionItem[];
  setPermissions: React.Dispatch<React.SetStateAction<PermissionItem[]>>;
  skills: SkillItem[];
  setSkills: React.Dispatch<React.SetStateAction<SkillItem[]>>;
  subAgents: SubAgentItem[];
  setSubAgents: React.Dispatch<React.SetStateAction<SubAgentItem[]>>;
  integrations: IntegrationItem[];
  memories: MemoryItem[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({
  activeTab,
  setActiveTab,
  isSettingsOpen,
  setIsSettingsOpen,
  currentSubScreen,
  setCurrentSubScreen,
  status,
  isListeningMode = false,
  inputText,
  setInputText,
  onSubmitPrompt,
  onTriggerVoice,
  onSelectRoutineAction,
  onSendVisionQuery,
  onClearChat,
  activeAgentTask,
  onApproveAgentAction,
  onRejectAgentAction,
  onCancelAgentTask,
  personalConfig,
  setPersonalConfig,
  assistantConfig,
  setAssistantConfig,
  appearanceConfig,
  setAppearanceConfig,
  voiceGuardianConfig,
  setVoiceGuardianConfig,
  advancedConfig,
  setAdvancedConfig,
  permissions,
  setPermissions,
  skills,
  setSkills,
  subAgents,
  setSubAgents,
  integrations,
  memories,
  setMemories,
  messages,
  setMessages
}) => {
  const [isFloatingOverlayOpen, setIsFloatingOverlayOpen] = useState<boolean>(false);
  const [scanCaptureSignal, setScanCaptureSignal] = useState<number>(0);
  const [memoriesAddSignal, setMemoriesAddSignal] = useState<number>(0);

  const isDark = appearanceConfig?.darkMode ?? true;

  // Background Wake-Word activation ("Mayra", "Hey Mayra", "Mayra utho") & continuous listening
  const { isListeningForWakeWord } = useMayraWakeWord({
    status,
    isListeningMode,
    enabled: true,
    onSpeechCaptured: (text) => {
      setInputText(text);
      onSubmitPrompt(text);
    },
    onWakeWordDetected: (query) => {
      setIsFloatingOverlayOpen(true);
      if (query && query.length > 1) {
        setInputText(query);
        onSubmitPrompt(query);
      } else {
        onTriggerVoice();
      }
    }
  });

  const handleOpenPermissions = () => {
    setIsSettingsOpen(true);
    setCurrentSubScreen('permissions');
  };

  const handleCenterAction = () => {
    if (activeTab === 'scan') {
      // Trigger Vision Shutter
      setScanCaptureSignal(prev => prev + 1);
    } else if (activeTab === 'memories') {
      // Trigger Memories Add Context Menu
      setMemoriesAddSignal(prev => prev + 1);
    } else {
      // Trigger Voice Engine
      console.log('[MAYRA Pipeline] MIC_CLICK: Center Action Button pressed on tab:', activeTab);
      onTriggerVoice();
    }
  };

  const lastAssistantMessage = messages.filter(m => m.sender === 'mayra').slice(-1)[0]?.text;
  const currentTheme = getThemePreset(appearanceConfig.appTheme);

  return (
    <div 
      className={`w-full h-full flex flex-col relative overflow-hidden bg-[#070913] select-none ${
        appearanceConfig.auraBorderMode ? `ring-1 ring-inset ${currentTheme.activeBorder} ${currentTheme.glowShadow}` : ''
      }`}
      style={{
        '--theme-primary': currentTheme.primaryHex,
        '--theme-secondary': currentTheme.secondaryHex
      } as React.CSSProperties}
    >

      {/* Aura Border Pulse Effect */}
      {appearanceConfig.auraBorderMode && (
        <div className={`absolute inset-0 pointer-events-none z-50 border ${currentTheme.activeBorder} rounded-none shadow-[inset_0_0_24px_rgba(255,255,255,0.15)] animate-pulse`} />
      )}
      
      {/* Top Floating Quick Controls Bar (Visible on Memories and Chat screens) */}
      {!isSettingsOpen && (activeTab === 'memories' || activeTab === 'chat') && (
        <div className="h-11 px-3 bg-slate-950/65 backdrop-blur-2xl flex items-center justify-between border-b border-white/10 z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MayraLogo size={20} showGlow={false} iconVariant={appearanceConfig.launcherIconVariant} />
            <span className="font-sans font-extrabold text-xs text-white tracking-wide truncate">
              ★𝐌₳ᎽⱤ₳ ᥫ᭡
            </span>
            {appearanceConfig.voiceVisualizerEnabled && status === 'SPEAKING' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono text-cyan-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>VOICE</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Backup button ONLY on Memories and Chat screens */}
            {(activeTab === 'memories' || activeTab === 'chat') && (
              <button
                onClick={handleOpenPermissions}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl border border-white/15 rounded-xl text-[10px] font-mono text-cyan-300 transition-all whitespace-nowrap shadow-sm"
                title="Data Backup & Permissions"
              >
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Backup</span>
              </button>
            )}

            {/* If on Chat screen, place Delete / Trash icon right next to Settings */}
            {activeTab === 'chat' && (
              <button
                onClick={onClearChat}
                className="p-1.5 text-slate-300 hover:text-red-400 bg-white/[0.06] hover:bg-white/[0.14] rounded-xl border border-white/15 backdrop-blur-xl transition-all shrink-0"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setIsSettingsOpen(true);
                setCurrentSubScreen('root');
              }}
              className="p-1.5 text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded-xl border border-cyan-400/30 backdrop-blur-xl shadow-[0_0_10px_rgba(6,182,212,0.25)] transition-all shrink-0 group"
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-cyan-400 animate-[spin_10s_linear_infinite]" />
            </button>
          </div>
        </div>
      )}

      {/* Screen Body Viewport */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Settings Full View */}
        {isSettingsOpen && (
          <MayraSettingsScreen
            currentSubScreen={currentSubScreen}
            setCurrentSubScreen={setCurrentSubScreen}
            onCloseSettings={() => setIsSettingsOpen(false)}
            personalConfig={personalConfig}
            setPersonalConfig={setPersonalConfig}
            assistantConfig={assistantConfig}
            setAssistantConfig={setAssistantConfig}
            appearanceConfig={appearanceConfig}
            setAppearanceConfig={setAppearanceConfig}
            voiceGuardianConfig={voiceGuardianConfig}
            setVoiceGuardianConfig={setVoiceGuardianConfig}
            advancedConfig={advancedConfig}
            setAdvancedConfig={setAdvancedConfig}
            permissions={permissions}
            setPermissions={setPermissions}
            skills={skills}
            setSkills={setSkills}
            subAgents={subAgents}
            setSubAgents={setSubAgents}
            integrations={integrations}
            memories={memories}
            setMemories={setMemories}
            messages={messages}
            setMessages={setMessages}
          />
        )}

        {/* Tab 1: Home Screen (Character 3D Engine & Interactive Stage) */}
        <div className={`w-full h-full ${activeTab === 'home' && !isSettingsOpen ? 'block' : 'hidden'}`}>
          <HomeScreen
            status={status}
            personalConfig={personalConfig}
            assistantConfig={assistantConfig}
            appearanceConfig={appearanceConfig}
            permissions={permissions}
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            onSubmitPrompt={onSubmitPrompt}
            onTriggerVoice={onTriggerVoice}
            onSelectAction={onSelectRoutineAction}
            onOpenSettings={() => {
              setIsSettingsOpen(true);
              setCurrentSubScreen('root');
            }}
            onOpenPermissions={handleOpenPermissions}
            proactiveEnabled={(assistantConfig as any)?.proactiveSuggestions ?? true}
          />
        </div>

        {/* Tab 2: Vision Scanner (Full bleed with transformed shutter) */}
        <div className={`w-full h-full ${activeTab === 'scan' && !isSettingsOpen ? 'block' : 'hidden'}`}>
          <ScannerScreen 
            aspectRatio={appearanceConfig.cameraAspectRatio || '9:16'}
            onSendVisionQuery={(query, image) => {
              onSendVisionQuery(query, image);
              setActiveTab('chat');
            }}
            triggerCaptureSignal={scanCaptureSignal}
          />
        </div>

        {/* Tab 3: Memories Database Screen */}
        <div className={`w-full h-full ${activeTab === 'memories' && !isSettingsOpen ? 'block' : 'hidden'}`}>
          <MemoriesScreen
            memories={memories}
            triggerAddSignal={memoriesAddSignal}
            onAddMemory={(newMem) => {
              const createdItem: MemoryItem = {
                ...newMem,
                id: `mem-${Date.now()}`,
                timestamp: Date.now()
              };
              setMemories(prev => [createdItem, ...prev]);
            }}
            onDeleteMemory={(id) => {
              setMemories(prev => prev.filter(m => m.id !== id));
            }}
            onTogglePin={(id) => {
              setMemories(prev => prev.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
            }}
            onTriggerDirectMessage={(contactName, type) => {
              if (type === 'whatsapp') {
                setInputText(`Send a WhatsApp message to ${contactName}: `);
              } else {
                setInputText(`Call ${contactName} on phone`);
              }
              setActiveTab('chat');
            }}
          />
        </div>

        {/* Tab 4: Chat Stream */}
        <div className={`w-full h-full ${activeTab === 'chat' && !isSettingsOpen ? 'block' : 'hidden'}`}>
          <ChatScreen
            messages={messages}
            status={status}
            inputText={inputText}
            setInputText={setInputText}
            onSubmitPrompt={onSubmitPrompt}
            onTriggerVoice={onTriggerVoice}
            onClearChat={onClearChat}
            onOpenVisionScanner={() => setActiveTab('scan')}
          />
        </div>
      </div>

      {/* Android Bottom Navigation Bar (Equal 5-column grid with icon-only minimalist tabs) */}
      {!isSettingsOpen && (
        <div className={`h-16 border-t px-1 z-20 shrink-0 grid grid-cols-5 items-center transition-colors duration-200 ${
          isDark 
            ? 'bg-slate-950/70 backdrop-blur-2xl border-white/10 text-slate-400' 
            : 'bg-white/95 backdrop-blur-2xl border-slate-200 text-slate-600 shadow-lg'
        }`}>
          
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab('home')}
            aria-label="Home"
            title="Home"
            className={`flex items-center justify-center w-full min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none transition-all active:scale-95 ${
              activeTab === 'home' 
                ? isDark 
                  ? currentTheme.activeText 
                  : currentTheme.activeText
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home 
              className="w-5 h-5 shrink-0" 
              style={activeTab === 'home' && isDark ? { filter: `drop-shadow(0 0 6px ${currentTheme.primaryHex})` } : undefined}
            />
          </button>

          {/* Tab 2: Scan */}
          <button
            onClick={() => setActiveTab('scan')}
            aria-label="Scan"
            title="Scan"
            className={`flex items-center justify-center w-full min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none transition-all active:scale-95 ${
              activeTab === 'scan' 
                ? isDark 
                  ? currentTheme.activeText 
                  : currentTheme.activeText
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera 
              className="w-5 h-5 shrink-0" 
              style={activeTab === 'scan' && isDark ? { filter: `drop-shadow(0 0 6px ${currentTheme.primaryHex})` } : undefined}
            />
          </button>

          {/* Tab 3: Center Large Dynamic Action Button (Transforms to Shutter on Scan tab, Plus on Memories tab, Voice Orb otherwise) */}
          <div className="flex flex-col items-center justify-center w-full min-w-0 -mt-2">
            <button
              onClick={handleCenterAction}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 overflow-hidden relative ${
                activeTab === 'scan'
                  ? `bg-gradient-to-tr ${currentTheme.buttonGradient} text-white ${currentTheme.glowShadow} border-2 border-white`
                  : activeTab === 'memories'
                  ? 'bg-gradient-to-tr from-purple-500 via-indigo-600 to-cyan-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.6)] border-2 border-white/90'
                  : isListeningMode || status === 'LISTENING'
                  ? 'bg-[#050e1f] text-white shadow-[0_0_24px_rgba(6,182,212,0.9)] border-2 border-cyan-400'
                  : status === 'SPEAKING'
                  ? 'bg-[#070e24] text-white shadow-[0_0_24px_rgba(56,189,248,0.85)] border-2 border-sky-400'
                  : status === 'THINKING'
                  ? 'bg-[#140b22] text-white shadow-[0_0_22px_rgba(245,158,11,0.75)] border-2 border-amber-400'
                  : isDark
                  ? `bg-[#060b19] hover:bg-[#0a1226] text-slate-200 hover:text-white border-2 ${currentTheme.activeBorder} shadow-[0_4px_16px_rgba(0,0,0,0.6)]`
                  : `bg-slate-900 hover:bg-slate-800 text-white border-2 ${currentTheme.activeBorder} shadow-lg`
              }`}
              title={
                activeTab === 'scan'
                  ? 'Tap to Capture and Analyze'
                  : activeTab === 'memories'
                  ? 'Add Memory or Family Contact'
                  : isListeningMode || status === 'LISTENING'
                  ? 'Listening... Tap to stop'
                  : status === 'SPEAKING'
                  ? 'Mayra Speaking... Tap to interrupt'
                  : 'Tap to speak'
              }
            >
              {activeTab === 'scan' ? (
                <Camera className="w-6 h-6 stroke-[2.2] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              ) : activeTab === 'memories' ? (
                <Plus className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <VoiceControlOrb
                  status={status}
                  isListeningMode={isListeningMode}
                  appearanceConfig={appearanceConfig}
                  size={48}
                />
              )}
            </button>
          </div>

          {/* Tab 4: Memories */}
          <button
            onClick={() => setActiveTab('memories')}
            aria-label="Memories"
            title="Memories"
            className={`flex items-center justify-center w-full min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none transition-all active:scale-95 ${
              activeTab === 'memories' 
                ? isDark 
                  ? 'text-purple-400' 
                  : 'text-purple-600'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Brain 
              className="w-5 h-5 shrink-0" 
              style={activeTab === 'memories' && isDark ? { filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' } : undefined}
            />
          </button>

          {/* Tab 5: Chat */}
          <button
            onClick={() => setActiveTab('chat')}
            aria-label="Chat"
            title="Chat"
            className={`flex items-center justify-center w-full min-w-0 h-full bg-transparent border-0 outline-none focus:outline-none transition-all active:scale-95 ${
              activeTab === 'chat' 
                ? isDark 
                  ? currentTheme.activeText 
                  : currentTheme.activeText
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare 
              className="w-5 h-5 shrink-0" 
              style={activeTab === 'chat' && isDark ? { filter: `drop-shadow(0 0 6px ${currentTheme.primaryHex})` } : undefined}
            />
          </button>
        </div>
      )}

      {/* Android Gesture Bar */}
      <div className={`h-4 flex items-center justify-center shrink-0 transition-colors ${
        isDark ? 'bg-[#070913]' : 'bg-slate-100'
      }`}>
        <div className={`w-28 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-400'}`}></div>
      </div>

      {/* Agent V1 Task HUD & Permission Gate Approval UI */}
      <AgentTaskHUD
        taskContext={activeAgentTask || null}
        onApprove={onApproveAgentAction || (() => {})}
        onReject={onRejectAgentAction || (() => {})}
        onCancel={onCancelAgentTask || (() => {})}
      />

      {/* iOS Magnifying Glass / Glassmorphism Floating Assistant Overlay */}
      <FloatingMayraOverlay
        isOpen={isFloatingOverlayOpen}
        onClose={() => setIsFloatingOverlayOpen(false)}
        status={status}
        inputText={inputText}
        setInputText={setInputText}
        onSubmitPrompt={onSubmitPrompt}
        onTriggerVoice={onTriggerVoice}
        onSelectAction={onSelectRoutineAction}
        lastResponse={lastAssistantMessage}
        appearanceConfig={appearanceConfig}
      />

    </div>
  );
};
