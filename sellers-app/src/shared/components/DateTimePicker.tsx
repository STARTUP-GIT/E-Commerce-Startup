import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Calendar } from './Calendar';
import { cn } from '@/shared/utils/cn';

interface DateTimePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const PRESETS = [
  { id: '30min', label: '30 Min' },
  { id: '1hr', label: '1 Hour' },
  { id: '2hr', label: '2 Hours' },
  { id: 'tomorrow', label: 'Tomorrow AM' },
  { id: 'custom', label: 'Custom' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

function addMinutes(date: Date, mins: number): Date {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

function getPresetDate(id: PresetId): Date {
  const now = new Date();
  switch (id) {
    case '30min':
      return addMinutes(now, 30);
    case '1hr':
      return addMinutes(now, 60);
    case '2hr':
      return addMinutes(now, 120);
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    default:
      return now;
  }
}

function formatPreview(date: Date | null): string {
  if (!date) return 'Select a preset or choose a custom date & time...';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = dayNames[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mon = monthNames[date.getMonth()];
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const mm = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `Ready on ${dayName}, ${dd} ${mon} ${yyyy} at ${hours}:${mm} ${period}`;
}

function formatDisplayDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function to12Hour(h: number): { hour12: number; period: 'AM' | 'PM' } {
  const period = h >= 12 ? 'PM' : 'AM';
  return { hour12: h % 12 || 12, period };
}

function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'PM') return hour12 === 12 ? 12 : hour12 + 12;
  return hour12 === 12 ? 0 : hour12;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetId | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });

  const syncTimeFrom = useCallback((date: Date) => {
    const { hour12: h, period: p } = to12Hour(date.getHours());
    setHour12(h);
    setMinute(date.getMinutes());
    setPeriod(p);
  }, []);

  const buildDate = useCallback(
    (date: Date, h: number, m: number, p: 'AM' | 'PM') => {
      const d = new Date(date);
      d.setHours(to24Hour(h, p), m, 0, 0);
      return d;
    },
    []
  );

  const handlePresetClick = (id: PresetId) => {
    setActivePreset(id);
    if (id !== 'custom') {
      const dt = getPresetDate(id);
      onChange(dt);
      syncTimeFrom(dt);
    }
  };

  const handleCalendarSelect = (date: Date) => {
    onChange(buildDate(date, hour12, minute, period));
    setCalendarOpen(false);
  };

  const handleTimeChange = (h: number, m: number, p: 'AM' | 'PM') => {
    setHour12(h);
    setMinute(m);
    setPeriod(p);
    if (value) onChange(buildDate(value, h, m, p));
  };

  const toggleCalendar = () => {
    if (!calendarOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCalendarPos({ top: rect.bottom + 8, left: rect.left });
    }
    setCalendarOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setCalendarOpen(false);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalendarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [calendarOpen]);

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/15">
        <p
          className={cn(
            'text-sm font-semibold text-center transition-colors duration-200',
            value ? 'text-purple-300' : 'text-white/25'
          )}
        >
          {formatPreview(value)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50',
              activePreset === preset.id
                ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-white/[0.04] text-white/55 border-white/10 hover:bg-white/[0.08] hover:text-white/80 hover:border-white/20'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {activePreset === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
                  Date
                </label>
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={toggleCalendar}
                  className={cn(
                    'flex items-center gap-2.5 w-full h-10 rounded-xl px-3 py-2 text-sm cursor-pointer',
                    'glass-input text-left transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50',
                    value ? 'text-white/90' : 'text-white/25'
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-white/35 shrink-0" />
                  <span className="flex-1">{value ? formatDisplayDate(value) : 'Pick a date...'}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-white/25 transition-transform duration-200',
                      calendarOpen && 'rotate-180'
                    )}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider">
                  Time
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={hour12}
                      onChange={(e) => handleTimeChange(Number(e.target.value), minute, period)}
                      className="flex h-10 w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm glass-input text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 cursor-pointer"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h} className="bg-[#0a0a0f] text-white">
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
                  </div>

                  <span className="text-white/20 text-lg font-light select-none">:</span>

                  <div className="relative flex-1">
                    <select
                      value={minute}
                      onChange={(e) => handleTimeChange(hour12, Number(e.target.value), period)}
                      className="flex h-10 w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm glass-input text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 cursor-pointer"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m} className="bg-[#0a0a0f] text-white">
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
                  </div>

                  <div className="relative w-20">
                    <select
                      value={period}
                      onChange={(e) => handleTimeChange(hour12, minute, e.target.value as 'AM' | 'PM')}
                      className="flex h-10 w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm glass-input text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 cursor-pointer"
                    >
                      <option value="AM" className="bg-[#0a0a0f] text-white">
                        AM
                      </option>
                      <option value="PM" className="bg-[#0a0a0f] text-white">
                        PM
                      </option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {calendarOpen &&
        createPortal(
          <div
            ref={calendarRef}
            style={{ position: 'fixed', top: calendarPos.top, left: calendarPos.left, zIndex: 9999 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="glass rounded-xl shadow-2xl border border-white/10 mt-1"
            >
              <Calendar selected={value} onSelect={handleCalendarSelect} />
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
