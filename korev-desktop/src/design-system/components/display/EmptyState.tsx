import type { ReactNode } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="mb-1 inline-flex size-10 items-center justify-center rounded-md bg-raised text-fg-3 shadow-[inset_0_0_0_1px_var(--border-1)]">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <h2 className="m-0 type-h3 text-fg-1">{title}</h2>
      {description ? (
        <p className="m-0 max-w-90 text-sm text-fg-3">{description}</p>
      ) : null}
      {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
    </div>
  );
}
