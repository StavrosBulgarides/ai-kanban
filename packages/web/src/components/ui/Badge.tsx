import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
  color?: string;
}

export function Badge({ className, variant = 'default', color, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        variant === 'outline' && 'border border-gray-300 dark:border-gray-700',
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40`, ...style } : style}
      {...props}
    />
  );
}
