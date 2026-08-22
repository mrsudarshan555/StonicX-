import React from 'react';

interface MayraLogoProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
  variant?: 'app_icon' | 'badge' | 'vector_only';
}

export const MayraLogo: React.FC<MayraLogoProps> = ({
  size = 48,
  className = '',
  showGlow = true,
  variant = 'app_icon'
}) => {
  const numericSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 48;

  if (variant === 'vector_only') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`shrink-0 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for 3D Faceted M */}
          <linearGradient id="mFacetLeftMain" x1="15%" y1="20%" x2="45%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#EDE9FE" />
            <stop offset="70%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          <linearGradient id="mFacetRightMain" x1="85%" y1="20%" x2="55%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#EDE9FE" />
            <stop offset="70%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          <linearGradient id="mCenterFacetLeft" x1="30%" y1="30%" x2="50%" y2="90%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#DDD6FE" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient id="mCenterFacetRight" x1="70%" y1="30%" x2="50%" y2="90%">
            <stop offset="0%" stopColor="#F5F3FF" />
            <stop offset="40%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>

          <linearGradient id="mHighlightSpecular" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.2" />
          </linearGradient>

          <filter id="mSpecularGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Faceted 3D M Geometry */}
        <g filter="url(#mSpecularGlow)">
          {/* Left Stem - Outer Facet */}
          <polygon points="16,22 32,22 32,78 16,78" fill="url(#mFacetLeftMain)" />
          <polygon points="16,22 24,35 24,78 16,78" fill="#FFFFFF" fillOpacity="0.4" />
          <polygon points="24,35 32,22 32,78 24,78" fill="#A78BFA" fillOpacity="0.5" />

          {/* Right Stem - Outer Facet */}
          <polygon points="68,22 84,22 84,78 68,78" fill="url(#mFacetRightMain)" />
          <polygon points="76,35 84,22 84,78 76,78" fill="#8B5CF6" fillOpacity="0.6" />
          <polygon points="68,22 76,35 76,78 68,78" fill="#FFFFFF" fillOpacity="0.45" />

          {/* Diagonal Left Flange to Center Apex */}
          <polygon points="32,22 50,54 42,76 32,78" fill="url(#mCenterFacetLeft)" />
          <polygon points="32,22 41,38 50,54 41,54" fill="#FFFFFF" fillOpacity="0.7" />

          {/* Diagonal Right Flange to Center Apex */}
          <polygon points="68,22 50,54 58,76 68,78" fill="url(#mCenterFacetRight)" />
          <polygon points="68,22 59,38 50,54 59,54" fill="#E0E7FF" fillOpacity="0.6" />

          {/* Central Gem Facet Shield Apex */}
          <polygon points="50,28 33,52 50,76 67,52" fill="url(#mHighlightSpecular)" fillOpacity="0.85" />
          <polygon points="50,28 33,52 50,76" fill="#FFFFFF" fillOpacity="0.6" />
          <polygon points="50,28 67,52 50,76" fill="#C4B5FD" fillOpacity="0.5" />
          <polygon points="50,42 41,54 50,68 59,54" fill="#FFFFFF" fillOpacity="0.9" />
        </g>
      </svg>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[24%] overflow-hidden shadow-2xl ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        background: 'radial-gradient(circle at 50% 20%, #0c0b1a 0%, #070712 55%, #3B1678 90%, #6D28D9 100%)',
        boxShadow: showGlow ? '0 8px 24px rgba(109, 40, 217, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.2)' : 'none',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}
    >
      {/* Bottom ambient luminous violet reflection matching ic_launcher_foreground */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#6D28D9]/70 via-[#7C3AED]/30 to-transparent pointer-events-none" />

      {/* SVG Faceted 3D Metallic M */}
      <svg
        viewBox="0 0 100 100"
        className="w-[82%] h-[82%] relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`mFacetLeft_${numericSize}`} x1="15%" y1="20%" x2="45%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#EDE9FE" />
            <stop offset="70%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          <linearGradient id={`mFacetRight_${numericSize}`} x1="85%" y1="20%" x2="55%" y2="80%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#EDE9FE" />
            <stop offset="70%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          <linearGradient id={`mCenterFacetLeft_${numericSize}`} x1="30%" y1="30%" x2="50%" y2="90%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#DDD6FE" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient id={`mCenterFacetRight_${numericSize}`} x1="70%" y1="30%" x2="50%" y2="90%">
            <stop offset="0%" stopColor="#F5F3FF" />
            <stop offset="40%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>

          <linearGradient id={`mHighlight_${numericSize}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer Left Pillar Facets */}
        <polygon points="16,20 34,20 34,78 16,78" fill={`url(#mFacetLeft_${numericSize})`} />
        <polygon points="16,20 25,35 25,78 16,78" fill="#FFFFFF" fillOpacity="0.5" />
        <polygon points="25,35 34,20 34,78 25,78" fill="#7C3AED" fillOpacity="0.35" />

        {/* Outer Right Pillar Facets */}
        <polygon points="66,20 84,20 84,78 66,78" fill={`url(#mFacetRight_${numericSize})`} />
        <polygon points="75,35 84,20 84,78 75,78" fill="#6D28D9" fillOpacity="0.45" />
        <polygon points="66,20 75,35 75,78 66,78" fill="#FFFFFF" fillOpacity="0.45" />

        {/* Center Diagonal Chevrons */}
        <polygon points="34,20 50,54 42,76 34,78" fill={`url(#mCenterFacetLeft_${numericSize})`} />
        <polygon points="34,20 42,37 50,54 42,54" fill="#FFFFFF" fillOpacity="0.75" />

        <polygon points="66,20 50,54 58,76 66,78" fill={`url(#mCenterFacetRight_${numericSize})`} />
        <polygon points="66,20 58,37 50,54 58,54" fill="#E0E7FF" fillOpacity="0.6" />

        {/* Central Geometric Crystalline Shield Diamond (Heart/Apex) */}
        <polygon points="50,26 33,52 50,76 67,52" fill={`url(#mHighlight_${numericSize})`} />
        <polygon points="50,26 33,52 50,76" fill="#FFFFFF" fillOpacity="0.65" />
        <polygon points="50,26 67,52 50,76" fill="#C4B5FD" fillOpacity="0.45" />
        
        {/* Inner Diamond Core Shimmer */}
        <polygon points="50,38 41,52 50,66 59,52" fill="#FFFFFF" fillOpacity="0.9" />
      </svg>
    </div>
  );
};
