import { describe, expect, it } from 'vitest';
import type { ReviewRequest } from '../shared/inbox';
import type { PullRequest, SubmittedReview } from '../shared/pull-request';
import { approvalFor } from './approval';
import { makePr } from './test-fixtures';

const viewer = {
  login: 'thiago',
  teams: [
    { org: 'posthog', slug: 'data-modeling', members: ['thiago', 'sakce'] },
  ],
};

const TEAM_REQUEST: ReviewRequest = {
  requestedAt: '2026-10-01T10:00:00Z',
  approximate: false,
  direct: false,
  team: '@posthog/data-modeling',
};

const DIRECT_REQUEST: ReviewRequest = {
  ...TEAM_REQUEST,
  direct: true,
  team: null,
};

function approvedBy(login: string, isBot = false): SubmittedReview {
  return { login, state: 'APPROVED', isBot };
}

function teamRequestedPr(overrides: Partial<PullRequest> = {}): PullRequest {
  return makePr({
    pendingReviewers: [{ kind: 'team', org: 'posthog', slug: 'data-modeling' }],
    ...overrides,
  });
}

describe('approvalFor', () => {
  it('moves a team request a teammate approved', () => {
    const pr = teamRequestedPr({ reviews: [approvedBy('sakce')] });
    expect(approvalFor(pr, TEAM_REQUEST, viewer)).toEqual({
      kind: 'teammate',
      login: 'sakce',
    });
  });

  it('moves a team request the viewer already approved', () => {
    const pr = teamRequestedPr({ reviews: [approvedBy('thiago')] });
    expect(approvalFor(pr, TEAM_REQUEST, viewer)).toEqual({ kind: 'you' });
  });

  it('moves a team request GitHub marks approved overall', () => {
    const pr = teamRequestedPr({
      reviewDecision: 'APPROVED',
      reviews: [approvedBy('outsider')],
    });
    expect(approvalFor(pr, TEAM_REQUEST, viewer)).toEqual({ kind: 'overall' });
  });

  it('flags an overall approval that came only from bots', () => {
    const pr = teamRequestedPr({
      reviewDecision: 'APPROVED',
      reviews: [approvedBy('stamphog', true)],
    });
    expect(approvalFor(pr, TEAM_REQUEST, viewer)).toEqual({
      kind: 'bot',
      login: 'stamphog',
    });
  });

  it('keeps a direct request even after a teammate approved', () => {
    const pr = teamRequestedPr({
      reviewDecision: 'APPROVED',
      reviews: [approvedBy('sakce')],
    });
    expect(approvalFor(pr, DIRECT_REQUEST, viewer)).toBeNull();
  });

  it('keeps a team request approved only by someone outside the team', () => {
    const pr = teamRequestedPr({ reviews: [approvedBy('outsider')] });
    expect(approvalFor(pr, TEAM_REQUEST, viewer)).toBeNull();
  });
});
