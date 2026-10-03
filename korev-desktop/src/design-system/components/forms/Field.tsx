import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../cn';

export type FieldSize = 'md' | 'lg';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  className,
  style,
  children,
}: FieldProps) {
  if (!label && !hint && !error) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  const message = error || hint;
  return (
    <label
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
      style={style}
    >
      {label ? <span className="type-label text-fg-2">{label}</span> : null}
      {children}
      {message ? (
        <span
          className={cn('text-xs', error ? 'text-danger-text' : 'text-fg-3')}
        >
          {message}
        </span>
      ) : null}
    </label>
  );
}

interface FieldBoxOptions {
  size: FieldSize;
  error?: boolean;
  disabled?: boolean;
}

export function fieldBoxClass({ size, error, disabled }: FieldBoxOptions) {
  return cn(
    'flex h-control-md items-center gap-2 rounded-sm border border-border-2 bg-inset px-2.5 text-fg-1 transition-[border-color,box-shadow] duration-(--dur-fast) ease-out hover:border-border-strong focus-within:border-accent focus-within:shadow-halo [&>svg]:text-fg-3',
    size === 'lg' && 'h-control-lg',
    error && 'border-danger',
    disabled && 'pointer-events-none opacity-50',
  );
}

export const FIELD_CONTROL_CLASS =
  'h-full min-w-0 flex-1 border-0 bg-transparent p-0 type-ui text-inherit outline-none placeholder:text-fg-4 focus-visible:shadow-none';
