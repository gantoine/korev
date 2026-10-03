import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';

export interface CardProps {
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children?: ReactNode;
  padded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const INTERACTIVE =
  'cursor-pointer transition-[border-color,background-color] duration-(--dur-fast) ease-out hover:border-border-2 hover:bg-raised';

export function Card({
  title,
  icon,
  actions,
  children,
  padded = true,
  interactive = false,
  onClick,
  className,
  style,
}: CardProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <div
      className={cn(
        'min-w-0 rounded-md border border-border-1 bg-surface',
        interactive && INTERACTIVE,
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {hasHeader ? (
        <div className="flex min-h-[42px] items-center gap-2 border-b border-border-1 px-3.5 py-2.5">
          {icon ? <Icon name={icon} size={15} className="text-fg-3" /> : null}
          <div className="min-w-0 flex-1 type-h3 text-fg-1">{title}</div>
          {actions}
        </div>
      ) : null}
      {padded ? <div className="p-3.5">{children}</div> : children}
    </div>
  );
}
