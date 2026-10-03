import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['2xs', 'code'],
      shadow: ['1', 'pop', 'overlay', 'inset-top', 'focus', 'halo'],
      spacing: [
        'control-sm',
        'control-md',
        'control-lg',
        'sidebar',
        'topbar',
        'panel',
        'content',
      ],
    },
  },
});

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
