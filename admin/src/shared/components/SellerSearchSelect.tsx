'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Search, X, User, MapPin, ShieldAlert, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
import { useLocationData } from '@/lib/hooks/useLocationData';

export interface SellerOption {
  id: string;
  name: string;
  email: string;
  username?: string;
  shopName: string | null;
  state?: string | null;
  district?: string | null;
  status?: string;
  isBanned?: boolean;
  strikeCount?: number;
}

export interface SellerSearchSelectProps {
  /** Called with the selected seller's ID and full record */
  onSelect: (sellerId: string, seller: SellerOption) => void;
  /** Called when the selection is cleared */
  onClear?: () => void;
  /** Currently selected seller (controlled mode) */
  selected?: SellerOption | null;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SellerSearchSelect({
  onSelect,
  onClear,
  selected,
  disabled = false,
  placeholder = 'Search seller by name, email, username, or shop...',
  autoFocus = false,
  className = '',
}: SellerSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SellerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Authoritative operational location data
  const { states, getDistrictsForState, isLoading: isLocationsLoading } = useLocationData({ operationalOnly: true });

  const availableDistricts = useMemo(() => {
    return getDistrictsForState(selectedState, true);
  }, [selectedState, getDistrictsForState]);

  // Handle cascading state selection
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict('');
    setPage(1);
  };

  // Search sellers effect with server-side pagination & location filtering
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const isUnassigned = selectedState === 'UNASSIGNED';
        const res = await axiosInstance.get('/api/admin/sellers/search', {
          params: {
            q: debouncedQuery.trim() || undefined,
            state: isUnassigned ? 'UNASSIGNED' : selectedState || undefined,
            district: !isUnassigned && selectedDistrict ? selectedDistrict : undefined,
            status: selectedStatus && selectedStatus !== 'ALL' ? selectedStatus : undefined,
            unassigned: isUnassigned ? true : undefined,
            page,
            limit: 10,
          },
        });
        if (!cancelled) {
          setResults(res.data?.sellers || []);
          setTotal(res.data?.total ?? (res.data?.sellers?.length || 0));
          setTotalPages(res.data?.pages || 1);
          setActiveIndex(-1);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Unable to load sellers. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedState, selectedDistrict, selectedStatus, page, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = useCallback((seller: SellerOption) => {
    onSelect(seller.id, seller);
    setOpen(false);
    setQuery('');
    setResults([]);
  }, [onSelect]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedStatus('');
    setResults([]);
    onClear?.();
  };

  const handleFocus = () => {
    if (!disabled) setOpen(true);
  };

  const handleResetFilters = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedStatus('');
    setPage(1);
  };

