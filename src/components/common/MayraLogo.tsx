import React from 'react';
import { AppLauncherIconVariant } from '../../types';

interface MayraLogoProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
  variant?: 'app_icon' | 'badge' | 'vector_only';
  iconVariant?: AppLauncherIconVariant;
}

export const LAUNCHER_ICONS: Record<AppLauncherIconVariant, {
  id: AppLauncherIconVariant;
  name: string;
  subtitle: string;
  accent: string;
  glow: string;
  bgGradient: string;
  borderClass: string;
}> = {
  cyan_default: {
    id: 'cyan_default',
    name: 'Quantum Cyan',
    subtitle: 'Original Cyber Matrix',
    accent: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.5)',
    bgGradient: 'from-cyan-950 via-slate-900 to-[#070914]',
    borderClass: 'border-cyan-500/40'
  },
  amber_gold: {
    id: 'amber_gold',
    name: 'Solar Amber',
    subtitle: 'Golden Flare Power Core',
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.5)',
    bgGradient: 'from-amber-950 via-slate-900 to-[#120B03]',
    borderClass: 'border-amber-500/40'
  },
  violet_cosmic: {
    id: 'violet_cosmic',
    name: 'Cosmic Violet',
    subtitle: 'Deep Nebula Singularity',
    accent: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.5)',
    bgGradient: 'from-purple-950 via-slate-900 to-[#10071C]',
    borderClass: 'border-purple-500/40'
  },
  stealth_obsidian: {
    id: 'stealth_obsidian',
    name: 'Obsidian Stealth',
    subtitle: 'Monochrome Titanium',
    accent: '#94A3B8',
    glow: 'rgba(148, 163, 184, 0.35)',
    bgGradient: 'from-slate-900 via-neutral-950 to-black',
    borderClass: 'border-slate-500/40'
  }
};

export const MayraLogo: React.FC<MayraLogoProps> = ({
  size = 48,
  className = '',
  showGlow = true,
  iconVariant = 'cyan_default'
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 48;
  const currentIconDef = LAUNCHER_ICONS[iconVariant] || LAUNCHER_ICONS.cyan_default;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        boxShadow: showGlow ? `0 4px 16px ${currentIconDef.glow}` : 'none',
      }}
    >
      <img
        src="/mayra_logo.png"
        alt="Mayra Logo"
        className={`w-full h-full object-contain pointer-events-none select-none rounded-[22%] transition-all ${
          iconVariant === 'amber_gold' ? 'hue-rotate-[140deg] saturate-150'
          : iconVariant === 'violet_cosmic' ? 'hue-rotate-[240deg] saturate-125'
          : iconVariant === 'stealth_obsidian' ? 'grayscale contrast-125'
          : ''
        }`}
        draggable={false}
      />
    </div>
  );
};


