import { Icon, type IconName } from '../../design-system';
import type { Check, CiState } from '../../shared/pull-request';

interface CiDisplay {
  icon: IconName;
  label: string;
  className: string;
}

const CI_DISPLAY: Record<CiState, CiDisplay> = {
  passing: {
    icon: 'circle-check',
    label: 'CI passing',
    className: 'text-success-text',
  },
  failing: {
    icon: 'circle-x',
    label: 'CI failing',
    className: 'text-danger-text',
  },
  running: {
    icon: 'loader',
    label: 'CI running',
    className: 'animate-spin text-warning-text motion-reduce:animate-none',
  },
  none: {
    icon: 'circle-dashed',
    label: 'No CI checks',
    className: 'text-fg-3',
  },
};

const COUNTED_CHECKS: Partial<Record<CiState, (check: Check) => boolean>> = {
  failing: (check) => check.outcome === 'failing',
  running: (check) => check.outcome !== 'pending',
};

function ciLabel(state: CiState, checks: Check[]): string {
  const { label } = CI_DISPLAY[state];
  const counted = COUNTED_CHECKS[state];
  if (!counted || checks.length === 0) return label;
  const count = checks.filter(counted).length;
  return `${label}, ${count} of ${checks.length} checks`;
}

export interface CiIconProps {
  state: CiState;
  checks?: Check[];
  label?: string;
}

export function CiIcon({ state, checks = [], label: givenLabel }: CiIconProps) {
  const { icon, className } = CI_DISPLAY[state];
  const label = givenLabel ?? ciLabel(state, checks);
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex">
      <Icon name={icon} size={14} className={className} />
    </span>
  );
}
