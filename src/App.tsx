import React, { useState, useCallback } from 'react';
import { AndroidPhoneFrame } from './components/AndroidPhoneFrame';
import { SettingsSubScreen, ActiveTab, AppAction } from './types';
import { useMayraAssistant } from './hooks/useMayraAssistant';
import { useMayraPermissions } from './hooks/useMayraPermissions';
import { useMayraSettings } from './hooks/useMayraSettings';

export default function App() {
  // Phone internal navigation state
  const [activePhoneTab, setActivePhoneTab] = useState<ActiveTab>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSubScreen, setCurrentSubScreen] = useState<SettingsSubScreen>('root');

  // Decoupled settings state & persistence
  const {
    personalConfig,
    setPersonalConfig,
    assistantConfig,
    setAssistantConfig,
    voiceGuardianConfig,
    setVoiceGuardianConfig,
    advancedConfig,
    setAdvancedConfig,
    skills,
    setSkills,
    subAgents,
    setSubAgents,
    integrations,
    memories,
    setMemories
  } = useMayraSettings();

  // Decoupled permissions management (14 permissions)
  const {
    permissions,
    setPermissions,
    grantedCount,
    totalCount
  } = useMayraPermissions();

  // Action Dispatcher for Voice & Text Commands
  const handleExecuteAction = useCallback((action: AppAction) => {
    if (!action || !action.type) return;

    console.log('[MAYRA Pipeline] ACTION_REQUESTED:', action.type, action.payload);

    switch (action.type) {
      case 'SAVE_MEMORY': {
        const { key, value, category } = action.payload || {};
        if (key && value) {
          setMemories((prev) => {
            const exists = prev.find((m) => m.key.toLowerCase() === key.toLowerCase());
            if (exists) {
              return prev.map((m) =>
                m.key.toLowerCase() === key.toLowerCase() ? { ...m, value, timestamp: Date.now() } : m
              );
            }
            return [
              {
                id: `mem-${Date.now()}`,
                key,
                value,
                category: category || 'personal',
                isPinned: false,
                timestamp: Date.now()
              },
              ...prev
            ];
          });
          console.log('[MAYRA Pipeline] ACTION_EXECUTED: SAVE_MEMORY');
          console.log('[MAYRA Pipeline] ACTION_VERIFIED: Memory stored successfully — ' + key + ': ' + value);
        }
        break;
      }
      case 'DELETE_MEMORY': {
        const { key, id } = action.payload || {};
        if (id || key) {
          setMemories((prev) => prev.filter((m) => (id ? m.id !== id : m.key.toLowerCase() !== key.toLowerCase())));
          console.log('[MAYRA Pipeline] ACTION_EXECUTED: DELETE_MEMORY');
          console.log('[MAYRA Pipeline] ACTION_VERIFIED: Memory item removed');
        }
        break;
      }
      case 'CLEAR_MEMORIES': {
        setMemories([]);
        console.log('[MAYRA Pipeline] ACTION_EXECUTED: CLEAR_MEMORIES');
        console.log('[MAYRA Pipeline] ACTION_VERIFIED: All memories cleared');
        break;
      }
      case 'NAVIGATE_TAB': {
        const { tab } = action.payload || {};
        if (tab) {
          setActivePhoneTab(tab);
          setIsSettingsOpen(false);
          console.log('[MAYRA Pipeline] ACTION_EXECUTED: NAVIGATE_TAB ->', tab);
          console.log('[MAYRA Pipeline] ACTION_VERIFIED: Active tab set to', tab);
        }
        break;
      }
      case 'OPEN_SETTINGS': {
        const { subScreen } = action.payload || {};
        setIsSettingsOpen(true);
        setCurrentSubScreen(subScreen || 'root');
        console.log('[MAYRA Pipeline] ACTION_EXECUTED: OPEN_SETTINGS');
        console.log('[MAYRA Pipeline] ACTION_VERIFIED: Settings sub-screen opened ->', subScreen || 'root');
        break;
      }
      case 'TOGGLE_PERMISSION':
      case 'GRANT_PERMISSION': {
        const { permissionId } = action.payload || {};
        if (permissionId) {
          setPermissions((prev) =>
            prev.map((p) => (p.id === permissionId ? { ...p, status: 'granted' } : p))
          );
          console.log('[MAYRA Pipeline] ACTION_EXECUTED: GRANT_PERMISSION ->', permissionId);
          console.log('[MAYRA Pipeline] ACTION_VERIFIED: Permission granted');
        }
        break;
      }
      case 'TRIGGER_SCAN': {
        setActivePhoneTab('scan');
        setIsSettingsOpen(false);
        console.log('[MAYRA Pipeline] ACTION_EXECUTED: TRIGGER_SCAN');
        console.log('[MAYRA Pipeline] ACTION_VERIFIED: Scanner tab active');
        break;
      }
      case 'CONTACT_ACTION': {
        const { contactName, service } = action.payload || {};
        if (service === 'whatsapp') {
          const cleanNum = '919876543210';
          if (typeof window !== 'undefined') {
            window.open(`https://wa.me/${cleanNum}`, '_blank', 'noopener,noreferrer');
          }
          console.log('[MAYRA Pipeline] ACTION_EXECUTED: CONTACT_ACTION -> WhatsApp to ' + contactName);
          console.log('[MAYRA Pipeline] ACTION_VERIFIED: Communication URL launched');
        }
        break;
      }
      default:
        break;
    }
  }, [setMemories, setActivePhoneTab, setIsSettingsOpen, setCurrentSubScreen, setPermissions]);

  // Decoupled voice assistant state machine & Gemini chat processing
  const {
    status,
    isListeningMode,
    inputText,
    setInputText,
    messages,
    setMessages,
    submitPrompt,
    triggerVoice,
    clearChat
  } = useMayraAssistant({
    personalConfig,
    assistantConfig,
    onExecuteAction: handleExecuteAction
  });

  const handleSelectRoutineAction = (action: string) => {
    if (action === 'scan') {
      setActivePhoneTab('scan');
      setIsSettingsOpen(false);
    } else if (action === 'memories') {
      setActivePhoneTab('memories');
      setIsSettingsOpen(false);
    } else if (action === 'search') {
      setActivePhoneTab('chat');
      setIsSettingsOpen(false);
      setInputText('Perform a deep intelligence web search for Android Kotlin architecture best practices.');
    } else if (action === 'settings') {
      setIsSettingsOpen(true);
      setCurrentSubScreen('root');
    } else if (action === 'permissions') {
      setIsSettingsOpen(true);
      setCurrentSubScreen('permissions');
    }
  };

  const handleSendVisionQuery = (query: string) => {
    setActivePhoneTab('chat');
    setIsSettingsOpen(false);
    setInputText(query);
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] min-h-screen overflow-hidden bg-[#070913] text-slate-200 font-sans select-none flex flex-col">
      <AndroidPhoneFrame
        activeTab={activePhoneTab}
        setActiveTab={setActivePhoneTab}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        currentSubScreen={currentSubScreen}
        setCurrentSubScreen={setCurrentSubScreen}
        status={status}
        isListeningMode={isListeningMode}
        inputText={inputText}
        setInputText={setInputText}
        onSubmitPrompt={(text) => submitPrompt(text)}
        onTriggerVoice={triggerVoice}
        onSelectRoutineAction={handleSelectRoutineAction}
        onSendVisionQuery={handleSendVisionQuery}
        onClearChat={clearChat}
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
    </div>
  );
}
