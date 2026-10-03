import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';

export type ToastTone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning';

export interface ToastProps {
  tone?: ToastTone;
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  style?: CSSProperties;
}

const TONES: Record<ToastTone, { icon: IconName; className: string }> = {
  neutral: { icon: 'info', className: 'text-fg-3' },
  accent: { icon: 'git-pull-request', className: 'text-accent-text' },
  success: { icon: 'circle-check', className: 'text-success-text' },
  danger: { icon: 'octagon-alert', className: 'text-danger-text' },
  warning: { icon: 'triangle-alert', className: 'text-warning-text' },
};

export function Toast({
  tone = 'neutral',
  icon,
  title,
  description,
  action,
  onClose,
  style,
}: ToastProps) {
  const toneStyle = TONES[tone];
  return (
    <div
      role="status"
      className="flex w-[360px] max-w-full animate-rise items-start gap-2.5 rounded-md bg-raised py-3 pr-3 pl-3.5 shadow-pop"
      style={style}
    >
      <Icon
        name={icon ?? toneStyle.icon}
        size={16}
        className={cn('mt-px', toneStyle.className)}
      />
      <div className="min-w-0 flex-1">
        <div className="font-sans text-sm leading-[1.35] font-medium text-fg-1">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 font-sans text-xs leading-[1.45] text-fg-2">
            {description}
          </div>
        ) : null}
        {action ? <div className="mt-2 flex gap-1.5">{action}</div> : null}
      </div>
      {onClose ? (
        <IconButton
          icon="x"
          label="Dismiss"
          size="sm"
          onClick={onClose}
          className="-mt-1 -mr-1"
        />
      ) : null}
    </div>
  );
}
