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

function ciLabel(state: CiState, checks: Check[]): string {
  const { label } = CI_DISPLAY[state];
  if (state !== 'failing' || checks.length === 0) return label;
  const failing = checks.filter((check) => check.outcome === 'failing');
  return `${label}, ${failing.length} of ${checks.length} checks`;
}

export interface CiIconProps {
  state: CiState;
  checks?: Check[];
}

export function CiIcon({ state, checks = [] }: CiIconProps) {
  const { icon, className } = CI_DISPLAY[state];
  const label = ciLabel(state, checks);
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex">
      <Icon name={icon} size={14} className={className} />
    </span>
  );
}
