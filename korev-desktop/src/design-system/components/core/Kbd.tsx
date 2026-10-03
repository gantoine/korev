import type { ReactNode } from 'react';
import { cn } from '../../cn';

export interface KbdProps {
  children?: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-xs border border-b-2 border-border-2 bg-raised px-1 font-mono text-[10.5px] leading-none font-normal text-fg-3',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
