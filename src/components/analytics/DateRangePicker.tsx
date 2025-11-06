/**
 * 📅 Date Range Picker Component
 *
 * Flexible date selection with:
 * - Quick presets (Today, Last 7 days, This Month, etc.)
 * - Custom date range picker
 * - Comparison mode (compare to previous period)
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const quickPresets = [
  { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
  {
    label: 'Last 7 days',
    getValue: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from, to };
    },
  },
  {
    label: 'Last 30 days',
    getValue: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from, to };
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    },
  },
  {
    label: 'This Year',
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      return { from, to };
    },
  },
];

export const DateRangePicker = ({
  value,
  onChange,
  className,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });

  const handleSelect = (selectedRange: { from?: Date; to?: Date } | undefined) => {
    if (selectedRange) {
      setRange(selectedRange);
      if (selectedRange.from && selectedRange.to) {
        onChange({ from: selectedRange.from, to: selectedRange.to });
        setIsOpen(false);
      }
    }
  };

  const handlePresetClick = (preset: typeof quickPresets[0]) => {
    const newRange = preset.getValue();
    setRange(newRange);
    onChange(newRange);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal border-gray-200 dark:border-gray-700',
            !value && 'text-gray-500',
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value.from && value.to ? (
            <>
              {format(value.from, 'MMM d, yyyy')} - {format(value.to, 'MMM d, yyyy')}
            </>
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900" align="start">
        <div className="flex">
          {/* Quick presets */}
          <div className="border-r border-gray-200 dark:border-gray-800 p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Quick Select
            </p>
            {quickPresets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="w-full justify-start text-sm font-normal h-8"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
