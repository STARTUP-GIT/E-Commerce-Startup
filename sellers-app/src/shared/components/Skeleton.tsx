import { cn } from '@/shared/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
}

function Skeleton({ className, variant = 'glass', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        variant === 'glass'
          ? 'skeleton-glass rounded-lg'
          : 'animate-pulse rounded-md bg-white/5',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
