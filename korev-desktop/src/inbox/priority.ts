import type {
  Priority,
  PriorityTier,
  ReviewItem,
  ReviewRequest,
  SizeInfo,
} from '../shared/inbox';
import type { CiState } from '../shared/pull-request';
import { countOf, formatAge } from './format';

export interface PriorityInput {
  request: ReviewRequest;
  size: SizeInfo;
  blocksLayers: number;
  isDraft: boolean;
  ci: CiState;
}

interface Factor {
  points: number;
  reason: string | null;
}

const MS_PER_DAY = 86_400_000;
const WAIT_POINTS_PER_DAY = 10;
const MAX_WAIT_POINTS = 50;
const DIRECT_REQUEST_POINTS = 20;
const BLOCKS_STACK_POINTS = 15;
const SMALL_SIZE_POINTS = 10;
const CI_PASSING_POINTS = 5;
const DRAFT_SCORE = -1;
const APPROXIMATE_MARK = '~';

const TIER_THRESHOLDS: readonly { tier: PriorityTier; minScore: number }[] = [
  { tier: 'P1', minScore: 50 },
  { tier: 'P2', minScore: 25 },
];

const LOWEST_TIER: PriorityTier = 'P3';

const DRAFT_PRIORITY: Priority = {
  tier: LOWEST_TIER,
  score: DRAFT_SCORE,
  reasons: ['Draft'],
};

function requestFactor(request: ReviewRequest): Factor {
  if (request.direct) {
    return {
      points: DIRECT_REQUEST_POINTS,
      reason: 'Requested from you directly',
    };
  }
  const reason = request.team ? `Requested via ${request.team}` : null;
  return { points: 0, reason };
}

function waitFactor(request: ReviewRequest, now: Date): Factor {
  const waitedDays =
    Math.max(0, now.getTime() - Date.parse(request.requestedAt)) / MS_PER_DAY;
  const mark = request.approximate ? APPROXIMATE_MARK : '';
  return {
    points: Math.min(MAX_WAIT_POINTS, waitedDays * WAIT_POINTS_PER_DAY),
    reason: `waiting ${mark}${formatAge(request.requestedAt, now)}`,
  };
}

function blocksFactor(blocksLayers: number): Factor {
  if (blocksLayers === 0) return { points: 0, reason: null };
  return {
    points: BLOCKS_STACK_POINTS,
    reason: `blocks ${countOf(blocksLayers, 'layer')}`,
  };
}

function sizeFactor(size: SizeInfo): Factor {
  if (size.size !== 'S') return { points: 0, reason: null };
  return { points: SMALL_SIZE_POINTS, reason: 'small' };
}

function ciFactor(ci: CiState): Factor {
  if (ci !== 'passing') return { points: 0, reason: null };
  return { points: CI_PASSING_POINTS, reason: 'CI passing' };
}

function tierFor(score: number): PriorityTier {
  const reached = TIER_THRESHOLDS.find(({ minScore }) => score >= minScore);
  return reached?.tier ?? LOWEST_TIER;
}

export function priority(input: PriorityInput, now: Date): Priority {
  if (input.isDraft) return DRAFT_PRIORITY;
  const factors = [
    requestFactor(input.request),
    waitFactor(input.request, now),
    blocksFactor(input.blocksLayers),
    sizeFactor(input.size),
    ciFactor(input.ci),
  ];
  const score = factors.reduce((total, factor) => total + factor.points, 0);
  const reasons = factors
    .map((factor) => factor.reason)
    .filter((reason): reason is string => reason !== null);
  return { tier: tierFor(score), score, reasons };
}

export function compareReviewItems(a: ReviewItem, b: ReviewItem): number {
  return (
    b.priority.score - a.priority.score ||
    Date.parse(a.request.requestedAt) - Date.parse(b.request.requestedAt) ||
    a.pr.number - b.pr.number ||
    a.pr.repo.localeCompare(b.pr.repo)
  );
}
