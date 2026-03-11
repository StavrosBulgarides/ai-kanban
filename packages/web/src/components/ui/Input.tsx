import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors',
        'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
