/**
 * ReminderPicker Component
 *
 * A popover-based reminder picker with preset options and custom date/time selection.
 */

import { useState, useMemo, useEffect } from 'react';
import { format, subDays, setHours, setMinutes, parseISO, isValid, isBefore, isToday, isTomorrow } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { BellSimple, CalendarBlank, Clock, X } from '@phosphor-icons/react';
import type { ReminderPreset, ReminderRecurrence } from '@/lib/types/projectTasks';

interface ReminderPickerProps {
  dueDate: string | null;
  reminderDate: string | null;
  reminderRecurrence: ReminderRecurrence;
  reminderSent?: boolean;
  lastReminderSentAt?: string | null;
  onReminderChange: (reminderDate: string | null, recurrence: ReminderRecurrence) => void;
  disabled?: boolean;
}

export function ReminderPicker({
  dueDate,
  reminderDate,
  reminderRecurrence,
  reminderSent = false,
  lastReminderSentAt,
  onReminderChange,
  disabled = false,
}: ReminderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [repeatDaily, setRepeatDaily] = useState(reminderRecurrence === 'daily');
  const [selectedPreset, setSelectedPreset] = useState<ReminderPreset>('none');

  // Sync repeatDaily when prop changes
  useEffect(() => {
    setRepeatDaily(reminderRecurrence === 'daily');
  }, [reminderRecurrence]);

  // Sync selectedPreset and customTime when popover opens
  useEffect(() => {
    if (isOpen) {
      // Sync the time from saved reminder, or default to 9:00 AM
      if (reminderDate) {
        const reminderObj = parseISO(reminderDate);
        if (isValid(reminderObj)) {
          setCustomTime(format(reminderObj, 'HH:mm'));
        } else {
          setCustomTime('09:00'); // Default to 9:00 AM
        }
      } else {
        setCustomTime('09:00'); // Default to 9:00 AM when no reminder
      }

      // Determine current preset when opening
      if (!reminderDate) {
        setSelectedPreset('none');
      } else if (dueDate) {
        const dueDateObj = parseLocalDate(dueDate);
        const reminderObj = parseISO(reminderDate);
        if (!isValid(reminderObj)) {
          setSelectedPreset('custom');
          return;
        }
        const reminderDateOnly = format(reminderObj, 'yyyy-MM-dd');
        const dueDateOnly = format(dueDateObj, 'yyyy-MM-dd');

        if (reminderDateOnly === dueDateOnly) setSelectedPreset('day_of');
        else if (reminderDateOnly === format(subDays(dueDateObj, 1), 'yyyy-MM-dd')) setSelectedPreset('1_day');
        else if (reminderDateOnly === format(subDays(dueDateObj, 2), 'yyyy-MM-dd')) setSelectedPreset('2_days');
        else if (reminderDateOnly === format(subDays(dueDateObj, 7), 'yyyy-MM-dd')) setSelectedPreset('1_week');
        else setSelectedPreset('custom');
      } else {
        setSelectedPreset('custom');
      }
    }
  }, [isOpen, reminderDate, dueDate]);

  // Parse current reminder date
  const currentReminder = useMemo(() => {
    if (!reminderDate) return null;
    try {
      const date = parseISO(reminderDate);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }, [reminderDate]);

  // Determine reminder status: 'sent', 'expired', 'scheduled', or null
  const reminderStatus = useMemo((): 'sent' | 'expired' | 'scheduled' | null => {
    if (!currentReminder) return null;

    // For one-time reminders: check if sent
    if (reminderRecurrence === 'once' && reminderSent) {
      return 'sent';
    }

    // For daily reminders: check last_reminder_sent_at for today
    if (reminderRecurrence === 'daily' && lastReminderSentAt) {
      const lastSent = parseISO(lastReminderSentAt);
      if (isValid(lastSent) && isToday(lastSent)) {
        return 'sent'; // Already sent today
      }
    }

    // Check if reminder time has passed (for one-time reminders)
    if (reminderRecurrence === 'once' && isBefore(currentReminder, new Date())) {
      return 'expired';
    }

    return 'scheduled';
  }, [currentReminder, reminderSent, reminderRecurrence, lastReminderSentAt]);

  // Determine current preset based on reminder date and due date
  const currentPreset = useMemo((): ReminderPreset => {
    if (!reminderDate || !currentReminder) return 'none';
    if (!dueDate) return 'custom';

    const dueDateObj = parseLocalDate(dueDate);
    const reminderDateOnly = format(currentReminder, 'yyyy-MM-dd');
    const dueDateOnly = format(dueDateObj, 'yyyy-MM-dd');

    if (reminderDateOnly === dueDateOnly) return 'day_of';
    if (reminderDateOnly === format(subDays(dueDateObj, 1), 'yyyy-MM-dd')) return '1_day';
    if (reminderDateOnly === format(subDays(dueDateObj, 2), 'yyyy-MM-dd')) return '2_days';
    if (reminderDateOnly === format(subDays(dueDateObj, 7), 'yyyy-MM-dd')) return '1_week';

    return 'custom';
  }, [reminderDate, currentReminder, dueDate]);

  // Generate reminder date from preset
  const calculateReminderDate = (preset: ReminderPreset, time: string = '09:00'): string | null => {
    if (preset === 'none' || !dueDate) return null;

    const dueDateObj = parseLocalDate(dueDate);
    const timeParts = time.split(':').map(Number);
    const hours = timeParts[0] ?? 9;
    const minutes = timeParts[1] ?? 0;

    let targetDate: Date;
    switch (preset) {
      case 'day_of':
        targetDate = dueDateObj;
        break;
      case '1_day':
        targetDate = subDays(dueDateObj, 1);
        break;
      case '2_days':
        targetDate = subDays(dueDateObj, 2);
        break;
      case '1_week':
        targetDate = subDays(dueDateObj, 7);
        break;
      default:
        return null;
    }

    targetDate = setHours(targetDate, hours);
    targetDate = setMinutes(targetDate, minutes);
    return targetDate.toISOString();
  };

  // Handle preset selection (just selects, doesn't save)
  const handlePresetSelect = (preset: ReminderPreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      if (currentReminder) {
        setCustomDate(format(currentReminder, 'yyyy-MM-dd'));
        setCustomTime(format(currentReminder, 'HH:mm'));
      } else if (dueDate) {
        setCustomDate(dueDate);
        setCustomTime('09:00');
      }
    } else {
      setSelectedPreset(preset);
      setShowCustom(false);
      // Disable repeat daily for "day_of" since there are no days to repeat
      if (preset === 'day_of') {
        setRepeatDaily(false);
      }
      // Set appropriate default time based on preset date
      if (preset !== 'none') {
        const presetDate = allPresetOptions.find(p => p.preset === preset)?.date;
        if (presetDate) {
          if (isToday(presetDate)) {
            // For today: default to 9:00 AM if still in future, otherwise current time
            const now = new Date();
            const nineAM = new Date();
            nineAM.setHours(9, 0, 0, 0);
            if (now < nineAM) {
              setCustomTime('09:00');
            } else {
              setCustomTime(getMinTimeForDate(presetDate));
            }
          } else {
            // For other days: default to 9:00 AM
            setCustomTime('09:00');
          }
        }
      }
    }
  };

  // Handle saving the selected preset
  const handlePresetSave = () => {
    if (selectedPreset === 'none') {
      onReminderChange(null, 'once');
      setRepeatDaily(false);
    } else {
      const newReminderDate = calculateReminderDate(selectedPreset, customTime || '09:00');
      // For "day_of", always use 'once' since there are no days to repeat
      const recurrence = selectedPreset === 'day_of' ? 'once' : (repeatDaily ? 'daily' : 'once');
      onReminderChange(newReminderDate, recurrence);
    }
    setIsOpen(false);
  };

  // Handle custom date/time save
  const handleCustomSave = () => {
    if (!customDate) return;

    const timeParts = (customTime || '09:00').split(':').map(Number);
    const hours = timeParts[0] ?? 9;
    const minutes = timeParts[1] ?? 0;
    let targetDate = parseLocalDate(customDate);
    targetDate = setHours(targetDate, hours);
    targetDate = setMinutes(targetDate, minutes);

    onReminderChange(targetDate.toISOString(), repeatDaily ? 'daily' : 'once');
    setShowCustom(false);
    setIsOpen(false);
  };

  // Get display label - shows preview when popover is open with unsaved changes
  const getDisplayLabel = (): string => {
    // Show status for sent/expired reminders when popover is closed
    if (!isOpen && reminderStatus === 'sent') {
      if (lastReminderSentAt) {
        const sentDate = parseISO(lastReminderSentAt);
        if (isValid(sentDate)) {
          return `Sent ${format(sentDate, 'MMM d, h:mm a')}`;
        }
      }
      return 'Reminder sent';
    }

    if (!isOpen && reminderStatus === 'expired') {
      return 'Reminder expired';
    }

    // When popover is open and user has selected a different preset, show preview
    if (isOpen && selectedPreset !== currentPreset) {
      if (selectedPreset === 'none') return 'No reminder';
      if (selectedPreset === 'custom') return 'Custom...';

      // Calculate and show the preview date
      const previewDate = calculateReminderDate(selectedPreset, customTime);
      if (previewDate) {
        try {
          const date = parseISO(previewDate);
          if (isValid(date)) {
            const dateStr = format(date, 'MMM d');
            const timeStr = format(date, 'h:mm a');
            if (repeatDaily) {
              return `Daily from ${dateStr}, ${timeStr}`;
            }
            return `${dateStr}, ${timeStr}`;
          }
        } catch {
          // Fall through to saved value
        }
      }
    }

    // Show saved value
    if (!reminderDate || !currentReminder) return 'No reminder';

    const dateStr = format(currentReminder, 'MMM d');
    const timeStr = format(currentReminder, 'h:mm a');

    if (reminderRecurrence === 'daily') {
      return `Daily from ${dateStr}, ${timeStr}`;
    }

    return `${dateStr}, ${timeStr}`;
  };

  const hasReminder = reminderDate !== null;

  // Format time for display (convert 24h to 12h)
  const formatTimeDisplay = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const hour = h ?? 9;
    const minute = m ?? 0;
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Check if a date is before today (completely in the past)
  const isDateBeforeToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return isBefore(checkDate, today);
  };

  // Get minimum valid time for a given date (now if today, otherwise 00:00)
  const getMinTimeForDate = (date: Date): string => {
    if (isToday(date)) {
      const now = new Date();
      // Use exact current time (next minute)
      const minutes = now.getMinutes() + 1;
      const hours = minutes >= 60 ? now.getHours() + 1 : now.getHours();
      const adjustedMinutes = minutes >= 60 ? 0 : minutes;
      return `${hours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
    }
    return '00:00';
  };

  // Today's date for min attribute on date input
  const todayStr = format(new Date(), 'yyyy-MM-dd');



  // Helper to get day indicator
  const getDayIndicator = (date: Date): string => {
    if (isToday(date)) return ' (Today)';
    if (isTomorrow(date)) return ' (Tomorrow)';
    return '';
  };

  // Preset options data - filter out dates before today
  // Use customTime as source of truth since it gets synced on open and updated by dropdowns
  const allPresetOptions = dueDate ? [
    { preset: 'day_of' as ReminderPreset, label: 'Day of due date', date: parseLocalDate(dueDate) },
    { preset: '1_day' as ReminderPreset, label: '1 day before', date: subDays(parseLocalDate(dueDate), 1) },
    { preset: '2_days' as ReminderPreset, label: '2 days before', date: subDays(parseLocalDate(dueDate), 2) },
    { preset: '1_week' as ReminderPreset, label: '1 week before', date: subDays(parseLocalDate(dueDate), 7) },
  ] : [];

  // Get default time for a date (9:00 AM if in future, otherwise current time for today)
  const getDefaultTimeForDate = (date: Date): string => {
    if (!isToday(date)) return '09:00';
    const now = new Date();
    const nineAM = new Date();
    nineAM.setHours(9, 0, 0, 0);
    return now < nineAM ? '09:00' : getMinTimeForDate(date);
  };

  // Filter to only show today or future dates (allow today even if time has passed - user can adjust time)
  const presetOptions = allPresetOptions
    .filter(opt => !isDateBeforeToday(opt.date))
    .map(opt => {
      const dayIndicator = getDayIndicator(opt.date);
      const isTodayDate = isToday(opt.date);
      const isSelected = opt.preset === selectedPreset;
      // Show customTime if selected, otherwise show default time for the date
      const displayTime = isSelected ? customTime : getDefaultTimeForDate(opt.date);
      return {
        ...opt,
        // Append (Today)/(Tomorrow) to the label if applicable
        label: `${opt.label}${dayIndicator}`,
        // Always show date and time in sublabel
        sublabel: `${format(opt.date, 'MMM d')} @ ${formatTimeDisplay(displayTime)}`,
        // Track if this is a today option
        isToday: isTodayDate,
      };
    });

  // Check if repeat daily should be disabled (when reminder is on due date, no days to repeat)
  const isRepeatDailyDisabled = selectedPreset === 'day_of';

  // Check if all presets are in the past
  const allPresetsInPast = dueDate && presetOptions.length === 0;

  // Parse current time into hour, minute, period for dropdowns
  const parseTimeToComponents = (time: string): { hour: string; minute: string; period: 'AM' | 'PM' } => {
    const [h, m] = time.split(':').map(Number);
    const hour24 = h ?? 9;
    const minute = m ?? 0;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return {
      hour: hour12.toString(),
      minute: minute.toString().padStart(2, '0'),
      period: period as 'AM' | 'PM',
    };
  };

  // Convert hour/minute/period back to 24h time string
  const componentsToTime = (hour: string, minute: string, period: 'AM' | 'PM'): string => {
    let hour24 = parseInt(hour, 10);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Use customTime as the source of truth for the dropdowns (it gets synced when popover opens)
  const timeComponents = parseTimeToComponents(customTime);

  // Get minimum hour for today
  const getMinHourForToday = (): number => {
    const now = new Date();
    return now.getHours();
  };

  // Get minimum minute for today (only applies when selected hour is current hour)
  const getMinMinuteForToday = (): number => {
    const now = new Date();
    return now.getMinutes() + 1; // Next minute
  };

  // Check if selected preset date is today
  const selectedPresetIsToday = presetOptions.find(p => p.preset === selectedPreset)?.isToday ?? false;

  // Check if selected time is in the past (only for today presets)
  const isSelectedTimeInPast = (() => {
    if (!selectedPresetIsToday || selectedPreset === 'none') return false;

    const now = new Date();
    const [hours, minutes] = customTime.split(':').map(Number);
    const selectedDateTime = new Date();
    selectedDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    return selectedDateTime <= now;
  })();

  // Generate available hours based on whether it's today and AM/PM
  const getAvailableHours = (period: 'AM' | 'PM'): string[] => {
    const hours = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

    if (!selectedPresetIsToday) return hours;

    const minHour = getMinHourForToday();
    const isPM = period === 'PM';

    return hours.filter(h => {
      let hour24 = parseInt(h, 10);
      if (isPM && hour24 !== 12) hour24 += 12;
      if (!isPM && hour24 === 12) hour24 = 0;
      return hour24 >= minHour;
    });
  };

  // Generate available minutes based on whether it's today and selected hour is current hour
  const getAvailableMinutes = (): string[] => {
    const allMinutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    if (!selectedPresetIsToday) return allMinutes;

    // Convert current selection to 24h to compare with current hour
    let selectedHour24 = parseInt(timeComponents.hour, 10);
    if (timeComponents.period === 'PM' && selectedHour24 !== 12) selectedHour24 += 12;
    if (timeComponents.period === 'AM' && selectedHour24 === 12) selectedHour24 = 0;

    const currentHour = getMinHourForToday();

    // Only filter minutes if selected hour is current hour
    if (selectedHour24 === currentHour) {
      const minMinute = getMinMinuteForToday();
      return allMinutes.filter(m => parseInt(m, 10) >= minMinute);
    }

    return allMinutes;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-6 px-2 text-[11px] rounded-md flex items-center gap-1',
            'bg-gray-50 hover:bg-gray-100 transition-colors',
            // Active scheduled reminder
            hasReminder && reminderStatus === 'scheduled' && 'bg-amber-50 text-amber-600 hover:bg-amber-100',
            // Sent reminder - green
            reminderStatus === 'sent' && 'bg-green-50 text-green-600 hover:bg-green-100',
            // Expired reminder - gray/muted
            reminderStatus === 'expired' && 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          <BellSimple className="w-3 h-3" />
          <span>{getDisplayLabel()}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 z-[100]" align="start" sideOffset={5}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Reminder</span>
            {hasReminder && (
              <button
                type="button"
                onClick={() => {
                  onReminderChange(null, 'once');
                  setShowCustom(false);
                  setRepeatDaily(false);
                  setSelectedPreset('none');
                }}
                className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Status banner for sent/expired reminders */}
        {(reminderStatus === 'sent' || reminderStatus === 'expired') && (
          <div className={cn(
            'px-3 py-2 text-xs border-b',
            reminderStatus === 'sent' && 'bg-green-50 text-green-700 border-green-100',
            reminderStatus === 'expired' && 'bg-gray-50 text-gray-600 border-gray-100'
          )}>
            <div className="flex items-center justify-between">
              <span>
                {reminderStatus === 'sent' ? (
                  <>
                    Reminder sent
                    {lastReminderSentAt && (
                      <span className="text-[10px] ml-1 opacity-75">
                        ({format(parseISO(lastReminderSentAt), 'MMM d, h:mm a')})
                      </span>
                    )}
                  </>
                ) : (
                  'Reminder expired (time passed)'
                )}
              </span>
            </div>
            <p className="text-[10px] mt-1 opacity-75">
              {reminderStatus === 'sent'
                ? 'Set a new reminder below if needed.'
                : 'Clear and set a new reminder below.'}
            </p>
          </div>
        )}

        {/* Presets */}
        {!showCustom && (
          <div className="p-2 space-y-0.5">
            {/* No reminder */}
            <button
              type="button"
              onClick={() => handlePresetSelect('none')}
              className={cn(
                'w-full flex items-center px-2 py-1.5 rounded text-left text-xs transition-colors',
                selectedPreset === 'none' ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'
              )}
            >
              No reminder
            </button>

            {/* Preset options */}
            {presetOptions.map((opt) => (
              <button
                key={opt.preset}
                type="button"
                onClick={() => handlePresetSelect(opt.preset)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors',
                  selectedPreset === opt.preset ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-gray-400">{opt.sublabel}</span>
              </button>
            ))}

            {/* Message when all presets are in the past */}
            {allPresetsInPast && (
              <div className="px-2 py-2 text-[10px] text-gray-400 italic">
                All preset dates are in the past. Use custom date below.
              </div>
            )}

            {/* Custom option */}
            <button
              type="button"
              onClick={() => handlePresetSelect('custom')}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors',
                selectedPreset === 'custom' ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50 text-gray-700'
              )}
            >
              <CalendarBlank className="w-3.5 h-3.5 text-gray-400" />
              Custom date & time...
            </button>
          </div>
        )}

        {/* Time and Repeat settings - AFTER presets */}
        {dueDate && !showCustom && selectedPreset !== 'none' && (
          <div className="px-3 py-2 border-t border-gray-100 space-y-2">
            {/* Time selection with dropdowns */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-600">Reminder time</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Hour */}
                <Select
                  value={timeComponents.hour}
                  onValueChange={(hour) => {
                    const newTime = componentsToTime(hour, timeComponents.minute, timeComponents.period);
                    setCustomTime(newTime);
                  }}
                >
                  <SelectTrigger className="h-7 w-14 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {getAvailableHours(timeComponents.period).map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-gray-400">:</span>
                {/* Minute */}
                <Select
                  value={timeComponents.minute}
                  onValueChange={(minute) => {
                    const newTime = componentsToTime(timeComponents.hour, minute, timeComponents.period);
                    setCustomTime(newTime);
                  }}
                >
                  <SelectTrigger className="h-7 w-14 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200] max-h-48">
                    {getAvailableMinutes().map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* AM/PM */}
                <Select
                  value={timeComponents.period}
                  onValueChange={(period) => {
                    const newTime = componentsToTime(timeComponents.hour, timeComponents.minute, period as 'AM' | 'PM');
                    setCustomTime(newTime);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {/* Only show PM if it's today and current time is PM */}
                    {(!selectedPresetIsToday || getMinHourForToday() < 12) && (
                      <SelectItem value="AM" className="text-xs">AM</SelectItem>
                    )}
                    <SelectItem value="PM" className="text-xs">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Repeat daily */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellSimple className="w-3.5 h-3.5 text-gray-400" />
                <span className={cn("text-[11px]", isRepeatDailyDisabled ? "text-gray-400" : "text-gray-600")}>
                  Repeat daily{isRepeatDailyDisabled ? ' (N/A for day of)' : ''}
                </span>
              </div>
              <Switch
                checked={repeatDaily && !isRepeatDailyDisabled}
                onCheckedChange={(checked) => {
                  setRepeatDaily(checked);
                  if (reminderDate) {
                    onReminderChange(reminderDate, checked ? 'daily' : 'once');
                  }
                }}
                disabled={isRepeatDailyDisabled}
                className="scale-75"
              />
            </div>

            {/* Time in past warning */}
            {isSelectedTimeInPast && (
              <div className="text-[10px] text-red-500 text-center py-1">
                Selected time has passed. Please choose a future time.
              </div>
            )}

            {/* Save button */}
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handlePresetSave}
              disabled={isSelectedTimeInPast}
            >
              Set reminder
            </Button>
          </div>
        )}

        {/* Save button when no reminder selected */}
        {!showCustom && selectedPreset === 'none' && hasReminder && (
          <div className="px-3 py-2 border-t border-gray-100">
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handlePresetSave}
            >
              Clear reminder
            </Button>
          </div>
        )}

        {/* Custom date/time picker */}
        {showCustom && (
          <div className="p-3 space-y-3">
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="text-[10px] text-gray-400 hover:text-gray-600"
            >
              ← Back to presets
            </button>

            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Date</Label>
                <Input
                  type="date"
                  value={customDate}
                  min={todayStr}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    // If selecting today, update time to current time
                    if (e.target.value === todayStr) {
                      setCustomTime(getMinTimeForDate(new Date()));
                    } else {
                      setCustomTime('09:00');
                    }
                  }}
                  className="h-8 text-xs mt-1"
                />
              </div>

              {/* Time selection with dropdowns */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Time</Label>
                <div className="flex items-center gap-1">
                  {/* Hour */}
                  <Select
                    value={timeComponents.hour}
                    onValueChange={(hour) => {
                      const newTime = componentsToTime(hour, timeComponents.minute, timeComponents.period);
                      setCustomTime(newTime);
                    }}
                  >
                    <SelectTrigger className="h-7 w-14 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {(customDate === todayStr ? getAvailableHours(timeComponents.period) : ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']).map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-gray-400">:</span>
                  {/* Minute */}
                  <Select
                    value={timeComponents.minute}
                    onValueChange={(minute) => {
                      const newTime = componentsToTime(timeComponents.hour, minute, timeComponents.period);
                      setCustomTime(newTime);
                    }}
                  >
                    <SelectTrigger className="h-7 w-14 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200] max-h-48">
                      {(customDate === todayStr ? getAvailableMinutes() : Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))).map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* AM/PM */}
                  <Select
                    value={timeComponents.period}
                    onValueChange={(period) => {
                      const newTime = componentsToTime(timeComponents.hour, timeComponents.minute, period as 'AM' | 'PM');
                      setCustomTime(newTime);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {/* Only show PM if it's today and current time is PM */}
                      {(customDate !== todayStr || getMinHourForToday() < 12) && (
                        <SelectItem value="AM" className="text-xs">AM</SelectItem>
                      )}
                      <SelectItem value="PM" className="text-xs">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-600">Repeat daily until done</span>
                <Switch
                  checked={repeatDaily}
                  onCheckedChange={setRepeatDaily}
                  className="scale-75"
                />
              </div>
            </div>

            {/* Time in past warning for custom */}
            {customDate === todayStr && isSelectedTimeInPast && (
              <div className="text-[10px] text-red-500 text-center py-1">
                Selected time has passed. Please choose a future time.
              </div>
            )}

            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleCustomSave}
              disabled={!customDate || (customDate === todayStr && isSelectedTimeInPast)}
            >
              Set reminder
            </Button>
          </div>
        )}

      </PopoverContent>
    </Popover>
  );
}
