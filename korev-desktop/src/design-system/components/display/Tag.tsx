import type { ReactNode } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';

export interface TagProps {
  icon?: IconName;
  mono?: boolean;
  onRemove?: () => void;
  children?: ReactNode;
  className?: string;
}

export function Tag({
  icon,
  mono = false,
  onRemove,
  children,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-[5px] rounded-sm border border-border-2 bg-raised px-2 font-sans text-xs leading-none text-fg-2 whitespace-nowrap',
        mono && 'font-mono text-[11.5px]',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="-mr-[3px] inline-flex cursor-pointer border-0 bg-transparent p-0 text-fg-3 hover:text-fg-1"
        >
          <Icon name="x" size={12} />
        </button>
      ) : null}
    </span>
  );
}
