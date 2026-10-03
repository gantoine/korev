import { Badge, type BadgeTone } from '../../design-system';
import type { Priority, PriorityTier } from '../../shared/inbox';

const TIER_TONES: Record<PriorityTier, BadgeTone> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'neutral',
};

const TIER_LEVELS: Record<PriorityTier, number> = { P1: 1, P2: 2, P3: 3 };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      role="img"
      aria-label={`Suggested priority ${TIER_LEVELS[priority.tier]}`}
      title={priority.reasons.join(' · ')}
      className="inline-flex"
    >
      <Badge
        tone={TIER_TONES[priority.tier]}
        className="font-mono font-semibold"
      >
        {priority.tier}
      </Badge>
    </span>
  );
}
