'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Option {
  name: string;
  isEnabled: boolean;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  isLoading?: boolean;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  label,
  isLoading = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const idx = filteredOptions.findIndex((opt) => opt.name === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, search]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (name: string, isEnabled: boolean) => {
    if (!isEnabled) return;
    onChange(name);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        const selected = filteredOptions[activeIndex];
        if (selected) {
          handleSelect(selected.name, selected.isEnabled);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectedOption = options.find((opt) => opt.name === value);

  return (
    <div 
      className="space-y-1.5 relative w-full" 
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
        {label}
      </label>
      
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="searchable-dropdown-list"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 hover:bg-neutral-900/80 text-xs text-white focus:border-white/30 focus:outline-none transition-all cursor-pointer text-left font-medium select-none"
      >
        <span className={value ? 'text-white/90' : 'text-white/30'}>
          {value ? selectedOption?.name : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[60] left-0 w-full rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl backdrop-blur-2xl max-h-[260px] flex flex-col"
          >
            {/* Search Input */}
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/20" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white placeholder:text-white/25 focus:border-white/20 focus:outline-none transition-colors"
              />
            </div>

            {/* List */}
            <div 
              id="searchable-dropdown-list"
              role="listbox"
              ref={listRef}
              className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin"
            >
              {isLoading ? (
                <div className="px-3 py-2 text-xs text-white/30 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border border-white/20 border-t-white animate-spin" />
                  Loading...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-white/30 text-center">
                  No operational areas found.
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.name === value;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.name, opt.isEnabled)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-white/10 text-white font-semibold'
                          : isActive
                          ? 'bg-white/[0.04] text-white'
                          : 'text-white/70 hover:bg-white/[0.02] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className={`h-3.5 w-3.5 ${opt.isEnabled ? 'text-white/40' : 'text-white/20'}`} />
                        {opt.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {!opt.isEnabled && (
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            Coming Soon
                          </span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
