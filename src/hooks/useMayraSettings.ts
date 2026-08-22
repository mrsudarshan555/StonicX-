import { useState, useCallback } from 'react';
import { 
  UserPersonalConfig, AssistantConfig, VoiceGuardianConfig, 
  AdvancedConfig, SkillItem, SubAgentItem, IntegrationItem, 
  MemoryItem 
} from '../types';
import { 
  INITIAL_SKILLS, INITIAL_SUB_AGENTS, INITIAL_ENROLLED_VOICES, 
  INITIAL_INTEGRATIONS, INITIAL_MEMORIES 
} from '../data/defaultData';

const CHARACTER_SIZE_STORAGE_KEY = 'mayra_character_size';
const CHARACTER_ZOOM_STORAGE_KEY = 'mayra_character_zoom';
const CHARACTER_SKIN_TONE_STORAGE_KEY = 'mayra_character_skin_tone';

function getInitialCharacterSize(): 'small' | 'medium' | 'large' {
  if (typeof window === 'undefined') return 'medium';
  try {
    const saved = localStorage.getItem(CHARACTER_SIZE_STORAGE_KEY);
    if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
  } catch (e) {
    // Ignore storage errors
  }
  return 'medium';
}

function getInitialCharacterZoom(): number {
  if (typeof window === 'undefined') return 100;
  try {
    const saved = localStorage.getItem(CHARACTER_ZOOM_STORAGE_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 70 && num <= 140) return num;
    }
  } catch (e) {}
  return 100; // Default Medium (100%)
}

function getInitialCharacterSkinTone(): number {
  if (typeof window === 'undefined') return 50;
  try {
    const saved = localStorage.getItem(CHARACTER_SKIN_TONE_STORAGE_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) return num;
    }
  } catch (e) {}
  return 50; // Default Medium (Natural Fair/Medium)
}

export function useMayraSettings() {
  const [personalConfig, setPersonalConfig] = useState<UserPersonalConfig>({
    fullName: '',
    preferredName: '',
    email: '',
    countryDialCode: '+91',
    countryName: 'India',
    greetingStyle: 'warm',
    geminiApiKey: '',
    geminiModel: 'gemini-3.1-flash-lite',
    temperature: 0.7
  });

  const [assistantConfig, setAssistantConfigState] = useState<AssistantConfig>(() => ({
    personaTone: 'executive',
    voiceProfile: 'Mayra Violet (Neural)',
    language: 'en-IN',
    speechRate: 1.0,
    speechPitch: 1.0,
    responseStyle: 'instant',
    hapticFeedback: true,
    audioChimes: true,
    autoReadback: false,
    contextWindowSize: 20,
    voiceAlertCalls: true,
    voiceAlertMessages: true,
    voiceAlertAutoPrompt: true,
    proactiveIdleCheckin: false,
    characterSize: getInitialCharacterSize(),
    characterScaleMultiplier: getInitialCharacterSize() === 'small' ? 0.85 : getInitialCharacterSize() === 'large' ? 1.18 : 1.0,
    characterZoom: getInitialCharacterZoom(),
    characterSkinTone: getInitialCharacterSkinTone()
  }));

  const setAssistantConfig = useCallback((update: React.SetStateAction<AssistantConfig> | Partial<AssistantConfig>) => {
    setAssistantConfigState((prev) => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      if (next.characterSize && next.characterSize !== prev.characterSize) {
        try {
          localStorage.setItem(CHARACTER_SIZE_STORAGE_KEY, next.characterSize);
        } catch (e) {}
        next.characterScaleMultiplier = next.characterSize === 'small' ? 0.85 : next.characterSize === 'large' ? 1.18 : 1.0;
      }
      if (next.characterZoom !== undefined && next.characterZoom !== prev.characterZoom) {
        try {
          localStorage.setItem(CHARACTER_ZOOM_STORAGE_KEY, String(next.characterZoom));
        } catch (e) {}
      }
      if (next.characterSkinTone !== undefined && next.characterSkinTone !== prev.characterSkinTone) {
        try {
          localStorage.setItem(CHARACTER_SKIN_TONE_STORAGE_KEY, String(next.characterSkinTone));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const [voiceGuardianConfig, setVoiceGuardianConfig] = useState<VoiceGuardianConfig>({
    enabled: true,
    awayGuardMode: false,
    listenMode: 'owner_only',
    strictness: 85,
    enrolledVoices: INITIAL_ENROLLED_VOICES,
    ambientCalibration: true
  });

  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    safetyLevel: 'standard',
    permissionMicrophone: true,
    permissionCamera: true,
    permissionNotifications: true,
    permissionOverlay: true,
    permissionAccessibility: false,
    backgroundServiceEnabled: true,
    batteryOptimizationExempt: true,
    developerDebugMode: false,
    verboseLogging: false
  });

  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [subAgents, setSubAgents] = useState<SubAgentItem[]>(INITIAL_SUB_AGENTS);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);

  const addMemory = useCallback((newMemory: Omit<MemoryItem, 'id' | 'timestamp'>) => {
    setMemories((prev) => [
      {
        ...newMemory,
        id: `mem-${Date.now()}`,
        timestamp: Date.now()
      },
      ...prev
    ]);
  }, []);

  const deleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const togglePinMemory = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m))
    );
  }, []);

  const toggleSkill = useCallback((id: string) => {
    setSkills((prev) =>
      prev.map((skill) => (skill.id === id ? { ...skill, enabled: !skill.enabled } : skill))
    );
  }, []);

  const toggleSubAgent = useCallback((id: string) => {
    setSubAgents((prev) =>
      prev.map((agent) => (agent.id === id ? { ...agent, enabled: !agent.enabled } : agent))
    );
  }, []);

  const exportBackupJson = useCallback(() => {
    const data = {
      personalConfig,
      assistantConfig,
      voiceGuardianConfig,
      advancedConfig,
      memories,
      skills,
      subAgents,
      exportDate: new Date().toISOString(),
      appVersion: '2.4.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mayra_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [personalConfig, assistantConfig, voiceGuardianConfig, advancedConfig, memories, skills, subAgents]);

  const resetAllData = useCallback(() => {
    setMemories([]);
    setSkills(INITIAL_SKILLS);
    setSubAgents(INITIAL_SUB_AGENTS);
  }, []);

  return {
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
    toggleSkill,
    subAgents,
    setSubAgents,
    toggleSubAgent,
    integrations,
    setIntegrations,
    memories,
    setMemories,
    addMemory,
    deleteMemory,
    togglePinMemory,
    exportBackupJson,
    resetAllData
  };
}
