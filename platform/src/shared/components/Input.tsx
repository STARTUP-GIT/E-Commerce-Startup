import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'glass-input flex h-10 w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500/50 focus:border-red-500/60',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
