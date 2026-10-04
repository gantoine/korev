import type { CommentMergeTool, MergeTool, QueueStatus } from '../shared/merge';
import type { PrComment, PullRequest } from '../shared/pull-request';

type BotStatus =
  | { kind: 'queued' }
  | { kind: 'cleared' }
  | { kind: 'removed'; reason: string | null };

interface ToolSpec {
  bot: string;
  mergeCommand: RegExp;
  cancelCommand: RegExp;
  readStatus(body: string): BotStatus | null;
}

interface QueueEvent {
  at: string;
  status: BotStatus;
  comment: PrComment;
  isCommand: boolean;
}

export const QUEUE_COMMANDS: Record<
  CommentMergeTool,
  { merge: string; cancel: string }
> = {
  trunk: { merge: '/trunk merge', cancel: '/trunk cancel' },
  mergify: { merge: '@mergifyio queue', cancel: '@mergifyio dequeue' },
  aviator: { merge: '/aviator merge', cancel: '/aviator cancel' },
};

const QUEUED: BotStatus = { kind: 'queued' };
const CLEARED: BotStatus = { kind: 'cleared' };
const BOT_SUFFIX = /\[bot\]$/;

function removed(reason: string | undefined): BotStatus {
  return { kind: 'removed', reason: reason?.trim() || null };
}

function readTrunkStatus(body: string): BotStatus | null {
  const removal =
    /removed from the merge queue because (?:it )?(?:was )?(.+?)\.(?:\s|$)/.exec(
      body,
    );
  if (removal) {
    return removal[1].startsWith('canceled by') ? CLEARED : removed(removal[1]);
  }
  if (/Merged successfully/.test(body)) return CLEARED;
  const inQueue =
    /Submitted to Merge|Waiting to start tests|Waiting for tests|Running tests|will be merged soon|waiting for other pull requests to finish testing/;
  return inQueue.test(body) ? QUEUED : null;
}

function readMergifyStatus(body: string): BotStatus | null {
  if (/Queue command has been cancelled/.test(body)) return CLEARED;
  const state = /"state":\s*"(\w+)"/.exec(body)?.[1];
  if (state === 'waiting' || state === 'checking') return QUEUED;
  if (state === 'merged') return CLEARED;
  if (state !== 'dequeued') return null;
  if (/with a `dequeue` command/.test(body)) return CLEARED;
  return removed(/## Reason\s*\n+([^\n]+)/.exec(body)?.[1]);
}

function readAviatorStatus(body: string): BotStatus | null {
  if (/has been cancelled and is no longer ready-to-merge/.test(body)) {
    return CLEARED;
  }
  const failure = /failed to merge: (.+?)\.(?:\s|$)/.exec(body);
  if (failure) return removed(failure[1]);
  if (/has accepted the merge request|is queued for merge/.test(body)) {
    return QUEUED;
  }
  if (/currently \*\*open\*\* \(not queued\)|was merged/.test(body)) {
    return CLEARED;
  }
  return null;
}

const TOOL_SPECS: Record<CommentMergeTool, ToolSpec> = {
  trunk: {
    bot: 'trunk-io',
    mergeCommand: /^\/trunk merge\b/i,
    cancelCommand: /^\/trunk cancel\b/i,
    readStatus: readTrunkStatus,
  },
  mergify: {
    bot: 'mergify',
    mergeCommand: /^@mergify(?:io)? queue\b/i,
    cancelCommand: /^@mergify(?:io)? dequeue\b/i,
    readStatus: readMergifyStatus,
  },
  aviator: {
    bot: 'aviator-app',
    mergeCommand: /^\/aviator (?:stack )?merge\b/i,
    cancelCommand: /^\/aviator (?:stack )?cancel\b/i,
    readStatus: readAviatorStatus,
  },
};

function isToolBot(comment: PrComment, spec: ToolSpec): boolean {
  const login = comment.authorLogin?.replace(BOT_SUFFIX, '').toLowerCase();
  return comment.isBot && login === spec.bot;
}

function commandEvent(comment: PrComment, spec: ToolSpec): QueueEvent | null {
  const firstLine = comment.body.trim().split('\n')[0] ?? '';
  const status = spec.mergeCommand.test(firstLine)
    ? QUEUED
    : spec.cancelCommand.test(firstLine)
      ? CLEARED
      : null;
  if (!status) return null;
  return { at: comment.createdAt, status, comment, isCommand: true };
}

function botEvent(comment: PrComment, spec: ToolSpec): QueueEvent | null {
  if (!isToolBot(comment, spec)) return null;
  const status = spec.readStatus(comment.body);
  if (!status) return null;
  return { at: comment.updatedAt, status, comment, isCommand: false };
}

function latestEvent(
  comments: PrComment[],
  spec: ToolSpec,
): QueueEvent | undefined {
  return comments
    .flatMap((comment) => [
      commandEvent(comment, spec),
      botEvent(comment, spec),
    ])
    .filter((event): event is QueueEvent => event !== null)
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
    .at(-1);
}

function toQueueStatus(
  event: QueueEvent,
  tool: CommentMergeTool,
): QueueStatus | null {
  const { status, comment } = event;
  if (status.kind === 'cleared') return null;
  if (status.kind === 'removed') {
    return { kind: 'removed', tool, reason: status.reason, url: comment.url };
  }
  return {
    kind: 'queued',
    tool,
    by: event.isCommand ? comment.authorLogin : null,
    at: event.at,
    url: comment.url,
  };
}

export function queueStatusFor(
  pr: PullRequest,
  tool: MergeTool,
): QueueStatus | null {
  if (pr.isInMergeQueue) {
    return { kind: 'queued', tool: 'github', by: null, at: null, url: null };
  }
  if (tool === 'github') return null;
  const event = latestEvent(pr.comments, TOOL_SPECS[tool]);
  return event ? toQueueStatus(event, tool) : null;
}
