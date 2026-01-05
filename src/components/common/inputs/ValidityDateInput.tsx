/**
 * Validity Date Input
 * Allows flexible date input: "X days from Y date" or direct date selection
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { CalendarBlank, Clock } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type ReferenceDate = 'proposal' | 'today' | 'custom';

interface ValidityDateInputProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  proposalDate?: string; // ISO date string
  className?: string;
  disabled?: boolean;
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(date1: string, date2: string): number {
  const [y1, m1, d1] = date1.split('-').map(Number);
  const [y2, m2, d2] = date2.split('-').map(Number);
  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function parseToDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return undefined;
  }
}

function formatToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ValidityDateInput({
  value,
  onChange,
  proposalDate,
  className,
  disabled,
}: ValidityDateInputProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(0);
  const [daysInput, setDaysInput] = useState('');
  const [referenceDate, setReferenceDate] = useState<ReferenceDate>('proposal');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [showCalendar, setShowCalendar] = useState(false); // Calendar hidden by default
  const isUserEditing = useRef(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0] ?? '', []);

  const getReferenceDateValue = (): string => {
    switch (referenceDate) {
      case 'proposal':
        return proposalDate || today;
      case 'today':
        return today;
      case 'custom':
        return customDate;
      default:
        return today;
    }
  };

  useEffect(() => {
    if (isUserEditing.current) return;
    if (value && proposalDate) {
      const calculatedDays = daysBetween(proposalDate, value);
      if (calculatedDays > 0 && calculatedDays !== days) {
        setDays(calculatedDays);
        setDaysInput(String(calculatedDays));
      }
    }
  }, [value, proposalDate]);

  const handleDaysInputChange = (inputValue: string) => {
    isUserEditing.current = true;
    setDaysInput(inputValue);

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDays(parsed);
      const refDate = getReferenceDateValue();
      const newDate = addDays(refDate, parsed);
      onChange(newDate);
    }

    setTimeout(() => {
      isUserEditing.current = false;
    }, 100);
  };

  const handleReferenceDateChange = (newRef: ReferenceDate) => {
    setReferenceDate(newRef);
    setDays(0);
    setDaysInput('');
    setShowCalendar(false); // Don't auto-show calendar
  };

  const handleCustomDateSelect = (date: Date | undefined) => {
    if (date) {
      const newCustomDate = formatToIso(date);
      setCustomDate(newCustomDate);
      // If days is 0, use the custom date directly as the validity date
      // Otherwise, add days to the custom reference date
      const newDate = days > 0 ? addDays(newCustomDate, days) : newCustomDate;
      onChange(newDate);
      setShowCalendar(false);
    }
  };

  const handleDirectDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = formatToIso(date);
      onChange(newDate);
      if (proposalDate) {
        const calculatedDays = daysBetween(proposalDate, newDate);
        if (calculatedDays > 0) {
          setDays(calculatedDays);
          setDaysInput(String(calculatedDays));
          setReferenceDate('proposal');
        }
      }
      setShowCalendar(false);
    }
  };

  const displayText = useMemo(() => {
    if (!value) return 'Set validity...';
    return formatDate(value);
  }, [value]);

  const selectedDate = useMemo(() => parseToDate(value), [value]);
  const customDateObj = useMemo(() => parseToDate(customDate), [customDate]);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setShowCalendar(false); // Reset calendar view when closing
    }}>
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
          <Clock className="mr-1.5 h-3 w-3" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          {/* Duration input */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Duration</p>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={daysInput}
                onChange={(e) => handleDaysInputChange(e.target.value)}
                placeholder="30"
                className="h-7 w-16 text-xs"
              />
              <span className="text-xs text-gray-500">days from</span>
              <Select value={referenceDate} onValueChange={(v) => handleReferenceDateChange(v as ReferenceDate)}>
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposal Date</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom reference date - show selected date or button to pick */}
          {referenceDate === 'custom' && !showCalendar && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs justify-start"
              onClick={() => setShowCalendar(true)}
            >
              <CalendarBlank className="mr-1.5 h-3 w-3" />
              {customDate ? formatDate(customDate) : 'Select reference date...'}
            </Button>
          )}

          {/* Custom reference date calendar */}
          {referenceDate === 'custom' && showCalendar && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Reference Date</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-2"
                  onClick={() => setShowCalendar(false)}
                >
                  Hide
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={customDateObj}
                onSelect={handleCustomDateSelect}
                defaultMonth={customDateObj}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Direct date picker button - hidden when using custom reference date */}
          {referenceDate !== 'custom' && !showCalendar && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs justify-start"
                onClick={() => setShowCalendar(true)}
              >
                <CalendarBlank className="mr-1.5 h-3 w-3" />
                {value ? `Change: ${formatDate(value)}` : 'Or pick specific date...'}
              </Button>
            </div>
          )}

          {/* Direct date picker calendar */}
          {referenceDate !== 'custom' && showCalendar && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Select Date</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-2"
                  onClick={() => setShowCalendar(false)}
                >
                  Hide
                </Button>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDirectDateSelect}
                defaultMonth={selectedDate}
                className="rounded-md border"
              />
            </div>
          )}

          {/* Result preview */}
          {value && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-xs">
                <CalendarBlank className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-500">Valid until:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(value)}
                </span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
