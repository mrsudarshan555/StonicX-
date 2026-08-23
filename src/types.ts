export type AppView = 'phone' | 'codebase' | 'settings_explorer' | 'memory' | 'tools' | 'architecture';

export type PhoneNavTab = 'home' | 'scan' | 'memories' | 'chat';
export type ActiveTab = PhoneNavTab;

export type SettingsSubScreen = 
  | 'root'
  | 'permissions'
  | 'personal'
  | 'country_code'
  | 'assistant'
  | 'skills'
  | 'sub_agents'
  | 'voice_guardian'
  | 'linked_devices'
  | 'whiteboard'
  | 'offline_models'
  | 'backup'
  | 'advanced'
  | 'optional_integrations'
  | 'privacy'
  | 'about';

export type AssistantStatus = 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export type CharacterEmotion = 
  | 'idle'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'thinking'
  | 'proud'
  | 'sad'
  | 'confused'
  | 'surprised'
  | 'embarrassed'
  | 'playful';

export type PermissionStatusType = 
  | 'granted' 
  | 'not_granted' 
  | 'denied'
  | 'restricted' 
  | 'requires_settings' 
  | 'not_available'
  | 'custom_action';

export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  status: PermissionStatusType;
  statusLabel?: string;
  actionType: 'toggle' | 'dialog' | 'open_settings' | 'role_picker' | 'screen_capture_intent';
  actionLabel: string;
  androidManifestPermission?: string;
  androidSystemIntent?: string;
  minSdk?: number;
  isRequired?: boolean;
}

export interface ChatMessage {
  id: string;
  sender?: 'user' | 'mayra';
  role?: 'user' | 'assistant' | 'system';
  text?: string;
  content?: string;
  timestamp: number;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: 'preference' | 'personal' | 'system' | 'task' | 'general';
  timestamp: number;
  isPinned?: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  enabled: boolean;
  author: string;
  permissionsRequired: string[];
}

export interface ToolItem {
  id?: string;
  name: string;
  description: string;
  category: string;
  enabled?: boolean;
}

export interface SubAgentItem {
  id: string;
  name: string;
  role: string;
  description: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  sandboxed: boolean;
  capabilities: string[];
}

export interface EnrolledVoice {
  id: string;
  name: string;
  role: 'owner' | 'family';
  samplesCount: number;
  confidenceScore: number;
  dateEnrolled: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'unavailable' | 'not_configured' | 'configured' | 'enabled';
  icon: string;
}

export interface CountryCodeItem {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export interface KotlinFile {
  path: string;
  name: string;
  category: 'core' | 'ui' | 'settings' | 'config' | 'build';
  content: string;
}

export interface UserPersonalConfig {
  fullName: string;
  preferredName: string;
  email: string;
  countryDialCode: string;
  countryName: string;
  greetingStyle: 'warm' | 'formal' | 'casual' | 'brief';
  geminiApiKey: string;
  geminiModel: string;
  temperature: number;
}

export interface AssistantConfig {
  personaTone: 'executive' | 'friendly' | 'technical' | 'concise';
  voiceProfile: string;
  language: string;
  speechRate: number;
  speechPitch: number;
  responseStyle: 'stream' | 'instant' | 'compact';
  hapticFeedback: boolean;
  audioChimes: boolean;
  autoReadback: boolean;
  contextWindowSize: number;
  // Voice Alerts for Incoming Calls & Messages
  voiceAlertCalls: boolean;
  voiceAlertMessages: boolean;
  voiceAlertAutoPrompt: boolean;
  // Proactive Mode
  proactiveIdleCheckin: boolean;
  // 3D Avatar Size & Sliders Setting
  characterSize: 'small' | 'medium' | 'large';
  characterScaleMultiplier?: number;
  characterZoom: number; // 70 to 140, default 100 (Medium)
  characterSkinTone: number; // 0 (Fair/Gora) to 100 (Dark/Kala), default 50 (Natural Medium)
}

export interface LinkedDeviceItem {
  id: string;
  name: string;
  model: string;
  type: 'smartphone' | 'tablet' | 'smartwatch' | 'laptop';
  status: 'online' | 'nearby_ble' | 'offline';
  batteryLevel: number;
  lastSync: string;
  location: string;
  isPrimary?: boolean;
}

export interface FamilyContact {
  id: string;
  relationship: 'Mother' | 'Father' | 'Sibling' | 'Spouse' | 'Other';
  name: string;
  whatsappNumber: string;
  notes?: string;
}

export interface VoiceGuardianConfig {
  enabled: boolean;
  awayGuardMode: boolean;
  listenMode: 'everyone' | 'owner_only' | 'owner_family';
  strictness: number; // 60 to 95
  enrolledVoices: EnrolledVoice[];
  ambientCalibration?: boolean;
}

export interface AdvancedConfig {
  safetyLevel: 'strict' | 'standard' | 'permissive';
  permissionMicrophone: boolean;
  permissionCamera: boolean;
  permissionNotifications: boolean;
  permissionOverlay: boolean;
  permissionAccessibility: boolean;
  backgroundServiceEnabled: boolean;
  batteryOptimizationExempt: boolean;
  developerDebugMode: boolean;
  verboseLogging: boolean;
}

// 3D Character & Model Types for MAYRA
export type CharacterState = 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export type AppActionType = 
  | 'SAVE_MEMORY'
  | 'DELETE_MEMORY'
  | 'CLEAR_MEMORIES'
  | 'NAVIGATE_TAB'
  | 'OPEN_SETTINGS'
  | 'TOGGLE_PERMISSION'
  | 'GRANT_PERMISSION'
  | 'TRIGGER_SCAN'
  | 'CLEAR_CHAT'
  | 'CONTACT_ACTION'
  | 'CHANGE_LANGUAGE'
  | 'TOGGLE_SKILL'
  | 'TOGGLE_SUB_AGENT';

export interface AppAction {
  type: AppActionType;
  payload?: any;
  statusMessage?: string;
}

export interface CharacterTransform {
  rotationY: number; // Horizontal orbital rotation (-180 to 180 degrees)
  pitchX: number;    // Vertical tilt angle (-45 to 45 degrees)
  zoom: number;      // Scale multiplier (0.6x to 2.5x)
  panY: number;      // Vertical camera/model center offset
}

export interface CharacterLockState {
  isLocked: boolean;
  lockTimestamp?: number;
}

export interface CharacterModelMetadata {
  modelName: string;
  sourceFile: string;
  format: 'PMX' | 'glTF' | 'GLB' | 'OBJ';
  version?: string;
  vendor?: string;
  vertexCount?: number;
  boneCount?: number;
  materialCount?: number;
  morphCount?: number;
  hasPhysics?: boolean;
  hasBones?: boolean;
  hasFacialMorphs?: boolean;
  textures: string[];
  status: 'source_ready' | 'conversion_pipeline' | 'loaded' | 'fallback_active';
}

