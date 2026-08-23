import React, { useState } from 'react';
import { 
  SettingsSubScreen, UserPersonalConfig, AssistantConfig, 
  VoiceGuardianConfig, AdvancedConfig, SkillItem, SubAgentItem, 
  IntegrationItem, MemoryItem, ChatMessage, CountryCodeItem,
  PermissionItem
} from '../../types';
import { PersonalSettingsView } from './PersonalSettingsView';
import { CountryCodeView } from './CountryCodeView';
import { AssistantSettingsView } from './AssistantSettingsView';
import { VoiceGuardianView } from './VoiceGuardianView';
import { SkillsView } from './SkillsView';
import { SubAgentsView } from './SubAgentsView';
import { BackupView } from './BackupView';
import { AdvancedSettingsView } from './AdvancedSettingsView';
import { OptionalIntegrationsView } from './OptionalIntegrationsView';
import { PrivacyView } from './PrivacyView';
import { AboutView } from './AboutView';
import { PermissionsCenterView } from './PermissionsCenterView';
import { LinkedDevicesView } from './LinkedDevicesView';
import { OfflineModelsView } from './OfflineModelsView';
import { WhiteboardTool } from '../tools/WhiteboardTool';
import { MayraLogo } from '../common/MayraLogo';
import { 
  Settings as SettingsIcon, User, Globe, Sparkles, 
  Wrench, Bot, ShieldCheck, Database, Cpu, 
  Boxes, Lock, Info, ChevronRight, ArrowLeft, Search, X,
  Shield, CheckCircle2, Smartphone, PenTool, HardDrive
} from 'lucide-react';

interface MayraSettingsScreenProps {
  currentSubScreen: SettingsSubScreen;
  setCurrentSubScreen: (screen: SettingsSubScreen) => void;
  onCloseSettings: () => void;
  // State bindings
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

export const MayraSettingsScreen: React.FC<MayraSettingsScreenProps> = ({
  currentSubScreen,
  setCurrentSubScreen,
  onCloseSettings,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Handle toggles
  const handleToggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleToggleAgent = (id: string) => {
    setSubAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleSelectCountry = (country: CountryCodeItem) => {
    setPersonalConfig(prev => ({
      ...prev,
      countryDialCode: country.dialCode,
      countryName: country.name
    }));
  };

  const handleClearAllData = () => {
    setMemories([]);
    setMessages([]);
  };

  const handleRestoreData = (restored: MemoryItem[]) => {
    setMemories(restored);
  };

  // Sub-screen routing
  if (currentSubScreen === 'permissions') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PermissionsCenterView
          permissions={permissions}
          setPermissions={setPermissions}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'personal') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PersonalSettingsView
          config={personalConfig}
          onChange={(updated) => setPersonalConfig(prev => ({ ...prev, ...updated }))}
          onOpenCountryPicker={() => setCurrentSubScreen('country_code')}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'country_code') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <CountryCodeView
          selectedDialCode={personalConfig.countryDialCode}
          onSelectCountry={handleSelectCountry}
          onBack={() => setCurrentSubScreen('personal')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'assistant') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AssistantSettingsView
          config={assistantConfig}
          onChange={(updated) => setAssistantConfig(prev => ({ ...prev, ...updated }))}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'voice_guardian') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <VoiceGuardianView
          config={voiceGuardianConfig}
          onChange={(updated) => setVoiceGuardianConfig(prev => ({ ...prev, ...updated }))}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'skills') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <SkillsView
          skills={skills}
          onToggleSkill={handleToggleSkill}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'sub_agents') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <SubAgentsView
          subAgents={subAgents}
          onToggleAgent={handleToggleAgent}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'backup') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <BackupView
          memories={memories}
          messages={messages}
          onClearAllData={handleClearAllData}
          onRestoreData={handleRestoreData}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'advanced') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AdvancedSettingsView
          config={advancedConfig}
          onChange={(updated) => setAdvancedConfig(prev => ({ ...prev, ...updated }))}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'optional_integrations') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <OptionalIntegrationsView
          integrations={integrations}
          onBack={() => setCurrentSubScreen('root')}
        />
      </div>
    );
  }

  if (currentSubScreen === 'privacy') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PrivacyView onBack={() => setCurrentSubScreen('root')} />
      </div>
    );
  }

  if (currentSubScreen === 'linked_devices') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <LinkedDevicesView onBack={() => setCurrentSubScreen('root')} />
      </div>
    );
  }

  if (currentSubScreen === 'offline_models') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <OfflineModelsView onBack={() => setCurrentSubScreen('root')} />
      </div>
    );
  }

  if (currentSubScreen === 'whiteboard') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <WhiteboardTool 
          onClose={() => setCurrentSubScreen('root')} 
          onSendToChat={(text) => {
            setMessages(prev => [
              ...prev,
              { id: `msg-${Date.now()}`, sender: 'user', role: 'user', text, timestamp: Date.now() }
            ]);
            setCurrentSubScreen('root');
            onCloseSettings();
          }}
        />
      </div>
    );
  }

  if (currentSubScreen === 'about') {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AboutView onBack={() => setCurrentSubScreen('root')} />
      </div>
    );
  }

interface SettingCategoryItem {
  id: SettingsSubScreen;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SettingCategorySection {
  category: string;
  items: SettingCategoryItem[];
}

  const grantedPermissionsCount = permissions.filter(p => p.status === 'granted' || p.id === 'default_assistant').length;

