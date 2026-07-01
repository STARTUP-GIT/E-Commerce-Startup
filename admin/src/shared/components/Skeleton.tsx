import React from 'react';
import { cn } from '@/shared/utils/cn';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('skeleton-glass', className)}
      {...props}
    />
  );
}

export { Skeleton };
