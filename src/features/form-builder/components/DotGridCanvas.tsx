/**
 * Dot Grid Canvas
 * Beautiful dot grid background for the form builder canvas
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DotGridCanvasProps {
  gridSize?: number; // Size of each grid cell
  dotSize?: number;  // Size of each dot
  dotColor?: string; // Color of the dots
  className?: string;
  children?: React.ReactNode;
}

export function DotGridCanvas({
  gridSize = 20,
  dotSize = 2,
  dotColor = 'rgba(0, 0, 0, 0.1)',
  className,
  children,
}: DotGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Redraw dots
      drawDots();
    };

    const drawDots = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { width, height } = canvas.getBoundingClientRect();

      ctx.fillStyle = dotColor;

      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [gridSize, dotSize, dotColor]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Dot grid background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Content overlay */}
      <div className="relative w-full h-full">
        {children}
      </div>
    </div>
  );
}

/**
 * Alternative: CSS-based dot grid (lighter weight, but less flexible)
 */
export function CssDotGrid({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn('relative w-full h-full', className)}
      style={{
        backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      {children}
    </div>
  );
}
