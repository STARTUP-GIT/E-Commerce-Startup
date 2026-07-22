import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarProps {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  className?: string;
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSameDay = (a: Date, b: number) =>
    a.getFullYear() === year && a.getMonth() === month && a.getDate() === b;

  const isToday = (d: number) => isSameDay(today, d);

  const isPast = (d: number) => {
    const dt = new Date(year, month, d, 0, 0, 0, 0);
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return dt < now;
  };

  const handleSelect = (day: number) => {
    const d = new Date(year, month, day);
    if (selected) {
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    onSelect?.(d);
  };

  const handleKeyDown = (e: React.KeyboardEvent, day: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(day);
    }
  };

  return (
    <div className={cn('p-3 select-none', className)}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white/90">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-white/25 py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => (
          <div key={i} className="flex items-center justify-center">
            {day !== null ? (
              <button
                type="button"
                onClick={() => handleSelect(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                disabled={isPast(day)}
                tabIndex={isPast(day) ? -1 : 0}
                className={cn(
                  'h-8 w-8 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50',
                  isPast(day) && 'text-white/10 cursor-not-allowed hover:bg-transparent',
                  !isPast(day) && !(selected && isSameDay(selected, day)) && 'text-white/60 hover:bg-white/10',
                  selected && isSameDay(selected, day) && 'bg-white text-black font-bold hover:bg-white/90',
                  isToday(day) && !(selected && isSameDay(selected, day)) && 'ring-1 ring-purple-400/40 text-purple-300'
                )}
              >
                {day}
              </button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
