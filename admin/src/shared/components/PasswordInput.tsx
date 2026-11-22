"use client";

import React, { useState, forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  leftIcon?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, leftIcon, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/25">
            {leftIcon}
          </div>
        )}
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'glass-input flex h-10 w-full rounded-xl px-3 py-2 pr-10 text-sm text-white placeholder:text-white/25 outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            leftIcon && 'pl-11',
            error && 'border-red-500/50 focus:border-red-500/60',
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-30 cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
