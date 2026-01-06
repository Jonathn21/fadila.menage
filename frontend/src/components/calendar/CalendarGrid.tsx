import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isWeekend, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import CalendarEvent, { CalendarEventData } from "./CalendarEvent";

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
  onEventCancel?: (event: CalendarEventData) => void;
  canCancelEvent?: (event: CalendarEventData) => boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentDate, 
  events, 
  onEventClick,
  onEventCancel,
  canCancelEvent 
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the weekday names (without weekends)
  const weekdayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  
  // Filter weekdays only
  const weekdays = days.filter(day => !isWeekend(day));
  
  // Create proper week structure
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  
  // Find the first weekday of the month
  const firstWeekday = weekdays[0];
  
  if (firstWeekday) {
    const firstWeekdayOfWeek = getDay(firstWeekday);
    
    // Calculate empty cells needed at the beginning
    const emptyStartCells = firstWeekdayOfWeek === 0 ? 0 : firstWeekdayOfWeek - 1;
    
    // Add empty cells at the beginning
    for (let i = 0; i < emptyStartCells; i++) {
      currentWeek.push(null);
    }
  }
  
  // Add all weekdays
  weekdays.forEach(day => {
    currentWeek.push(day);
    
    // If we have 5 days (Monday to Friday), start a new week
    if (currentWeek.length === 5) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  // Add the last partial week if it exists
  if (currentWeek.length > 0) {
    // Fill remaining cells with null to complete the week
    while (currentWeek.length < 5) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const CalendarCell: React.FC<{ date: Date }> = ({ date }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: format(date, "yyyy-MM-dd"),
      data: { date },
    });

    const dayEvents = events.filter(event => 
      isSameDay(event.date, date)
    );

    return (
      <div
        ref={setNodeRef}
        className={`min-h-[120px] p-2 border rounded-md bg-card ${
          isOver ? 'border-primary bg-primary/5' : 'border-border'
        } ${isSameDay(date, new Date()) ? 'border-primary/50 bg-primary/5' : ''}`}
      >
        <div className="text-right text-sm font-medium mb-2">
          {format(date, "d")}
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[calc(120px-40px)]">
          {dayEvents.map((event) => (
            <CalendarEvent
              key={event.id}
              event={event}
              onClick={onEventClick}
              onCancel={onEventCancel}
              canCancel={canCancelEvent ? canCancelEvent(event) : false}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Header with weekday names */}
      <div className="grid grid-cols-5 gap-1">
        {weekdayNames.map((day) => (
          <div key={day} className="text-center py-2 font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-5 gap-1">
          {weekdayNames.map((_, dayIndex) => {
            const day = week[dayIndex];
            return day ? (
              <CalendarCell key={format(day, "yyyy-MM-dd")} date={day} />
            ) : (
              <div key={`empty-${dayIndex}`} className="min-h-[120px]" />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CalendarGrid;