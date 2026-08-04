import React from 'react';
import { cn } from '@/shared/utils/cn';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        {description && <p className="text-xs text-white/45 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-white' : 'bg-white/15'
      )}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full shadow-lg transition-transform',
          checked ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/70'
        )}
      />
    </button>
  );
}
