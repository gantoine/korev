import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../cn';
import { Badge } from '../display/Badge';
import { RiskBadge, type RiskLevel } from './RiskBadge';

export type FindingStatus = 'open' | 'accepted' | 'dismissed' | 'resolved';

export interface FindingProps {
  level: RiskLevel;
  title: ReactNode;
  location?: string;
  category?: string;
  status?: FindingStatus;
  active?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}

const CLOSED_STATUSES: FindingStatus[] = ['resolved', 'dismissed'];

const BODY =
  'type-ui text-pretty text-fg-2 [&_code]:rounded-xs [&_code]:bg-active [&_code]:px-1 [&_code]:py-px [&_code]:text-[11.5px] [&_code]:text-fg-1';

export function Finding({
  level = 'medium',
  title,
  location,
  category,
  status = 'open',
  active = false,
  children,
  actions,
  onClick,
  style,
}: FindingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border-1 bg-surface px-3.5 py-3 transition-colors duration-(--dur-fast) ease-out',
        active && 'border-accent-border shadow-halo',
        CLOSED_STATUSES.includes(status) && 'opacity-60',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
      style={style}
    >
      <div className="flex min-w-0 items-center gap-2">
        <RiskBadge level={level} />
        {category ? <Badge outline>{category}</Badge> : null}
        <span className="flex-1" />
        {location ? (
          <span className="min-w-0 truncate font-mono text-2xs leading-none text-fg-3">
            {location}
          </span>
        ) : null}
        {status !== 'open' ? (
          <Badge tone={status === 'accepted' ? 'success' : 'neutral'}>
            {status}
          </Badge>
        ) : null}
      </div>
      <div className="font-sans text-md leading-[1.4] font-medium tracking-[-0.005em] text-pretty text-fg-1">
        {title}
      </div>
      {children ? <div className={BODY}>{children}</div> : null}
      {actions ? (
        <div className="mt-0.5 flex items-center gap-1.5">{actions}</div>
      ) : null}
    </div>
  );
}
