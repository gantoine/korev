import type {
  MergeMethod,
  MergePath,
  MergeTool,
  RepoMergeInfo,
} from '../shared/merge';
import type { PullRequest } from '../shared/pull-request';

export interface MergeMethodChoice {
  initial: MergeMethod | null;
  options: MergeMethod[];
}

export function mergePathFor(
  info: RepoMergeInfo | undefined,
  tool: MergeTool,
): MergePath {
  if (info?.hasMergeQueue) return { kind: 'github-queue' };
  if (tool === 'github') return { kind: 'direct' };
  return { kind: 'comment', tool };
}

export function mergeMethodChoice(
  info: RepoMergeInfo | undefined,
): MergeMethodChoice {
  const options = info?.allowedMethods ?? [];
  const preferred = info?.defaultMethod;
  const initial =
    preferred && options.includes(preferred) ? preferred : (options[0] ?? null);
  return { initial, options };
}

export function mergeRange(pr: PullRequest): number[] {
  const stack = pr.stack;
  if (!stack) return [pr.number];
  return stack.layers
    .filter((layer) => layer.position <= stack.position)
    .filter((layer) => layer.state === 'OPEN')
    .sort((lower, upper) => lower.position - upper.position)
    .map((layer) => layer.number);
}
