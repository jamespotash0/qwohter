import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  displayText?: string; // Optional custom display text instead of formatted date
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
  displayText
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | undefined>();
  const [tempTime, setTempTime] = React.useState<string>("12:00");

  // Initialize temp values when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // When opening, set temp values from the confirmed date prop
      setTempDate(date);
      setTempTime(date ? format(date, "HH:mm") : "12:00");
    }
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setTempDate(undefined);
      return;
    }

    // Apply current time to the selected date
    const [hours, minutes] = tempTime.split(":").map(Number);
    newDate.setHours(hours as any, minutes, 0, 0);
    setTempDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTempTime(newTime);

    if (tempDate) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const updatedDate = new Date(tempDate);
      updatedDate.setHours(hours as any, minutes, 0, 0);
      setTempDate(updatedDate);
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDateChange(undefined);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal relative",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            displayText || format(date, "PPP 'at' p")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="p-3 border-t">
          <label className="text-sm font-medium mb-2 block">Time</label>
          <input
            type="time"
            value={tempTime}
            onChange={handleTimeChange}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div className="p-3 border-t flex gap-2">
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!tempDate}
          >
            {date ? "Update" : "Confirm"}
          </Button>
          {date && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDateChange(undefined);
                setIsOpen(false);
              }}
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
