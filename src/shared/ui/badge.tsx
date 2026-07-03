import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border border-line bg-surface-3 px-2.5 py-1 text-xs text-muted', className)}
      {...props}
    />
  );
}
