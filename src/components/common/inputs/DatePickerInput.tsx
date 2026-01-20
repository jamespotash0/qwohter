/**
 * Date Picker Input
 * Clean visual calendar picker - industry standard design
 */

import { useState, useMemo } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatLocalDate } from '@/lib/utils';

interface DatePickerInputProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Convert YYYY-MM-DD string to Date object (local time)
function parseToDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year as any, month - 1, day);
  } catch {
    return undefined;
  }
}

// Convert Date object to YYYY-MM-DD string
function formatToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Select date...',
  className,
  disabled,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);

  const displayText = useMemo(() => {
    if (!value) return placeholder;
    return formatLocalDate(value);
  }, [value, placeholder]);

  const selectedDate = useMemo(() => parseToDate(value), [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatToIso(date));
      setOpen(false);
    }
  };

  const handleToday = () => {
    onChange(formatToIso(new Date()));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-7 w-full justify-start text-left font-normal text-xs px-2',
            'rounded border-gray-200 dark:border-gray-600',
            'focus:ring-1 focus:ring-coral/20 focus:border-coral',
            !value && 'text-muted-foreground',
            disabled && 'opacity-60 cursor-not-allowed',
            className
          )}
        >
          <CalendarBlank className="mr-1.5 h-3 w-3" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          defaultMonth={selectedDate}
          initialFocus
        />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7"
            onClick={handleToday}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
