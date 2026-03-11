import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  none: 'bg-gray-400',
};

export const PRIORITY_TEXT: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-yellow-600',
  low: 'text-blue-600',
  none: 'text-gray-500',
};