  // If a seller is already selected, show a clear and detailed card
  if (selected) {
    const locationDisplay =
      selected.state && selected.district
        ? `${selected.state} • ${selected.district}`
        : selected.state || selected.district || 'Location not set';

    const isBanned = selected.isBanned || selected.status === 'BANNED';
    const isDisabled = selected.status === 'DISABLED';

    return (
      <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 flex items-start gap-3.5 transition-all ${className}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white/95 truncate">
              {selected.shopName || selected.name}
            </p>
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Selected
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                isBanned
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : isDisabled
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'bg-white/10 text-white/80'
              }`}
            >
              {selected.status || (isBanned ? 'BANNED' : 'ACTIVE')}
            </span>
          </div>

          <p className="text-xs text-white/60 mt-0.5 truncate">
            {selected.name} {selected.username ? `(@${selected.username})` : ''} · <span className="text-white/40">{selected.email}</span>
          </p>

          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/50">
            <MapPin className="h-3 w-3 text-white/40 shrink-0" />
            <span className={selected.state ? 'text-white/70' : 'text-amber-400/80 italic'}>
              {locationDisplay}
            </span>
            {selected.strikeCount !== undefined && selected.strikeCount > 0 && (
              <span className="ml-2 text-rose-400 font-semibold flex items-center gap-1 text-[10px]">
                <ShieldAlert className="h-3 w-3" /> {selected.strikeCount} strike{selected.strikeCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-all shrink-0 cursor-pointer"
            aria-label="Clear selected seller"
            title="Change or clear seller"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  const hasFilterActive = Boolean(selectedState || selectedDistrict || selectedStatus || query);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
            if (!open) setOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.05] border border-white/10 text-xs sm:text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setPage(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-white/30 hover:text-white"
            aria-label="Clear search input"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown with Location & Status Filters + Results */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-2xl border border-white/15 bg-[#0d0d16] shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Filter Bar Header inside dropdown */}
          <div className="p-2.5 bg-white/[0.02] border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-purple-400" /> Filter Sellers by Location & Status
              </span>
              {hasFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* State Filter */}
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={isLocationsLoading}
                  className="w-full h-8 px-2.5 pr-7 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#0e0e14] text-white">All States</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.name} className="bg-[#0e0e14] text-white">
                      {s.name}
                    </option>
                  ))}
                  <option value="UNASSIGNED" className="bg-[#0e0e14] text-amber-300">
                    ⚠ Location not set
                  </option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
              </div>

              {/* District Filter (Cascading) */}
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setPage(1);
                  }}
                  disabled={isLocationsLoading || !selectedState || selectedState === 'UNASSIGNED'}
                  className="w-full h-8 px-2.5 pr-7 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer disabled:opacity-40"
                >
                  <option value="" className="bg-[#0e0e14] text-white">
                    {!selectedState
                      ? 'All Districts'
                      : selectedState === 'UNASSIGNED'
                      ? 'N/A (No Location)'
                      : `All in ${selectedState}`}
                  </option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.name} className="bg-[#0e0e14] text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-8 px-2.5 pr-7 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#0e0e14] text-white">All Statuses</option>
                  <option value="ACTIVE" className="bg-[#0e0e14] text-emerald-400">Active</option>
                  <option value="DISABLED" className="bg-[#0e0e14] text-amber-300">Disabled</option>
                  <option value="BANNED" className="bg-[#0e0e14] text-rose-400">Banned</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Results List */}
          <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
            {loading && (
              <div className="px-4 py-8 text-center text-xs text-white/40">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent mb-2" />
                <p>Searching sellers...</p>
              </div>
            )}

            {error && !loading && (
              <div className="px-4 py-6 text-center text-xs text-rose-400 space-y-1.5">
                <AlertCircle className="h-5 w-5 mx-auto text-rose-400/80" />
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setPage(page)}
                  className="text-[11px] text-white/60 hover:text-white underline pt-1"
                >
                  Retry search
                </button>
              </div>
            )}

            {!loading && !error && results.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-white/40 space-y-1">
                <p className="font-semibold text-white/60">No sellers matched the query.</p>
                <p className="text-[11px] text-white/30">
                  {selectedState
                    ? 'Try clearing the state/district filter or searching by another keyword.'
                    : 'Search by full name, shop name, username, or email.'}
                </p>
              </div>
            )}

            {!loading &&
              results.map((seller, idx) => {
                const isActive = idx === activeIndex;
                const isBanned = seller.isBanned || seller.status === 'BANNED';
                const isDisabled = seller.status === 'DISABLED';
                const locationLabel =
                  seller.state && seller.district
                    ? `${seller.state} • ${seller.district}`
                    : seller.state || seller.district || 'Location not set';

                return (
                  <button
                    key={seller.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(seller)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                      isActive ? 'bg-purple-500/15' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-white/50" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white/95 truncate">
                          {seller.shopName || seller.name}
                        </p>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isBanned
                              ? 'bg-rose-500/20 text-rose-400'
                              : isDisabled
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {seller.status || (isBanned ? 'BANNED' : 'ACTIVE')}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/60 truncate mt-0.5">
                        {seller.name} {seller.username ? `(@${seller.username})` : ''} · <span className="text-white/40">{seller.email}</span>
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                        <MapPin className="h-2.5 w-2.5 text-white/35 shrink-0" />
                        <span className={seller.state ? 'text-white/60 font-medium' : 'text-amber-400/80 italic'}>
                          {locationLabel}
                        </span>
                        {seller.strikeCount !== undefined && seller.strikeCount > 0 && (
                          <span className="ml-auto text-rose-400/90 font-bold flex items-center gap-0.5">
                            <ShieldAlert className="h-2.5 w-2.5" /> {seller.strikeCount} strike{seller.strikeCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Pagination Footer */}
          {!loading && results.length > 0 && totalPages > 1 && (
            <div className="px-3 py-2 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>
                Page {page} of {totalPages} ({total} total sellers)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
