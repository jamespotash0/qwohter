import React from 'react';

interface TrialProgressRingProps {
  /** Days remaining in trial */
  daysRemaining: number;
  /** Total trial days (default 14) */
  totalDays?: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to show percentage text in center */
  showPercentage?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * Animated circular progress ring for trial countdown
 * Color-coded by urgency: green → yellow → red
 */
export const TrialProgressRing: React.FC<TrialProgressRingProps> = ({
  daysRemaining,
  totalDays = 14,
  size = 120,
  strokeWidth = 8,
  showPercentage = false,
  className = '',
}) => {
  // Calculate progress percentage
  const progress = Math.min(100, Math.max(0, (daysRemaining / totalDays) * 100));

  // Calculate SVG circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Determine color based on days remaining
  const getColor = () => {
    if (daysRemaining >= 8) {
      // Green gradient (plenty of time)
      return {
        from: '#10b981',
        to: '#059669',
        glow: '#10b981',
      };
    } else if (daysRemaining >= 4) {
      // Yellow/amber gradient (warning)
      return {
        from: '#f59e0b',
        to: '#d97706',
        glow: '#f59e0b',
      };
    } else {
      // Red gradient (urgent)
      return {
        from: '#ef4444',
        to: '#dc2626',
        glow: '#ef4444',
      };
    }
  };

  const colors = getColor();
  const shouldPulse = daysRemaining <= 3;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className={shouldPulse ? 'animate-pulse' : ''}
      >
        {/* Define gradient */}
        <defs>
          <linearGradient id={`trialGradient-${daysRemaining}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>

          {/* Glow effect for urgency */}
          {shouldPulse && (
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#trialGradient-${daysRemaining})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
            filter: shouldPulse ? 'url(#glow)' : 'none',
          }}
        />
      </svg>

      {/* Center text overlay */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: colors.from }}>
              {Math.round(progress)}%
            </div>
            <div className="text-xs text-gray-500">
              remaining
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
