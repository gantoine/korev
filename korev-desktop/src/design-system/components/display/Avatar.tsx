import { cn } from '../../cn';
import { LogoMark } from '../brand/Logo';

const HUES = [18, 42, 150, 190, 220, 265, 330];
const INITIALS_FONT_RATIO = 0.4;
const KOREV_MARK_RATIO = 0.62;

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  kind?: 'human' | 'korev';
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length];
}

const BASE =
  'inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-gray-300 font-semibold tracking-[-0.01em] text-fg-1';

export function Avatar({
  name = '',
  src,
  size = 24,
  kind = 'human',
  className,
}: AvatarProps) {
  if (kind === 'korev') {
    return (
      <span
        className={cn(
          BASE,
          'rounded-[28%] bg-raised shadow-[inset_0_0_0_1px_var(--border-2)]',
          className,
        )}
        style={{ width: size, height: size }}
        title="Korev"
      >
        <LogoMark size={size * KOREV_MARK_RATIO} />
      </span>
    );
  }
  const hue = hueFor(name);
  return (
    <span
      className={cn(BASE, className)}
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: size * INITIALS_FONT_RATIO,
        background: src ? undefined : `oklch(0.42 0.06 ${hue})`,
        color: `oklch(0.93 0.03 ${hue})`,
      }}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
