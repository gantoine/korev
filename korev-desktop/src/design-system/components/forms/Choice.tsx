import type { ReactNode } from 'react';
import { cn } from '../../cn';

export interface ChoiceLabelProps {
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function ChoiceLabel({
  label,
  disabled,
  className,
  children,
}: ChoiceLabelProps) {
  return (
    <label
      className={cn(
        'group inline-flex cursor-pointer items-center gap-2 type-ui text-fg-1 select-none',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      {children}
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export const HIDDEN_INPUT_CLASS = 'peer absolute size-0 opacity-0';

export const CHOICE_BOX_CLASS =
  'inline-flex size-[15px] flex-none items-center justify-center border bg-inset text-white transition-[background-color,border-color] duration-(--dur-fast) ease-out peer-focus-visible:shadow-focus';

export const CHOICE_BOX_IDLE_CLASS =
  'border-border-strong group-hover:border-fg-3';
