import type { CSSProperties } from 'react';
import { cn } from '../../cn';

const WORDMARK_GAP_RATIO = 0.32;
const WORDMARK_FONT_RATIO = 0.98;
const WORDMARK_LIFT_RATIO = 0.04;

export interface LogoMarkProps {
  size?: number;
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function LogoMark({
  size = 20,
  mono = false,
  className,
  style,
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('block flex-none', className)}
      style={style}
    >
      <rect
        x="5"
        y="4"
        width="4.5"
        height="24"
        rx="1.2"
        fill={mono ? 'currentColor' : 'var(--fg-1)'}
      />
      <path
        d="M25 5.5 15 16l10 10.5"
        stroke={mono ? 'currentColor' : 'var(--accent)'}
        strokeWidth="4.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export interface LogoProps extends LogoMarkProps {
  variant?: 'full' | 'mark';
}

export function Logo({
  variant = 'full',
  size = 20,
  mono = false,
  className,
  style,
}: LogoProps) {
  if (variant === 'mark') {
    return (
      <LogoMark size={size} mono={mono} className={className} style={style} />
    );
  }
  return (
    <span
      aria-label="Korev"
      className={cn('inline-flex items-center text-fg-1', className)}
      style={{ gap: size * WORDMARK_GAP_RATIO, ...style }}
    >
      <LogoMark size={size} mono={mono} />
      <span
        className="font-sans leading-none font-semibold tracking-[-0.035em]"
        style={{
          fontSize: size * WORDMARK_FONT_RATIO,
          marginTop: -size * WORDMARK_LIFT_RATIO,
        }}
      >
        korev
      </span>
    </span>
  );
}
