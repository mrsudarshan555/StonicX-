import React, { useState } from 'react';
import { 
  AssistantStatus, UserPersonalConfig, AssistantConfig, 
  VoiceGuardianConfig, AdvancedConfig, SkillItem, SubAgentItem, 
  IntegrationItem, MemoryItem, ChatMessage, SettingsSubScreen, ActiveTab,
  PermissionItem
} from '../types';
import { HomeScreen } from './screens/HomeScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { MemoriesScreen } from './screens/MemoriesScreen';
import { ChatScreen } from './screens/ChatScreen';
import { MayraSettingsScreen } from './settings/MayraSettingsScreen';
import { MayraLogo } from './common/MayraLogo';
import { useMayraWakeWord } from '../hooks/useMayraWakeWord';
import { FloatingMayraOverlay } from './overlay/FloatingMayraOverlay';
import { 
  Home, Camera, Brain, MessageSquare, 
  Settings as SettingsIcon, Mic, Shield,
  Trash2, Aperture, Plus
} from 'lucide-react';

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
  onSubmitPrompt: (customText?: string) => void;
  onTriggerVoice: () => void;
  onSelectRoutineAction: (action: string) => void;
  onSendVisionQuery: (query: string) => void;
  onClearChat: () => void;
  // Configs
  personalConfig: UserPersonalConfig;
  setPersonalConfig: React.Dispatch<React.SetStateAction<UserPersonalConfig>>;
  assistantConfig: AssistantConfig;
  setAssistantConfig: React.Dispatch<React.SetStateAction<AssistantConfig>>;
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
  personalConfig,
  setPersonalConfig,
  assistantConfig,
  setAssistantConfig,
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

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#070913] select-none">
      
      {/* Top Floating Quick Controls Bar (Visible on Memories and Chat screens) */}
      {!isSettingsOpen && (activeTab === 'memories' || activeTab === 'chat') && (
        <div className="h-11 px-3 bg-slate-950/65 backdrop-blur-2xl flex items-center justify-between border-b border-white/10 z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MayraLogo size={20} showGlow={false} />
            <span className="font-mono font-black text-xs text-white tracking-wider truncate">
              MAYRA
            </span>
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
              className="p-1.5 text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.14] rounded-xl border border-white/15 backdrop-blur-xl transition-all shrink-0"
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
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
            permissions={permissions}
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
            onSendVisionQuery={(query) => {
              onSendVisionQuery(query);
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
          />
        </div>
      </div>

      {/* Android Bottom Navigation Bar (Equal 5-column grid with transformed center action) */}
      {!isSettingsOpen && (
        <div className="h-16 bg-slate-950/70 backdrop-blur-2xl border-t border-white/10 px-1 z-20 shrink-0 grid grid-cols-5 items-center">
          
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-0.5 w-full min-w-0 py-1 transition-all ${
              activeTab === 'home' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono truncate max-w-full text-center block">Home</span>
          </button>

          {/* Tab 2: Scan */}
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center gap-0.5 w-full min-w-0 py-1 transition-all ${
              activeTab === 'scan' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono truncate max-w-full text-center block">Scan</span>
          </button>

          {/* Tab 3: Center Large Dynamic Action Button (Transforms to Shutter on Scan tab, Plus on Memories tab, Mic otherwise) */}
          <div className="flex flex-col items-center justify-center w-full min-w-0">
            <button
              onClick={handleCenterAction}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                activeTab === 'scan'
                  ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(6,182,212,0.6)] border-2 border-white'
                  : activeTab === 'memories'
                  ? 'bg-gradient-to-tr from-purple-500 via-indigo-600 to-cyan-500 text-white shadow-[0_0_18px_rgba(168,85,247,0.6)] border-2 border-white/90'
                  : isListeningMode || status === 'LISTENING'
                  ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 text-white shadow-[0_0_22px_rgba(6,182,212,0.85)] border-2 border-cyan-300 animate-pulse'
                  : 'bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 hover:text-white border-2 border-white/25 hover:border-white/45 shadow-md'
              }`}
              title={
                activeTab === 'scan'
                  ? 'Tap to Capture and Analyze'
                  : activeTab === 'memories'
                  ? 'Add Memory or Family Contact'
                  : isListeningMode || status === 'LISTENING'
                  ? 'Listening... Tap to stop'
                  : 'Tap to speak'
              }
            >
              {activeTab === 'scan' ? (
                <Aperture className="w-6 h-6 stroke-[2] animate-spin-slow" />
              ) : activeTab === 'memories' ? (
                <Plus className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Mic className={`w-6 h-6 stroke-[2] ${isListeningMode || status === 'LISTENING' ? 'fill-white/30 text-white' : 'fill-none text-slate-200'}`} />
              )}
            </button>
          </div>

          {/* Tab 4: Memories */}
          <button
            onClick={() => setActiveTab('memories')}
            className={`flex flex-col items-center justify-center gap-0.5 w-full min-w-0 py-1 transition-all ${
              activeTab === 'memories' ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono truncate max-w-full text-center block">Memories</span>
          </button>

          {/* Tab 5: Chat */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center gap-0.5 w-full min-w-0 py-1 transition-all ${
              activeTab === 'chat' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono truncate max-w-full text-center block">Chat</span>
          </button>
        </div>
      )}

      {/* Android Gesture Bar */}
      <div className="h-4 bg-[#070913] flex items-center justify-center shrink-0">
        <div className="w-28 h-1 bg-white/20 rounded-full"></div>
      </div>

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
      />

    </div>
  );
};
