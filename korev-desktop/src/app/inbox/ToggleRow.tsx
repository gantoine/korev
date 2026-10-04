import type { ReactNode } from 'react';
import { Icon, cn } from '../../design-system';
import { useListOption } from './listbox';

export interface ToggleRowProps {
  optionKey: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}

export function ToggleRow({
  optionKey,
  expanded,
  onToggle,
  className,
  children,
}: ToggleRowProps) {
  const option = useListOption(optionKey, { onActivate: onToggle });
  return (
    <div
      {...option}
      aria-expanded={expanded}
      className={cn(
        'flex w-full cursor-pointer items-center gap-1.5 py-2 pr-5 text-left font-sans text-xs text-fg-3 hover:bg-hover hover:text-fg-1 aria-selected:bg-raised focus-visible:relative focus-visible:shadow-focus',
        className,
      )}
    >
      {children}
      <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
    </div>
  );
}
