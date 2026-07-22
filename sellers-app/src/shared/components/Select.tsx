import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder, className, disabled }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm cursor-pointer',
          'glass-input',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value ? 'text-white/90' : 'text-white/25'
        )}
      >
        {placeholder && (
          <option value="" disabled className="bg-[#0a0a0f] text-white/40">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0a0a0f] text-white/90">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
    </div>
  );
}
