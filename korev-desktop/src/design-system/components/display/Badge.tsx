import type { ReactNode } from 'react';
import { cn } from '../../cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  count?: boolean;
  outline?: boolean;
  children?: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-active text-fg-2',
  accent: 'bg-accent-subtle text-accent-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
};

const OUTLINE = 'bg-transparent shadow-[inset_0_0_0_1px_var(--border-2)]';
const COUNT =
  'h-[17px] min-w-[17px] justify-center rounded-full px-[5px] font-mono text-[10.5px]';

export function Badge({
  tone = 'neutral',
  dot = false,
  count = false,
  outline = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-[5px] rounded-xs px-[7px] font-sans text-2xs leading-none font-medium tracking-[0.01em] whitespace-nowrap',
        TONES[tone],
        count && COUNT,
        outline && OUTLINE,
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
