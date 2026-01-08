/**
 * Signature Canvas Component
 *
 * A canvas for drawing or typing signatures.
 * Exports signature as PNG base64 data.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, PencilSimple, TextT } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  /** Called when signature data changes */
  onChange: (data: { type: 'draw' | 'type'; data: string; font?: string } | null) => void;
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Class name for container */
  className?: string;
  /** Default name for typed signature */
  defaultName?: string;
}

// Signature fonts available for typed signatures
const SIGNATURE_FONTS = [
  { name: 'Times New Roman', style: "'Times New Roman', Times, serif" },
  { name: 'Dancing Script', style: "'Dancing Script', cursive" },
  { name: 'Great Vibes', style: "'Great Vibes', cursive" },
  { name: 'Allura', style: "'Allura', cursive" },
];

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  width = 400,
  height = 150,
  strokeColor = '#000000',
  strokeWidth = 2,
  className,
  defaultName = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set initial styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height, strokeColor, strokeWidth]);

  // Sync typedName with defaultName when it changes
  useEffect(() => {
    if (defaultName && mode === 'type') {
      setTypedName(defaultName);
    }
  }, [defaultName, mode]);

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback((event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  // Start drawing
  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [getCoordinates]);

  // Draw
  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();

    const coords = getCoordinates(event);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, getCoordinates]);

  // Stop drawing
  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Export signature data
    const dataUrl = canvas.toDataURL('image/png');
    onChange({ type: 'draw', data: dataUrl });
  }, [isDrawing, hasSignature, onChange]);

  // Clear canvas
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
    onChange(null);
  }, [width, height, onChange]);

  // Handle typed signature changes
  useEffect(() => {
    if (mode !== 'type' || !typedName.trim()) {
      if (mode === 'type') {
        onChange(null);
      }
      return;
    }

    // Create a canvas with the typed signature
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw text
    ctx.fillStyle = strokeColor;
    ctx.font = `48px ${selectedFont.style}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, width / 2, height / 2);

    // Export
    const dataUrl = canvas.toDataURL('image/png');
    onChange({ type: 'type', data: dataUrl, font: selectedFont.name });
  }, [mode, typedName, selectedFont, width, height, strokeColor, onChange]);

  // Handle mode change
  const handleModeChange = (newMode: string) => {
    setMode(newMode as 'draw' | 'type');
    if (newMode === 'draw') {
      handleClear();
    } else {
      // When switching to type, auto-fill with defaultName
      if (defaultName) {
        setTypedName(defaultName);
      }
      onChange(null);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="grid w-full grid-cols-2 bg-white border">
          <TabsTrigger value="draw" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <PencilSimple className="w-4 h-4" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <TextT className="w-4 h-4" />
            Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-2">
          {/* Canvas */}
          <div className="relative border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="touch-none cursor-crosshair w-full"
              style={{ aspectRatio: `${width}/${height}` }}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />

            {/* Placeholder text */}
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-400 text-sm">Sign here</span>
              </div>
            )}
          </div>

          {/* Clear button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!hasSignature}
              className="text-gray-500"
            >
              <Eraser className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="type" className="space-y-3">
          {/* Name input */}
          <Input
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="text-lg"
          />

          {/* Font selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Select a signature style:</p>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_FONTS.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setSelectedFont(font)}
                  className={cn(
                    'p-3 border rounded-lg text-center transition-colors',
                    selectedFont.name === font.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span
                    style={{ fontFamily: font.style }}
                    className="text-2xl text-gray-800 dark:text-gray-200"
                  >
                    {typedName || 'Your Name'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {typedName && (
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-xs text-gray-500 mb-2">Preview:</p>
              <div
                className="text-center py-4"
                style={{ fontFamily: selectedFont.style }}
              >
                <span className="text-4xl text-gray-800">{typedName}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Load Google Fonts for typed signatures */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Allura&family=Sacramento&display=swap"
      />
    </div>
  );
};

export default SignatureCanvas;
