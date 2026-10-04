import type { PullRequest } from '../shared/pull-request';

export type UnknownMergeStreaks = Record<string, number>;

export function advanceUnknownMergeStreaks(
  previous: UnknownMergeStreaks,
  prs: PullRequest[],
): UnknownMergeStreaks {
  return Object.fromEntries(
    prs
      .filter((pr) => pr.mergeStateStatus === 'UNKNOWN')
      .map((pr) => [pr.id, (previous[pr.id] ?? 0) + 1]),
  );
}
