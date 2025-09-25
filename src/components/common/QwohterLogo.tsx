import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface QwohterLogoProps {
  size?: 'xs' | 'xsm' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const QwohterLogo: React.FC<QwohterLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '' 
}) => {
  const { theme } = useTheme();
  
  // Logo dimensions - smaller sizes
  const sizeClasses = {
    xs: 'h-6 w-auto max-w-24',   // Extra Small: 24px height, auto width, max 96px wide
    xsm: 'h-7 w-auto max-w-28',  // Between XS and SM: 28px height, auto width, max 112px wide
    sm: 'h-8 w-auto max-w-32',   // Small: 32px height, auto width, max 128px wide
    md: 'h-10 w-auto max-w-40',  // Medium: 40px height, auto width, max 160px wide
    lg: 'h-12 w-auto max-w-48'   // Large: 48px height, auto width, max 192px wide
  };

  // Determine which logo to use based on theme
  const getLogoSrc = () => {
    switch (theme) {
      case 'dark':
        return '/logos/Logo-Light.svg';
      case 'light':
        return '/logos/Dashboard-Page-Background-White-Logo.svg';
      default:
        return '/logos/Logo-Light.svg';
    }
  };

  const logoSrc = getLogoSrc();

  return (
    <div className={`flex items-center ${className}`}>
      {/* Complete Qwohter Logo from Figma - no background container */}
      <img
        src={logoSrc}
        alt="Qwohter"
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // Fallback to placeholder if SVG file doesn't exist
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.setAttribute('style', 'display: flex');
        }}
      />

      {/* Fallback placeholder - includes both icon and text */}
      <div
        className="flex items-center gap-2"
        style={{ display: 'none' }}
      >
        <div className="w-6 h-6 bg-gradient-to-br from-[#4164df] to-[#3565f7] rounded-lg flex items-center justify-center shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="w-4/5 h-4/5 text-white"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.54 0 3-.35 4.3-.97l-1.9-1.9c-.8.35-1.7.55-2.6.55-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6c0 .9-.2 1.8-.55 2.6l1.9 1.9c.62-1.3.97-2.76.97-4.3C22 6.48 17.52 2 12 2z"/>
            <path d="M15.5 13.5l3 3 1.5-1.5-3-3z"/>
            <path d="M8 9h8v1.5H8z"/>
            <path d="M8 12h6v1.5H8z"/>
          </svg>
        </div>
        <span
          className="font-bold text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Qwohter
        </span>
      </div>
    </div>
  );
};