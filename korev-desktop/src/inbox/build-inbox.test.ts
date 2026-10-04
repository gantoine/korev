import { describe, expect, it } from 'vitest';
import type { Reviewer, StackInfo } from '../shared/pull-request';
import { buildInbox } from './build-inbox';
import { NOW, daysAgo, makeLayer, makePr } from './test-fixtures';

const viewer = { login: 'alice', teams: [] };
const alice: Reviewer = { kind: 'user', login: 'alice' };

describe('buildInbox', () => {
  it('buckets my PRs and counts only PRs requested from me', () => {
    const layers = [1, 2, 3].map((position) =>
      makeLayer({ position, number: 300 + position }),
    );
    const stackAt = (position: number): StackInfo => ({
      id: 'S1',
      size: 3,
      baseRefName: 'main',
      position,
      layers,
    });
    const requested = (number: number, position: number) =>
      makePr({
        number,
        authorLogin: 'bob',
        stack: stackAt(position),
        pendingReviewers: [alice],
        reviewRequestEvents: [{ reviewer: alice, createdAt: daysAgo(2) }],
      });

    const inbox = buildInbox({
      mine: [
        makePr({ number: 10, reviewDecision: 'CHANGES_REQUESTED' }),
        makePr({ number: 11 }),
      ],
      reviews: [requested(301, 1), requested(303, 3)],
      viewer,
      now: NOW,
      unknownMergeStreaks: {},
    });

    expect(inbox.mine.map((section) => section.count)).toEqual([1, 0, 1]);
    expect(inbox.reviewCount).toBe(2);
    expect(inbox.reviews).toHaveLength(1);
    expect(inbox.reviews[0]).toMatchObject({
      kind: 'stack',
      stack: { requestedCount: 2, size: 3 },
    });
  });
});
