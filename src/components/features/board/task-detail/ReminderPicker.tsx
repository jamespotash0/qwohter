/**
 * ReminderPicker Component
 *
 * A popover-based reminder picker with preset options and custom date/time selection.
 */

import { useState, useMemo, useEffect } from 'react';
import { format, subDays, setHours, setMinutes, parseISO, isValid, isBefore, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { BellSimple, BellRinging, CalendarBlank, Clock, X, CheckCircle, Check, Warning, Info } from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ReminderPreset, ScheduledNotificationRecurrence } from '@/lib/types/scheduledNotifications';

// Alias for cleaner code
type ReminderRecurrence = ScheduledNotificationRecurrence;

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
  const [selectedRecurrence, setSelectedRecurrence] = useState<ReminderRecurrence>(reminderRecurrence);
  const [selectedPreset, setSelectedPreset] = useState<ReminderPreset>('none');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Sync selectedRecurrence when prop changes
  useEffect(() => {
    setSelectedRecurrence(reminderRecurrence);
  }, [reminderRecurrence]);

  // Reset to fresh state when popover opens (don't try to match saved reminder)
  useEffect(() => {
    if (isOpen) {
      // Start fresh - default to 'none' selected and 9:00 AM time
      setSelectedPreset('none');
      setSelectedRecurrence('Once');
      setCustomTime('09:00');
      setShowCustom(false);
      setCustomDate('');
      setShowCancelConfirm(false);
    }
  }, [isOpen]);

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
    if (reminderRecurrence === 'Once' && reminderSent) {
      return 'sent';
    }

    // For daily reminders: check last_reminder_sent_at for today
    if (reminderRecurrence === 'Daily' && lastReminderSentAt) {
      const lastSent = parseISO(lastReminderSentAt);
      if (isValid(lastSent) && isToday(lastSent)) {
        return 'sent'; // Already sent today
      }
    }

    // Check if reminder time has passed (for one-time reminders)
    if (reminderRecurrence === 'Once' && isBefore(currentReminder, new Date())) {
      return 'expired';
    }

    return 'scheduled';
  }, [currentReminder, reminderSent, reminderRecurrence, lastReminderSentAt]);

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
      // Reset recurrence to 'Once' only for day_of (no days left to repeat)
      // For 1_day, daily is valid (fires day before + day of)
      if (preset === 'day_of') {
        setSelectedRecurrence('Once');
      }
      // Reset weekly to daily for presets with < 7 days
      if ((preset === '1_day' || preset === '2_days') && selectedRecurrence === 'Weekly') {
        setSelectedRecurrence('Daily');
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
      onReminderChange(null, 'Once');
      setSelectedRecurrence('Once');
    } else {
      const newReminderDate = calculateReminderDate(selectedPreset, customTime || '09:00');
      // For presets with limited days, force 'Once'
      const recurrence = (selectedPreset === 'day_of' || selectedPreset === '1_day') ? 'Once' : selectedRecurrence;
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

    onReminderChange(targetDate.toISOString(), selectedRecurrence);
    setShowCustom(false);
    setIsOpen(false);
  };

  // Get display label - always shows the SAVED reminder, not preview
  const getDisplayLabel = (): string => {
    // Show status for sent/expired reminders
    if (reminderStatus === 'sent') {
      if (lastReminderSentAt) {
        const sentDate = parseISO(lastReminderSentAt);
        if (isValid(sentDate)) {
          return `Sent ${format(sentDate, 'MMM d, h:mm a')}`;
        }
      }
      return 'Sent';
    }

    if (reminderStatus === 'expired') {
      return 'Expired';
    }

    // Show "Scheduled" status for active reminders
    if (reminderStatus === 'scheduled' && currentReminder) {
      const dateStr = format(currentReminder, 'MMM d');
      const timeStr = format(currentReminder, 'h:mm a');
      if (reminderRecurrence === 'Daily') {
        return `Daily from ${dateStr}, ${timeStr}`;
      }
      if (reminderRecurrence === 'Weekly') {
        return `Weekly from ${dateStr}, ${timeStr}`;
      }
      return `${dateStr}, ${timeStr}`;
    }

    // No reminder set
    return 'No reminder';
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

  // Determine available recurrence options based on days until due date
  const getAvailableRecurrenceOptions = (forCustomDate?: string): ReminderRecurrence[] => {
    // For presets
    if (!forCustomDate) {
      // For day_of preset, only 'Once' makes sense (no days left to repeat)
      if (selectedPreset === 'day_of') {
        return ['Once'];
      }

      // For 1_day preset, 'Once' or 'Daily' (fires day before + day of = 2 days)
      if (selectedPreset === '1_day') {
        return ['Once', 'Daily'];
      }

      // For 2_days preset, 'Once' and 'Daily' (weekly doesn't make sense for 3 days)
      if (selectedPreset === '2_days') {
        return ['Once', 'Daily'];
      }

      // For 1_week or custom, all options available
      return ['Once', 'Daily', 'Weekly'];
    }

    // For custom date - calculate days until due date
    // If no custom date selected yet, show all options
    if (!forCustomDate) {
      return ['Once', 'Daily', 'Weekly'];
    }

    // If no due date, all options available (no end date for recurrence)
    if (!dueDate) {
      return ['Once', 'Daily', 'Weekly'];
    }

    const customDateObj = parseLocalDate(forCustomDate);
    const dueDateObj = parseLocalDate(dueDate);
    const daysUntilDue = differenceInDays(dueDateObj, customDateObj);

    if (daysUntilDue <= 0) {
      return ['Once']; // Same day or past due
    }
    if (daysUntilDue === 1) {
      return ['Once']; // Only 1 day, no repeat needed
    }
    if (daysUntilDue < 7) {
      return ['Once', 'Daily']; // Less than a week, daily makes sense
    }
    return ['Once', 'Daily', 'Weekly']; // Week or more, all options
  };

  const availableRecurrenceOptions = getAvailableRecurrenceOptions();
  const showRecurrenceDropdown = availableRecurrenceOptions.length > 1;

  // Calculate recurrence options for custom date based on days until due
  const getCustomRecurrenceOptions = (): ReminderRecurrence[] => {
    // No custom date yet - show all options
    if (!customDate) {
      return ['Once', 'Daily', 'Weekly'];
    }

    // No due date on task - show all options (no end constraint)
    if (!dueDate) {
      return ['Once', 'Daily', 'Weekly'];
    }

    const customDateObj = parseLocalDate(customDate);
    const dueDateObj = parseLocalDate(dueDate);
    const daysUntilDue = differenceInDays(dueDateObj, customDateObj);

    if (daysUntilDue <= 0) {
      return ['Once']; // Same day or past - no point repeating
    }
    if (daysUntilDue < 7) {
      return ['Once', 'Daily']; // 1-6 days - daily ok (fires on reminder day + remaining days until due)
    }
    return ['Once', 'Daily', 'Weekly']; // Week or more - all options
  };

  const customRecurrenceOptions = getCustomRecurrenceOptions();
  const showCustomRecurrenceDropdown = customRecurrenceOptions.length > 1;

  // Generate preview text for reminder
  const getPreviewText = (dateStr: string, time: string, recurrence: ReminderRecurrence): string => {
    const dateObj = parseLocalDate(dateStr);
    const timeParts = time.split(':').map(Number);
    const hours = timeParts[0] ?? 9;
    const minutes = timeParts[1] ?? 0;
    const dateWithTime = setMinutes(setHours(dateObj, hours), minutes);

    const formattedDate = format(dateWithTime, 'MMM d');
    const formattedTime = format(dateWithTime, 'h:mm a');
    const dayIndicator = isToday(dateObj) ? ' (Today)' : isTomorrow(dateObj) ? ' (Tomorrow)' : '';

    if (recurrence === 'Daily') {
      return `${formattedDate}${dayIndicator}, ${formattedTime} - Daily until due`;
    }
    if (recurrence === 'Weekly') {
      return `${formattedDate}${dayIndicator}, ${formattedTime} - Weekly until due`;
    }
    return `${formattedDate}${dayIndicator}, ${formattedTime} - Once`;
  };

  // Get preview date for current preset selection
  const getPresetPreviewDate = (): string | null => {
    if (selectedPreset === 'none' || selectedPreset === 'custom') return null;
    const presetOption = allPresetOptions.find(p => p.preset === selectedPreset);
    if (!presetOption) return null;
    return format(presetOption.date, 'yyyy-MM-dd');
  };

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
            // Active scheduled reminder - amber with bell ringing
            hasReminder && reminderStatus === 'scheduled' && 'bg-amber-50 text-amber-600 hover:bg-amber-100',
            // Sent reminder - green with check
            reminderStatus === 'sent' && 'bg-green-50 text-green-600 hover:bg-green-100',
            // Expired reminder - muted with warning
            reminderStatus === 'expired' && 'bg-orange-50 text-orange-500 hover:bg-orange-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          {reminderStatus === 'sent' ? (
            <CheckCircle className="w-3 h-3" weight="fill" />
          ) : reminderStatus === 'expired' ? (
            <Warning className="w-3 h-3" weight="fill" />
          ) : reminderStatus === 'scheduled' ? (
            <BellRinging className="w-3 h-3" weight="fill" />
          ) : (
            <BellSimple className="w-3 h-3" />
          )}
          <span>{getDisplayLabel()}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 z-[100]" align="start" sideOffset={5}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-700">Reminder</span>
              {dueDate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] text-xs">
                      Reminders are based on the task's due date. To change available reminder dates, update the due date.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {hasReminder && !showCancelConfirm && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
          {/* Cancel confirmation - inline */}
          {showCancelConfirm && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-red-600">Cancel this reminder?</span>
              <button
                type="button"
                onClick={() => {
                  onReminderChange(null, 'Once');
                  setShowCustom(false);
                  setSelectedRecurrence('Once');
                  setSelectedPreset('none');
                  setShowCancelConfirm(false);
                  setIsOpen(false);
                }}
                className="p-0.5 rounded border border-gray-200 text-red-500 hover:text-red-700 hover:border-red-200 transition-colors"
                title="Yes, cancel reminder"
              >
                <Check className="w-3 h-3" weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="p-0.5 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                title="No, keep reminder"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
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

            {/* Clear reminder button - only when no option selected and reminder exists */}
            {selectedPreset === 'none' && hasReminder && !showCancelConfirm && (
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Clear reminder
                </Button>
              </div>
            )}
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

            {/* Recurrence dropdown - only show when options available */}
            {showRecurrenceDropdown && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <BellSimple className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-600">Repeat</span>
                </div>
                <Select
                  value={selectedRecurrence}
                  onValueChange={(value: ReminderRecurrence) => {
                    setSelectedRecurrence(value);
                  }}
                >
                  <SelectTrigger className="h-7 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {availableRecurrenceOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option === 'Once' ? 'Once (no repeat)' : option === 'Daily' ? 'Daily until due' : 'Weekly until due'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time in past warning */}
            {isSelectedTimeInPast && (
              <div className="text-[10px] text-red-500 text-center py-1">
                Selected time has passed. Please choose a future time.
              </div>
            )}

            {/* Preview box */}
            {getPresetPreviewDate() && !isSelectedTimeInPast && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <BellRinging className="w-3.5 h-3.5 text-amber-600" weight="fill" />
                  <span className="text-[11px] font-medium text-amber-700">
                    {getPreviewText(getPresetPreviewDate()!, customTime, selectedRecurrence)}
                  </span>
                </div>
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

        {/* Custom date/time picker */}
        {showCustom && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Custom Date</span>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                ← Presets
              </button>
            </div>

            <div className="space-y-2">
              <Input
                type="date"
                value={customDate}
                min={todayStr}
                max={dueDate || undefined}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setCustomDate(newDate);
                  // If selecting today, update time to current time
                  if (newDate === todayStr) {
                    setCustomTime(getMinTimeForDate(new Date()));
                  } else {
                    setCustomTime('09:00');
                  }
                  // Reset recurrence if current selection is no longer valid for new date
                  if (dueDate && newDate) {
                    const newDateObj = parseLocalDate(newDate);
                    const dueDateObj = parseLocalDate(dueDate);
                    const daysUntilDue = differenceInDays(dueDateObj, newDateObj);
                    // If less than 7 days and weekly selected, reset to daily or once
                    if (daysUntilDue < 7 && selectedRecurrence === 'Weekly') {
                      setSelectedRecurrence(daysUntilDue > 0 ? 'Daily' : 'Once');
                    }
                    // If same day or past and daily selected, reset to once
                    if (daysUntilDue <= 0 && selectedRecurrence !== 'Once') {
                      setSelectedRecurrence('Once');
                    }
                  }
                }}
                className="h-7 text-xs"
              />

              {/* Time selection with dropdowns */}
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

              {/* Recurrence dropdown for custom date - only show when options available */}
              {showCustomRecurrenceDropdown && (
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-600">Repeat</span>
                  <Select
                    value={selectedRecurrence}
                    onValueChange={(value: ReminderRecurrence) => {
                      setSelectedRecurrence(value);
                    }}
                  >
                    <SelectTrigger className="h-7 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {customRecurrenceOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {option === 'Once' ? 'Once (no repeat)' : option === 'Daily' ? 'Daily until due' : 'Weekly until due'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Time in past warning for custom */}
            {customDate === todayStr && isSelectedTimeInPast && (
              <div className="text-[10px] text-red-500 text-center py-1">
                Selected time has passed. Please choose a future time.
              </div>
            )}

            {/* Preview box for custom */}
            {customDate && !(customDate === todayStr && isSelectedTimeInPast) && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <BellRinging className="w-3.5 h-3.5 text-amber-600" weight="fill" />
                  <span className="text-[11px] font-medium text-amber-700">
                    {getPreviewText(customDate, customTime, selectedRecurrence)}
                  </span>
                </div>
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
