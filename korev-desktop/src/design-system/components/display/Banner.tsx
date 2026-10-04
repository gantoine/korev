import { useState, type ReactNode } from 'react';
import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';

export type BannerTone = 'warning' | 'danger' | 'neutral';

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  tone?: BannerTone;
  action?: BannerAction;
  children: ReactNode;
  className?: string;
}

interface ToneStyle {
  icon: IconName;
  className: string;
  rank: number;
}

const TONES: Record<BannerTone, ToneStyle> = {
  danger: {
    icon: 'octagon-alert',
    className: 'bg-danger-subtle text-danger-text',
    rank: 0,
  },
  warning: {
    icon: 'triangle-alert',
    className: 'bg-warning-subtle text-warning-text',
    rank: 1,
  },
  neutral: { icon: 'info', className: 'bg-active text-fg-2', rank: 2 },
};

const SHELL = 'flex min-w-0 items-center gap-2 rounded-sm px-3 py-2 text-xs';

const LINK =
  'shrink-0 cursor-pointer rounded-xs border-0 bg-transparent p-0 font-sans text-xs font-medium text-current underline underline-offset-3 hover:text-fg-1 focus-visible:shadow-focus';

export function Banner({
  tone = 'warning',
  action,
  children,
  className,
}: BannerProps) {
  const style = TONES[tone];
  return (
    <div className={cn(SHELL, style.className, className)}>
      <Icon name={style.icon} size={13} />
      <span className="min-w-0 flex-1">{children}</span>
      {action ? (
        <button type="button" onClick={action.onClick} className={LINK}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export interface BannerItem {
  id: string;
  tone: BannerTone;
  message: ReactNode;
  action?: BannerAction;
}

export interface BannerGroupProps {
  items: BannerItem[];
  summary?: string;
  className?: string;
}

function mostSevere(items: BannerItem[]): BannerTone {
  return items.reduce<BannerTone>(
    (worst, item) =>
      TONES[item.tone].rank < TONES[worst].rank ? item.tone : worst,
    'neutral',
  );
}

function BannerView({ item }: { item: BannerItem }) {
  return (
    <Banner tone={item.tone} action={item.action}>
      {item.message}
    </Banner>
  );
}

export function BannerGroup({ items, summary, className }: BannerGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [only] = items;
  if (!only) return null;
  if (items.length === 1) {
    return (
      <div className={className}>
        <BannerView item={only} />
      </div>
    );
  }
  const style = TONES[mostSevere(items)];
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className={cn(
          SHELL,
          style.className,
          'cursor-pointer border-0 text-left font-sans focus-visible:shadow-focus',
        )}
      >
        <Icon name={style.icon} size={13} />
        <span className="font-medium">
          {summary ?? `${items.length} problems`}
        </span>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={13} />
      </button>
      {expanded
        ? items.map((item) => <BannerView key={item.id} item={item} />)
        : null}
    </div>
  );
}
