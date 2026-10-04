import { describe, expect, it } from 'vitest';
import type { PrComment } from '../shared/pull-request';
import {
  AVIATOR_FAILED_CHECKS,
  MERGIFY_DEQUEUED_CONFLICT,
  TRUNK_INITIAL,
  TRUNK_REMOVED_CANCELED,
  TRUNK_REMOVED_FAILED_TESTS,
} from './fixtures/queue-comments';
import { queueStatusFor } from './queue-status';
import { makePr } from './test-fixtures';

function comment(
  body: string,
  at: string,
  overrides: Partial<PrComment> = {},
): PrComment {
  return {
    authorLogin: 'maria',
    isBot: false,
    body,
    createdAt: at,
    updatedAt: at,
    url: `https://github.com/acme/web/pull/1#issuecomment-${at}`,
    ...overrides,
  };
}

function trunkSticky(body: string, createdAt: string, updatedAt: string) {
  return comment(body, createdAt, {
    authorLogin: 'trunk-io',
    isBot: true,
    updatedAt,
  });
}

describe('queueStatusFor', () => {
  it('reads a merge command as queued, by whoever posted it', () => {
    const pr = makePr({
      comments: [
        trunkSticky(
          TRUNK_INITIAL,
          '2026-10-01T09:00:00Z',
          '2026-10-01T09:00:00Z',
        ),
        comment('/trunk merge', '2026-10-01T10:00:00Z', { authorLogin: 'li' }),
      ],
    });
    expect(queueStatusFor(pr, 'trunk')).toMatchObject({
      kind: 'queued',
      tool: 'trunk',
      by: 'li',
      at: '2026-10-01T10:00:00Z',
    });
  });

  it('clears the status after a cancel command', () => {
    const pr = makePr({
      comments: [
        comment('/trunk merge', '2026-10-01T10:00:00Z'),
        comment('/trunk cancel', '2026-10-01T10:05:00Z'),
        trunkSticky(
          TRUNK_REMOVED_CANCELED,
          '2026-10-01T09:00:00Z',
          '2026-10-01T10:05:30Z',
        ),
      ],
    });
    expect(queueStatusFor(pr, 'trunk')).toBeNull();
  });

  it("reads Trunk's edited sticky comment as removed, with the reason", () => {
    const pr = makePr({
      comments: [
        trunkSticky(
          TRUNK_REMOVED_FAILED_TESTS,
          '2026-10-01T09:00:00Z',
          '2026-10-01T11:00:00Z',
        ),
        comment('/trunk merge', '2026-10-01T10:00:00Z'),
      ],
    });
    expect(queueStatusFor(pr, 'trunk')).toMatchObject({
      kind: 'removed',
      tool: 'trunk',
      reason: 'failed tests',
    });
  });

  it("ignores another tool's command", () => {
    const pr = makePr({
      comments: [comment('@mergifyio queue', '2026-10-01T10:00:00Z')],
    });
    expect(queueStatusFor(pr, 'trunk')).toBeNull();
  });

  it('reads the reason from a Mergify dequeue and an Aviator failure', () => {
    const queued = comment('@Mergifyio queue', '2026-10-04T08:25:00Z');
    const mergify = makePr({
      comments: [
        queued,
        comment(MERGIFY_DEQUEUED_CONFLICT, '2026-10-04T08:25:22Z', {
          authorLogin: 'mergify',
          isBot: true,
          updatedAt: '2026-10-04T10:04:38Z',
        }),
      ],
    });
    const aviator = makePr({
      comments: [
        comment('/aviator merge', '2026-08-28T04:00:00Z'),
        comment(AVIATOR_FAILED_CHECKS, '2026-08-28T04:05:08Z', {
          authorLogin: 'aviator-app',
          isBot: true,
        }),
      ],
    });
    expect(queueStatusFor(mergify, 'mergify')).toMatchObject({
      kind: 'removed',
      reason: "The pull request can't be updated",
    });
    expect(queueStatusFor(aviator, 'aviator')).toMatchObject({
      kind: 'removed',
      reason: 'some required checks failed',
    });
  });

  it("reports GitHub's own merge queue from the PR", () => {
    expect(
      queueStatusFor(makePr({ isInMergeQueue: true }), 'github'),
    ).toMatchObject({ kind: 'queued', tool: 'github' });
  });
});
