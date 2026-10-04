import { describe, expect, it } from 'vitest';
import type { ReviewItem, ReviewRequest, SizeInfo } from '../shared/inbox';
import { compareReviewItems, priority, type PriorityInput } from './priority';
import { NOW, daysAgo, makePr } from './test-fixtures';

const MEDIUM: SizeInfo = {
  size: 'M',
  lines: 200,
  files: 8,
  filesTruncated: false,
};

function directRequest(requestedAt: string): ReviewRequest {
  return { requestedAt, approximate: false, direct: true, team: null };
}

function input(overrides: Partial<PriorityInput> = {}): PriorityInput {
  return {
    request: directRequest(daysAgo(1)),
    size: MEDIUM,
    blocksLayers: 0,
    isDraft: false,
    ci: 'running',
    ...overrides,
  };
}

function reviewItem(
  number: number,
  overrides: Partial<PriorityInput> = {},
): ReviewItem {
  const priorityInput = input(overrides);
  return {
    pr: makePr({ number, isDraft: priorityInput.isDraft }),
    request: priorityInput.request,
    size: priorityInput.size,
    blocksLayers: priorityInput.blocksLayers,
    priority: priority(priorityInput, NOW),
  };
}

describe('priority', () => {
  it('ranks a direct request above the same request through a team', () => {
    const team: ReviewRequest = {
      requestedAt: daysAgo(1),
      approximate: false,
      direct: false,
      team: '@acme/frontend',
    };

    expect(priority(input(), NOW).score).toBeGreaterThan(
      priority(input({ request: team }), NOW).score,
    );
  });

  it('ranks a PR that blocks open stack layers higher', () => {
    const blocking = priority(input({ blocksLayers: 2 }), NOW);

    expect(blocking.score).toBeGreaterThan(priority(input(), NOW).score);
    expect(blocking.reasons).toContain('blocks 2 layers');
  });

  it('pins drafts to the lowest tier and score', () => {
    const draft = priority(
      input({ isDraft: true, request: directRequest(daysAgo(30)) }),
      NOW,
    );

    expect(draft.tier).toBe('P3');
    expect(draft.score).toBeLessThan(priority(input(), NOW).score);
  });

  it('explains the score with plain phrases in display order', () => {
    const result = priority(
      input({
        size: { ...MEDIUM, size: 'S' },
        request: directRequest(daysAgo(3)),
      }),
      NOW,
    );

    expect(result.reasons.slice(0, 3)).toEqual([
      'Requested from you directly',
      'waiting 3d',
      'small',
    ]);
  });
});

describe('compareReviewItems', () => {
  function rankedItem(number: number, score: number, requestedAt: string) {
    const item = reviewItem(number, { request: directRequest(requestedAt) });
    return { ...item, priority: { ...item.priority, score } };
  }

  it('sorts by score, then older request, then PR number', () => {
    const items = [
      rankedItem(2, 10, daysAgo(1)),
      rankedItem(5, 10, daysAgo(2)),
      rankedItem(9, 40, daysAgo(1)),
      rankedItem(4, 10, daysAgo(2)),
    ];

    const sorted = items.sort(compareReviewItems);

    expect(sorted.map((item) => item.pr.number)).toEqual([9, 4, 5, 2]);
  });

  it('puts drafts after every ready PR', () => {
    const draft = reviewItem(1, {
      isDraft: true,
      request: directRequest(daysAgo(30)),
    });
    const fresh = reviewItem(2, { request: directRequest(NOW.toISOString()) });

    const sorted = [draft, fresh].sort(compareReviewItems);

    expect(sorted.map((item) => item.pr.number)).toEqual([2, 1]);
  });
});
