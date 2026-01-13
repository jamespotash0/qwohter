/**
 * Toolbar Components
 *
 * Reusable components for the presentation editor toolbar.
 */

import { useState } from 'react';
import {
  Table,
  CaretDown,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================================================
// Toolbar Button
// ============================================================================

export interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
}

export function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded transition-all duration-150',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive
          ? 'bg-coral/10 text-coral'
          : 'text-gray-600 dark:text-gray-400',
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Toolbar Divider
// ============================================================================

export function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

// ============================================================================
// Color Picker
// ============================================================================

export interface ColorOption {
  label: string;
  value: string;
}

export interface ColorPickerProps {
  colors: readonly ColorOption[] | ColorOption[];
  currentColor: string;
  onSelect: (color: string) => void;
  icon: React.ReactNode;
  title: string;
}

export function ColorPicker({
  colors,
  currentColor,
  onSelect,
  icon,
  title,
}: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          className={cn(
            'p-1.5 rounded transition-all duration-150 flex items-center gap-0.5',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'text-gray-600 dark:text-gray-400'
          )}
        >
          {icon}
          <CaretDown className="w-2.5 h-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {colors.map((color) => (
            <button
              key={color.value || 'default'}
              type="button"
              onClick={() => onSelect(color.value)}
              title={color.label}
              className={cn(
                'w-6 h-6 rounded border transition-all',
                color.value === currentColor && 'ring-2 ring-coral ring-offset-1',
                !color.value &&
                  'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 relative',
                color.value && 'border-transparent'
              )}
              style={color.value ? { backgroundColor: color.value } : undefined}
            >
              {!color.value && (
                <X className="w-4 h-4 text-gray-400 absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Table Selector
// ============================================================================

export interface TableSelectorProps {
  onInsert: (rows: number, cols: number) => void;
}

export function TableSelector({ onInsert }: TableSelectorProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert Table"
          className={cn(
            'p-1.5 rounded transition-all duration-150',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'text-gray-600 dark:text-gray-400'
          )}
        >
          <Table className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="text-xs text-gray-500 mb-2 text-center">
          {hoveredCell ? `${hoveredCell.row} × ${hoveredCell.col}` : 'Select size'}
        </div>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
        >
          {Array.from({ length: 6 }).map((_, rowIndex) =>
            Array.from({ length: 8 }).map((_, colIndex) => {
              const row = rowIndex + 1;
              const col = colIndex + 1;
              const isHighlighted =
                hoveredCell && row <= hoveredCell.row && col <= hoveredCell.col;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={cn(
                    'w-4 h-4 border rounded-sm transition-colors',
                    isHighlighted
                      ? 'bg-coral/20 border-coral'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  )}
                  onMouseEnter={() => setHoveredCell({ row, col })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => onInsert(row, col)}
                />
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
