import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../core/IconButton';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width,
}: DialogProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const closeOnScrim = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex animate-fade items-start justify-center bg-overlay pt-[14vh] backdrop-blur-(--blur-overlay)"
      onMouseDown={closeOnScrim}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-[min(480px,calc(100vw-32px))] animate-rise rounded-lg bg-raised shadow-overlay"
        style={width ? { width } : undefined}
      >
        <div className="flex items-start gap-3 px-5 pt-[18px]">
          <div className="flex-1">
            <h2 className="m-0 font-sans text-lg leading-[1.3] font-semibold tracking-tight text-fg-1">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 mb-0 type-ui text-fg-2">{description}</p>
            ) : null}
          </div>
          {onClose ? (
            <IconButton icon="x" label="Close" size="sm" onClick={onClose} />
          ) : null}
        </div>
        {children ? (
          <div className="px-5 py-4">{children}</div>
        ) : (
          <div className="h-4" />
        )}
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-border-1 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
