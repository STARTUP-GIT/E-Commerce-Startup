import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'gradient-btn text-white',
        secondary: 'glass-input text-white/80 hover:text-white/95 hover:border-white/20',
        outline: 'glass-input text-white/70 hover:text-white/95 hover:border-white/20',
        ghost: 'text-white/60 hover:text-white/95 hover:bg-white/[0.07]',
        link: 'text-purple-400 underline-offset-4 hover:underline hover:text-purple-300',
        destructive: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
