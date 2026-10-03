import { cn } from '../../cn';
import { Icon, type IconName } from '../core/Icon';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskBadgeProps {
  level?: RiskLevel;
  label?: string;
  iconOnly?: boolean;
}

const LEVELS: Record<RiskLevel, { icon: IconName; className: string }> = {
  critical: {
    icon: 'octagon-alert',
    className: 'bg-risk-critical-subtle text-red-400 light:text-red-700',
  },
  high: {
    icon: 'triangle-alert',
    className: 'bg-risk-high-subtle text-orange-400 light:text-orange-700',
  },
  medium: {
    icon: 'circle-alert',
    className: 'bg-risk-medium-subtle text-amber-400 light:text-amber-700',
  },
  low: {
    icon: 'info',
    className: 'bg-risk-low-subtle text-gray-700 light:text-fg-2',
  },
};

const RISK_ICON_STROKE = 2.25;

export function RiskBadge({
  level = 'medium',
  label,
  iconOnly = false,
}: RiskBadgeProps) {
  const text = label ?? level;
  const { icon, className } = LEVELS[level];
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-xs pr-[7px] pl-1.5 font-sans text-2xs leading-none font-semibold tracking-caps whitespace-nowrap uppercase',
        className,
        iconOnly && 'px-1',
      )}
      title={iconOnly ? text : undefined}
    >
      <Icon name={icon} size={11} strokeWidth={RISK_ICON_STROKE} />
      {iconOnly ? null : text}
    </span>
  );
}
