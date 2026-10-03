import { useState, type ReactNode } from 'react';
import { cn } from '../../cn';
import { Kbd } from '../core/Kbd';

export interface TooltipProps {
  label: ReactNode;
  kbd?: string;
  side?: 'top' | 'bottom';
  open?: boolean;
  children: ReactNode;
}

const BUBBLE =
  'pointer-events-none absolute left-1/2 z-50 flex -translate-x-1/2 animate-fade-fast items-center gap-1.5 rounded-sm bg-gray-900 px-2 py-[5px] font-sans text-xs leading-[1.2] font-medium whitespace-nowrap text-gray-0 light:bg-gray-100 light:text-gray-950';

const SIDES = {
  top: 'bottom-[calc(100%+6px)]',
  bottom: 'top-[calc(100%+6px)]',
};

export function Tooltip({
  label,
  kbd,
  side = 'top',
  open,
  children,
}: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const visible = open ?? hovered;
  const show = () => setHovered(true);
  const hide = () => setHovered(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible ? (
        <span role="tooltip" className={cn(BUBBLE, SIDES[side])}>
          {label}
          {kbd ? (
            <Kbd className="h-4 min-w-4 border-gray-0/20 bg-transparent text-gray-500">
              {kbd}
            </Kbd>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
