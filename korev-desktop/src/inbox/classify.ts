import type { MyPr, Reason, ReasonCode, ReasonSeverity } from '../shared/inbox';
import type { MergeStateStatus, PullRequest } from '../shared/pull-request';
import { countOf } from './format';
import { severityRank } from './severity';

type ReasonRule = (pr: PullRequest) => Reason | null;

const READY_MERGE_STATES: ReadonlySet<MergeStateStatus> = new Set([
  'CLEAN',
  'HAS_HOOKS',
]);

const REASON_SEVERITY: Record<ReasonCode, ReasonSeverity> = {
  'checks-failing': 'danger',
  'changes-requested': 'danger',
  conflicts: 'danger',
  'unresolved-threads': 'warning',
  behind: 'warning',
  'optional-checks-failing': 'warning',
  'blocked-by-rules': 'warning',
  'checks-pending': 'neutral',
  draft: 'neutral',
  'waiting-on-review': 'neutral',
  'checking-mergeability': 'neutral',
  'no-checks': 'neutral',
  'ready-to-merge': 'success',
};

function reason(code: ReasonCode, label: string): Reason {
  return { code, label, severity: REASON_SEVERITY[code] };
}

function failingCheckNames(pr: PullRequest): string[] {
  return pr.checks
    .filter((check) => check.outcome === 'failing')
    .map((check) => check.name);
}

function pendingCheckCount(pr: PullRequest): number {
  return pr.checks.filter((check) => check.outcome === 'pending').length;
}

function isCiRunning(pr: PullRequest): boolean {
  return pendingCheckCount(pr) > 0 || pr.ci === 'running';
}

function checksFailingReason(pr: PullRequest): Reason | null {
  if (pr.mergeStateStatus === 'UNSTABLE') return null;
  const names = failingCheckNames(pr);
  if (names.length === 1)
    return reason('checks-failing', `${names[0]} failing`);
  if (names.length > 1) {
    return reason(
      'checks-failing',
      `${countOf(names.length, 'check')} failing`,
    );
  }
  if (pr.ci === 'failing') return reason('checks-failing', 'Checks failing');
  return null;
}

function changesRequestedReason(pr: PullRequest): Reason | null {
  if (pr.reviewDecision !== 'CHANGES_REQUESTED') return null;
  return reason('changes-requested', 'Changes requested');
}

function conflictsReason(pr: PullRequest): Reason | null {
  const conflicting =
    pr.mergeable === 'CONFLICTING' || pr.mergeStateStatus === 'DIRTY';
  if (!conflicting) return null;
  return reason('conflicts', 'Merge conflicts');
}

function unresolvedThreadsReason(pr: PullRequest): Reason | null {
  if (pr.unresolvedThreads === 0) return null;
  return reason(
    'unresolved-threads',
    countOf(pr.unresolvedThreads, 'unresolved thread'),
  );
}

function behindReason(pr: PullRequest): Reason | null {
  if (pr.mergeStateStatus !== 'BEHIND') return null;
  return reason('behind', 'Behind base branch');
}

function optionalChecksReason(pr: PullRequest): Reason | null {
  if (pr.mergeStateStatus !== 'UNSTABLE') return null;
  const names = failingCheckNames(pr);
  if (names.length > 0) {
    return reason(
      'optional-checks-failing',
      `Optional checks failing · ${names.join(', ')}`,
    );
  }
  if (isCiRunning(pr)) return null;
  return reason('optional-checks-failing', 'Optional checks failing');
}

function ciRunningReason(pr: PullRequest): Reason | null {
  const pending = pendingCheckCount(pr);
  const total = pr.checks.length;
  if (pending > 0) {
    return reason(
      'checks-pending',
      `CI running · ${total - pending} of ${total}`,
    );
  }
  if (pr.ci === 'running') return reason('checks-pending', 'CI running');
  return null;
}

function draftReason(pr: PullRequest): Reason | null {
  if (!pr.isDraft) return null;
  return reason('draft', 'Draft');
}

function blockedReason(pr: PullRequest): Reason | null {
  if (pr.mergeStateStatus !== 'BLOCKED') return null;
  if (pr.reviewDecision === 'REVIEW_REQUIRED') {
    return reason('waiting-on-review', 'Waiting on required review');
  }
  return reason('blocked-by-rules', 'Blocked by branch rules');
}

function mergeabilityReason(pr: PullRequest): Reason | null {
  if (pr.mergeStateStatus !== 'UNKNOWN') return null;
  return reason('checking-mergeability', 'Checking mergeability…');
}

const NEEDS_YOU_RULES: readonly ReasonRule[] = [
  checksFailingReason,
  changesRequestedReason,
  conflictsReason,
  unresolvedThreadsReason,
  behindReason,
  optionalChecksReason,
];

const IN_PROGRESS_RULES: readonly ReasonRule[] = [
  ciRunningReason,
  draftReason,
  blockedReason,
  mergeabilityReason,
];

function isReason(candidate: Reason | null): candidate is Reason {
  return candidate !== null;
}

function collectReasons(
  pr: PullRequest,
  rules: readonly ReasonRule[],
): Reason[] {
  return rules
    .map((rule) => rule(pr))
    .filter(isReason)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function isReadyToMerge(pr: PullRequest): boolean {
  return (
    READY_MERGE_STATES.has(pr.mergeStateStatus) &&
    !pr.isDraft &&
    pr.unresolvedThreads === 0
  );
}

export function classifyMyPr(pr: PullRequest): MyPr {
  const needsYou = collectReasons(pr, NEEDS_YOU_RULES);
  if (needsYou.length > 0) {
    return { pr, bucket: 'needs-you', reasons: needsYou };
  }
  const inProgress = collectReasons(pr, IN_PROGRESS_RULES);
  if (inProgress.length === 0 && isReadyToMerge(pr)) {
    return {
      pr,
      bucket: 'ready',
      reasons: [reason('ready-to-merge', 'Ready to merge')],
    };
  }
  return { pr, bucket: 'in-progress', reasons: inProgress };
}
