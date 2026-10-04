import { useEffect, type ReactNode } from 'react';
import { cn } from '../../cn';
import { IconButton } from '../core/IconButton';

export type SidePanelMode = 'docked' | 'overlay';

export interface SidePanelProps {
  label: string;
  onClose: () => void;
  mode?: SidePanelMode;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const MODES: Record<SidePanelMode, string> = {
  docked: 'relative border-l border-border-1',
  overlay:
    'absolute inset-y-0 right-0 z-20 animate-slide-in shadow-overlay motion-reduce:animate-none',
};

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
}

export function SidePanel({
  label,
  onClose,
  mode = 'docked',
  header,
  footer,
  children,
  className,
}: SidePanelProps) {
  useCloseOnEscape(onClose);
  return (
    <aside
      aria-label={label}
      className={cn(
        'flex w-panel max-w-full shrink-0 flex-col bg-surface',
        MODES[mode],
        className,
      )}
    >
      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">{header}</div>
        <IconButton icon="x" label="Close panel" size="sm" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">{children}</div>
      {footer ? (
        <div className="border-t border-border-1 px-4 py-3">{footer}</div>
      ) : null}
    </aside>
  );
}
