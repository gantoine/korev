export type MergeTool = 'github' | 'trunk' | 'mergify' | 'aviator';

export type CommentMergeTool = Exclude<MergeTool, 'github'>;

export type MergeMethod = 'merge' | 'squash' | 'rebase';

export interface RepoMergeInfo {
  defaultMethod: MergeMethod | null;
  allowedMethods: MergeMethod[];
  hasMergeQueue: boolean;
}

export type MergePath =
  | { kind: 'github-queue' }
  | { kind: 'direct' }
  | { kind: 'comment'; tool: CommentMergeTool };

export type QueueStatus =
  | {
      kind: 'queued';
      tool: MergeTool;
      by: string | null;
      at: string | null;
      url: string | null;
    }
  | {
      kind: 'removed';
      tool: MergeTool;
      reason: string | null;
      url: string | null;
    };

export type PrActionState =
  | { kind: 'merging'; numbers: number[] }
  | { kind: 'still-merging'; numbers: number[] }
  | { kind: 'merged'; numbers: number[] }
  | { kind: 'merge-failed'; message: string }
  | { kind: 'sending' }
  | { kind: 'closing' }
  | { kind: 'closed' }
  | { kind: 'close-failed'; message: string };

export interface PrTarget {
  id: string;
  repo: string;
  number: number;
}

export interface MergeRequest {
  target: PrTarget;
  numbers: number[];
  method: MergeMethod | null;
}

export type ActionResult = { ok: true } | { ok: false; message: string };