  const settingSections: SettingCategorySection[] = [
    {
      category: 'PERMISSIONS & SYSTEM ACCESS',
      items: [
        {
          id: 'permissions' as SettingsSubScreen,
          title: 'Permissions Center',
          subtitle: `${grantedPermissionsCount} of ${permissions.length} active • Assistant, Screen, Mic, Overlay`,
          badge: `${grantedPermissionsCount}/${permissions.length}`,
          icon: <Shield className="w-4 h-4 text-emerald-400" />
        }
      ]
    },
    {
      category: 'ACCOUNT',
      items: [
        {
          id: 'personal' as SettingsSubScreen,
          title: 'Personal',
          subtitle: `${personalConfig.preferredName || personalConfig.fullName} • API configuration`,
          icon: <User className="w-4 h-4 text-blue-400" />
        },
        {
          id: 'country_code' as SettingsSubScreen,
          title: 'Country Code',
          subtitle: `${personalConfig.countryName} (${personalConfig.countryDialCode})`,
          icon: <Globe className="w-4 h-4 text-cyan-400" />
        }
      ]
    },
    {
      category: 'ASSISTANT',
      items: [
        {
          id: 'assistant' as SettingsSubScreen,
          title: 'MAYRA',
          subtitle: `${assistantConfig.personaTone.toUpperCase()} • ${assistantConfig.language}`,
          icon: <Sparkles className="w-4 h-4 text-purple-400" />
        },
        {
          id: 'offline_models' as SettingsSubScreen,
          title: 'Offline AI Models',
          subtitle: 'llama.cpp GGUF • SmolLM2 & Qwen local inference',
          badge: 'GGUF',
          icon: <HardDrive className="w-4 h-4 text-emerald-400" />
        },
        {
          id: 'skills' as SettingsSubScreen,
          title: 'Skills',
          subtitle: `${skills.filter(s => s.enabled).length} of ${skills.length} active`,
          icon: <Wrench className="w-4 h-4 text-emerald-400" />
        },
        {
          id: 'sub_agents' as SettingsSubScreen,
          title: 'Sub-agents',
          subtitle: `${subAgents.filter(a => a.enabled).length} active agents`,
          icon: <Bot className="w-4 h-4 text-indigo-400" />
        }
      ]
    },
    {
      category: 'VOICE GUARDIAN',
      items: [
        {
          id: 'voice_guardian' as SettingsSubScreen,
          title: 'Voice Guardian',
          subtitle: voiceGuardianConfig.enabled ? 'ACTIVE • Owner Only' : 'DISABLED',
          badge: voiceGuardianConfig.enabled ? 'SHIELD ON' : 'OFF',
          icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />
        }
      ]
    },
    {
      category: 'MULTI-DEVICE & CREATIVE TOOLS',
      items: [
        {
          id: 'linked_devices' as SettingsSubScreen,
          title: 'Linked Devices & Sync',
          subtitle: '4 connected • Pixel Watch, Tablet, MacBook relay',
          badge: 'MESH ON',
          icon: <Smartphone className="w-4 h-4 text-cyan-400" />
        },
        {
          id: 'whiteboard' as SettingsSubScreen,
          title: 'Interactive Whiteboard',
          subtitle: 'Canvas drawing, wireframing & Vision AI analysis',
          badge: 'NEW',
          icon: <PenTool className="w-4 h-4 text-purple-400" />
        }
      ]
    },
    {
      category: 'MEMORY & DATA',
      items: [
        {
          id: 'backup' as SettingsSubScreen,
          title: 'Backup & Storage',
          subtitle: `${memories.length} memories • Export / Reset`,
          icon: <Database className="w-4 h-4 text-blue-400" />
        }
      ]
    },
    {
      category: 'SYSTEM & INTEGRATIONS',
      items: [
        {
          id: 'advanced' as SettingsSubScreen,
          title: 'Advanced Settings',
          subtitle: 'Safety filters • Debug logs • Background tasks',
          icon: <Cpu className="w-4 h-4 text-slate-400" />
        },
        {
          id: 'optional_integrations' as SettingsSubScreen,
          title: 'Optional Integrations',
          subtitle: `${integrations.filter(i => i.status === 'configured').length} configured • Workspace, Maps, IoT`,
          icon: <Boxes className="w-4 h-4 text-amber-400" />
        },
        {
          id: 'privacy' as SettingsSubScreen,
          title: 'Privacy & Security',
          subtitle: 'Zero data sales • On-device biometric shield',
          icon: <Lock className="w-4 h-4 text-rose-400" />
        },
        {
          id: 'about' as SettingsSubScreen,
          title: 'About MAYRA',
          subtitle: 'v2.4.0 • Android Jetpack Compose Architecture',
          icon: <Info className="w-4 h-4 text-slate-400" />
        }
      ]
    }
  ];

  const filteredSections = settingSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070914] text-slate-100 relative select-none">
      
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#080B1C] border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onCloseSettings}
            className="p-2 -ml-1 text-slate-400 hover:text-white rounded-full hover:bg-white/5 active:scale-95 transition-all"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-sans text-white tracking-tight">
              Settings
            </h1>
          </div>
        </div>

        {/* MAYRA Logo Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-full">
          <MayraLogo size={18} showGlow={false} />
          <span className="text-[10px] font-mono font-bold text-white tracking-wider">
            MAYRA
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3 bg-[#080B1C]/50 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#0D1124] border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Settings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {filteredSections.map((section) => (
          <div key={section.category} className="space-y-1">
            <h3 className="text-[9px] font-mono font-bold text-blue-400/80 tracking-widest px-2 uppercase">
              {section.category}
            </h3>

            <div className="bg-[#0C1021] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentSubScreen(item.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500/10 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors font-sans">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            item.badge.includes('OFF') || item.badge.includes('0/') 
                              ? 'bg-slate-800 text-slate-400' 
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
