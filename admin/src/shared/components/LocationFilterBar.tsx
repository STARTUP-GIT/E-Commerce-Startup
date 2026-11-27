'use client';

import React, { useMemo, useState } from 'react';
import { Search, MapPin, X, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { useLocationData } from '@/lib/hooks/useLocationData';

export interface LocationFilterBarProps {
  // Search
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  // Location
  state: string;
  onStateChange: (state: string) => void;
  district: string;
  onDistrictChange: (district: string) => void;
  showLocationNotSetOption?: boolean;

  // Status Filter
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: Array<{ label: string; value: string }>;

  // Extra filter controls (e.g. category, date range, payment method)
  extraFilters?: React.ReactNode;

  // Clear handler
  onClearAll: () => void;

  // Operational toggle
  operationalOnly?: boolean;

  className?: string;
}

export function LocationFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  state,
  onStateChange,
  district,
  onDistrictChange,
  showLocationNotSetOption = true,
  status,
  onStatusChange,
  statusOptions,
  extraFilters,
  onClearAll,
  operationalOnly = true,
  className = '',
}: LocationFilterBarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { states, getDistrictsForState, isLoading } = useLocationData({ operationalOnly });

  const availableDistricts = useMemo(() => {
    return getDistrictsForState(state, operationalOnly);
  }, [state, getDistrictsForState, operationalOnly]);

  const handleStateChange = (newState: string) => {
    onStateChange(newState);
    // Cascading reset: changing state resets district
    if (district) {
      onDistrictChange('');
    }
  };

  const hasActiveFilters = Boolean(
    (search && search.trim().length > 0) ||
    state ||
    district ||
    (status && status !== 'ALL' && status !== '')
  );

  const activeFilterCount = [
    Boolean(search && search.trim().length > 0),
    Boolean(state),
    Boolean(district),
    Boolean(status && status !== 'ALL' && status !== ''),
  ].filter(Boolean).length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        {/* Search Input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-white/30 hover:text-white/70"
                aria-label="Clear search text"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Mobile Filter Toggle Button */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="flex-1 h-9 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-white/80 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-white/40" />
              Location & Status Filters
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${mobileExpanded ? 'rotate-180' : ''}`} />
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-9 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        {/* Desktop Filter Row */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {/* State Filter */}
          <div className="relative min-w-[140px]">
            <select
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              disabled={isLoading}
              className="w-full h-10 px-3 pr-8 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0e0e14] text-white">All Locations (State)</option>
              {states.map((s) => (
                <option key={s.id} value={s.name} className="bg-[#0e0e14] text-white">
                  {s.name}
                </option>
              ))}
              {showLocationNotSetOption && (
                <option value="UNASSIGNED" className="bg-[#0e0e14] text-amber-300">
                  âš  Location not set
                </option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
          </div>

          {/* Cascading District Filter */}
          <div className="relative min-w-[150px]">
            <select
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              disabled={isLoading || !state || state === 'UNASSIGNED'}
              className="w-full h-10 px-3 pr-8 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="" className="bg-[#0e0e14] text-white">
                {!state
                  ? 'All Districts'
                  : state === 'UNASSIGNED'
                  ? 'N/A (No Location)'
                  : `All in ${state}`}
              </option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.name} className="bg-[#0e0e14] text-white">
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
          </div>

          {/* Status Filter */}
          {statusOptions && onStatusChange && (
            <div className="relative min-w-[130px]">
              <select
                value={status ?? ''}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full h-10 px-3 pr-8 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white font-medium focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0e0e14] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            </div>
          )}

          {/* Extra Custom Filters (if any) */}
          {extraFilters}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-white/70 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Clear all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Collapsible Panel */}
      {mobileExpanded && (
        <div className="sm:hidden p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 animate-in fade-in-50">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">State</label>
            <div className="relative">
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={isLoading}
                className="w-full h-9 px-3 pr-8 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white appearance-none"
              >
                <option value="" className="bg-[#0e0e14] text-white">All Locations (State)</option>
                {states.map((s) => (
                  <option key={s.id} value={s.name} className="bg-[#0e0e14] text-white">
                    {s.name}
                  </option>
                ))}
                {showLocationNotSetOption && (
                  <option value="UNASSIGNED" className="bg-[#0e0e14] text-amber-300">
                    âš  Location not set
                  </option>
                )}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">District</label>
            <div className="relative">
              <select
                value={district}
                onChange={(e) => onDistrictChange(e.target.value)}
                disabled={isLoading || !state || state === 'UNASSIGNED'}
                className="w-full h-9 px-3 pr-8 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white appearance-none disabled:opacity-40"
              >
                <option value="" className="bg-[#0e0e14] text-white">
                  {!state ? 'All Districts' : state === 'UNASSIGNED' ? 'N/A (No Location)' : `All in ${state}`}
                </option>
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.name} className="bg-[#0e0e14] text-white">
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
            </div>
          </div>

          {statusOptions && onStatusChange && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">Status</label>
              <div className="relative">
                <select
                  value={status ?? ''}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full h-9 px-3 pr-8 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white appearance-none"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0e0e14] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          )}

          {extraFilters && <div>{extraFilters}</div>}
        </div>
      )}

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] uppercase font-bold text-white/35 mr-1">Active Filters:</span>
          {search && search.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] text-white/80">
              Query: &quot;{search}&quot;
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="hover:text-red-400 transition-colors"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {state && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-400">
              <MapPin className="h-2.5 w-2.5" />
              {state === 'UNASSIGNED' ? 'Location: Not Set' : `State: ${state}`}
              <button
                type="button"
                onClick={() => handleStateChange('')}
                className="hover:text-red-400 transition-colors"
                aria-label="Remove state filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {district && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-400">
              District: {district}
              <button
                type="button"
                onClick={() => onDistrictChange('')}
                className="hover:text-red-400 transition-colors"
                aria-label="Remove district filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {status && status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
              Status: {status}
              <button
                type="button"
                onClick={() => onStatusChange?.('ALL')}
                className="hover:text-red-400 transition-colors"
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
