"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface MonthPickerProps {
  /** Canonical value in YYYY-MM format, e.g. "2026-10" */
  value: string;
  /** Callback with updated YYYY-MM value and readable label */
  onChange: (value: string, displayLabel: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonthYearLabel(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const parts = yyyyMm.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return yyyyMm;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function MonthPicker({
  value,
  onChange,
  label = 'Period Month',
  hint,
  disabled = false,
  className = '',
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM into year and month (1-indexed)
  const { currentYear, currentMonth } = useMemo(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      return { currentYear: y, currentMonth: m };
    }
    const now = new Date();
    return { currentYear: now.getFullYear(), currentMonth: now.getMonth() + 1 };
  }, [value]);

  const [browsingYear, setBrowsingYear] = useState<number>(currentYear);

  useEffect(() => {
    setBrowsingYear(currentYear);
  }, [currentYear]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectMonth = (monthIndex: number) => {
    const formattedMonth = String(monthIndex + 1).padStart(2, '0');
    const newValue = `${browsingYear}-${formattedMonth}`;
    const newLabel = `${MONTH_NAMES[monthIndex]} ${browsingYear}`;
    onChange(newValue, newLabel);
    setIsOpen(false);
  };

  const setToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const formattedMonth = String(m).padStart(2, '0');
    const newValue = `${y}-${formattedMonth}`;
    const newLabel = `${MONTH_NAMES[m - 1]} ${y}`;
    setBrowsingYear(y);
    onChange(newValue, newLabel);
    setIsOpen(false);
  };

  const displayLabel = formatMonthYearLabel(value);

  return (
    <div className={`space-y-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-300 block">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-slate-800 border rounded-lg text-xs transition-colors cursor-pointer text-left ${
          isOpen ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-700 hover:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">{displayLabel || 'Select month...'}</span>
        </div>
        <span className="font-mono text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {value || 'YYYY-MM'}
        </span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in-0 duration-150">
          {/* Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setBrowsingYear((y) => y - 1)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-sm text-white font-mono">{browsingYear}</span>
            <button
              type="button"
              onClick={() => setBrowsingYear((y) => y + 1)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-1.5 py-3">
            {SHORT_MONTHS.map((mName, idx) => {
              const isSelected = browsingYear === currentYear && idx + 1 === currentMonth;
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => selectMonth(idx)}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {mName}
                  {isSelected && <Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={setToday}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Current Month
            </button>
            <span className="text-slate-500 font-mono">{value}</span>
          </div>
        </div>
      )}

      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
