import { Badge } from '../../design-system';
import type { Reason, ReasonSeverity } from '../../shared/inbox';

const SEVERITY_RANK: Record<ReasonSeverity, number> = {
  danger: 0,
  warning: 1,
  neutral: 2,
  success: 3,
};

function bySeverity(reasons: Reason[]): Reason[] {
  return [...reasons].sort(
    (left, right) =>
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity],
  );
}

export function ReasonChips({ reasons }: { reasons: Reason[] }) {
  const [primary, ...rest] = bySeverity(reasons);
  if (!primary) return <span />;
  return (
    <span
      title={reasons.map((reason) => reason.label).join(' · ')}
      className="flex items-center justify-end gap-1.5"
    >
      <Badge tone={primary.severity}>{primary.label}</Badge>
      {rest.length > 0 ? <Badge>+{rest.length}</Badge> : null}
    </span>
  );
}
