import { AppThemePreset } from '../types';

export interface ThemePresetDefinition {
  id: AppThemePreset;
  name: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
  accentGradient: string;
  iconBgGradient: string;
  previewSwatches: string[];
  activeText: string;
  activeBorder: string;
  activeBg: string;
  glowShadow: string;
  buttonGradient: string;
  ringColor: string;
}

export const APP_THEMES: Record<AppThemePreset, ThemePresetDefinition> = {
  cyan: {
    id: 'cyan',
    name: 'Cyan Pulse',
    subtitle: 'Luminous cyan, electric teal & neon sky blue (Default)',
    primaryHex: '#06b6d4',
    secondaryHex: '#0ea5e9',
    accentGradient: 'from-cyan-500 to-blue-600',
    iconBgGradient: 'from-cyan-500 via-sky-600 to-blue-700',
    previewSwatches: ['#06b6d4', '#0ea5e9', '#38bdf8', '#0284c7'],
    activeText: 'text-cyan-400',
    activeBorder: 'border-cyan-400/60',
    activeBg: 'bg-cyan-500/20',
    glowShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.45)]',
    buttonGradient: 'from-cyan-500 to-blue-600',
    ringColor: 'ring-cyan-400'
  },
  aura_red: {
    id: 'aura_red',
    name: 'Aura Red',
    subtitle: 'Fiery crimson, ruby glow & warm dynamic pulse',
    primaryHex: '#ef4444',
    secondaryHex: '#f43f5e',
    accentGradient: 'from-red-500 to-rose-600',
    iconBgGradient: 'from-red-500 via-rose-600 to-pink-700',
    previewSwatches: ['#ef4444', '#f43f5e', '#fb7185', '#be123c'],
    activeText: 'text-rose-400',
    activeBorder: 'border-rose-400/60',
    activeBg: 'bg-rose-500/20',
    glowShadow: 'shadow-[0_0_20px_rgba(244,63,94,0.45)]',
    buttonGradient: 'from-red-500 to-rose-600',
    ringColor: 'ring-rose-400'
  },
  purple: {
    id: 'purple',
    name: 'Cosmic Purple',
    subtitle: 'Deep royal purple, radiant violet & amethyst aura',
    primaryHex: '#a855f7',
    secondaryHex: '#8b5cf6',
    accentGradient: 'from-purple-500 to-indigo-600',
    iconBgGradient: 'from-purple-500 via-violet-600 to-indigo-700',
    previewSwatches: ['#a855f7', '#8b5cf6', '#c084fc', '#6d28d9'],
    activeText: 'text-purple-400',
    activeBorder: 'border-purple-400/60',
    activeBg: 'bg-purple-500/20',
    glowShadow: 'shadow-[0_0_20px_rgba(168,85,247,0.45)]',
    buttonGradient: 'from-purple-500 to-indigo-600',
    ringColor: 'ring-purple-400'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Cyber',
    subtitle: 'Vivid neon emerald, jade glow & matrix mint',
    primaryHex: '#10b981',
    secondaryHex: '#059669',
    accentGradient: 'from-emerald-500 to-teal-600',
    iconBgGradient: 'from-emerald-500 via-teal-600 to-green-700',
    previewSwatches: ['#10b981', '#059669', '#34d399', '#047857'],
    activeText: 'text-emerald-400',
    activeBorder: 'border-emerald-400/60',
    activeBg: 'bg-emerald-500/20',
    glowShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.45)]',
    buttonGradient: 'from-emerald-500 to-teal-600',
    ringColor: 'ring-emerald-400'
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Obsidian',
    subtitle: 'Sleek indigo steel, deep sapphire & cyber nebula',
    primaryHex: '#6366f1',
    secondaryHex: '#3b82f6',
    accentGradient: 'from-indigo-500 to-sky-600',
    iconBgGradient: 'from-indigo-600 via-blue-700 to-slate-900',
    previewSwatches: ['#6366f1', '#3b82f6', '#818cf8', '#1e1b4b'],
    activeText: 'text-indigo-400',
    activeBorder: 'border-indigo-400/60',
    activeBg: 'bg-indigo-500/20',
    glowShadow: 'shadow-[0_0_20px_rgba(99,102,241,0.45)]',
    buttonGradient: 'from-indigo-500 to-blue-600',
    ringColor: 'ring-indigo-400'
  }
};

export function getThemePreset(themeId?: AppThemePreset): ThemePresetDefinition {
  if (themeId && APP_THEMES[themeId]) {
    return APP_THEMES[themeId];
  }
  return APP_THEMES.cyan;
}
