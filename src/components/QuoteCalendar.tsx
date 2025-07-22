import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface Quote {
  id: string;
  name: string;
  createdDate: string;
  totalCost: number;
  status: string;
}

interface QuoteCalendarProps {
  quotes: Quote[];
  onDateClick?: (date: string) => void;
}

const QuoteCalendar = ({ quotes, onDateClick }: QuoteCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = firstDay.getDay(); // 0 = Sunday
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Get quotes for specific date
  const getQuotesForDate = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return quotes.filter(quote => quote.createdDate === dateString);
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };
  
  const handleDateClick = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateClick?.(dateString);
  };
  
  // Create calendar grid
  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startDate; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayQuotes = getQuotesForDate(day);
    const hasQuotes = dayQuotes.length > 0;
    const isCurrentDay = isToday(day);
    
    calendarDays.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={`
          h-10 w-full flex items-center justify-center text-sm font-medium relative
          rounded-lg transition-all duration-200 hover:bg-blue-50
          ${isCurrentDay 
            ? 'bg-primary text-primary-foreground shadow-md' 
            : hasQuotes 
              ? 'bg-accent/20 text-accent-foreground border border-accent/30' 
              : 'text-slate-700 hover:text-primary'
          }
        `}
      >
        {day}
        {hasQuotes && !isCurrentDay && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
          </div>
        )}
        {hasQuotes && dayQuotes.length > 1 && (
          <div className="absolute top-1 right-1">
            <div className="text-xs bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {dayQuotes.length}
            </div>
          </div>
        )}
      </button>
    );
  }
  
  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Quote Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-500">{day}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2 border-t">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Has Quotes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteCalendar;