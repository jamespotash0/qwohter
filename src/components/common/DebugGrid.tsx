import React, { useState, useEffect } from 'react';

export const DebugGrid = (): React.JSX.Element | null => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle grid with Ctrl/Cmd + G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Vertical grid lines every 10px */}
      <div className="absolute inset-0">
        {Array.from({ length: 200 }).map((_, i) => {
          const position = i * 10;
          const isLabel = position % 25 === 0 && position > 0;
          const isHighlight = position % 50 === 0;
          const isMajor = position % 100 === 0;

          return (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0"
              style={{
                left: `${position}px`,
                width: '1px',
                backgroundColor: isMajor
                  ? 'rgba(255, 0, 0, 0.3)'
                  : isHighlight
                    ? 'rgba(0, 255, 0, 0.25)'
                    : isLabel
                      ? 'rgba(255, 165, 0, 0.2)'
                      : 'rgba(0, 0, 255, 0.1)',
              }}
            >
              {isLabel && (
                <span
                  className="absolute top-0 left-1 text-[9px] font-mono bg-white/80 px-0.5"
                  style={{
                    pointerEvents: 'none',
                    color: isMajor ? '#ef4444' : isHighlight ? '#22c55e' : '#f59e0b'
                  }}
                >
                  {position}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Horizontal grid lines every 10px */}
      <div className="absolute inset-0">
        {Array.from({ length: 200 }).map((_, i) => {
          const position = i * 10;
          const isLabel = position % 25 === 0 && position > 0;
          const isHighlight = position % 50 === 0;
          const isMajor = position % 100 === 0;

          return (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0"
              style={{
                top: `${position}px`,
                height: '1px',
                backgroundColor: isMajor
                  ? 'rgba(255, 0, 0, 0.3)'
                  : isHighlight
                    ? 'rgba(0, 255, 0, 0.25)'
                    : isLabel
                      ? 'rgba(255, 165, 0, 0.2)'
                      : 'rgba(0, 0, 255, 0.1)',
              }}
            >
              {isLabel && (
                <span
                  className="absolute left-0 top-1 text-[9px] font-mono bg-white/80 px-0.5"
                  style={{
                    pointerEvents: 'none',
                    color: isMajor ? '#ef4444' : isHighlight ? '#22c55e' : '#f59e0b'
                  }}
                >
                  {position}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Info panel */}
      <div className="absolute top-4 right-4 bg-black/80 text-white text-xs font-mono p-3 rounded-lg">
        <div className="font-bold mb-2">Debug Grid Active</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500/50"></div>
            <span>Major (100px)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500/50"></div>
            <span>Minor (50px)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500/50"></div>
            <span>Grid (10px)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 text-[10px]">
          Press <kbd className="bg-white/20 px-1 rounded">Ctrl/Cmd + G</kbd> to toggle
        </div>
      </div>
    </div>
  );
};
