'use client';

import React, { useEffect, useRef, useState } from 'react';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Search, X, User } from 'lucide-react';

export interface SellerOption {
  id: string;
  name: string;
  email: string;
  shopName: string | null;
}

interface SellerSearchSelectProps {
  /** Called with the selected seller's ID (for backend submission) */
  onSelect: (sellerId: string, seller: SellerOption) => void;
  /** Called when the selection is cleared */
  onClear?: () => void;
  /** Currently selected seller (for controlled mode) */
  selected?: SellerOption | null;
  disabled?: boolean;
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
}: SellerSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SellerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Search sellers
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get('/api/admin/sellers/search', {
          params: { q: debouncedQuery },
        });
        if (!cancelled) setResults(res.data?.sellers || []);
      } catch {
        if (!cancelled) setError('Unable to load sellers. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [debouncedQuery, open]);

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

  const handleSelect = (seller: SellerOption) => {
    onSelect(seller.id, seller);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setResults([]);
    onClear?.();
  };

  const handleFocus = () => {
    if (!disabled) setOpen(true);
  };

  // If a seller is already selected, show a card
  if (selected) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 shrink-0 mt-0.5">
          <User className="h-4 w-4 text-white/50" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white/90 truncate">{selected.shopName || selected.name}</p>
          <p className="text-[11px] text-white/45 truncate">{selected.name} · {selected.email}</p>
          <span className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            Selected
          </span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/[0.07] transition-all shrink-0"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search seller by email, name, or shop…"
          disabled={disabled}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-56 rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-xs text-white/40 text-center">
              Searching…
            </div>
          )}
          {error && !loading && (
            <div className="px-4 py-3 text-xs text-red-400 text-center">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-white/30 text-center">
              {query ? 'No sellers found.' : 'Start typing to search sellers…'}
            </div>
          )}
          {!loading && results.map((seller) => (
            <button
              key={seller.id}
              type="button"
              onClick={() => handleSelect(seller)}
              className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-white/40" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white/90 truncate">
                  {seller.shopName || seller.name}
                </p>
                <p className="text-[10px] text-white/40 truncate">{seller.name}</p>
                <p className="text-[10px] text-white/35 truncate">{seller.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
