import type { MySection, ReviewEntry, ReviewItem } from '../shared/inbox';
import type { PullRequest } from '../shared/pull-request';
import { classifyMyPr } from './classify';
import type { UnknownMergeStreaks } from './merge-streaks';
import { priority } from './priority';
import { reviewRequestFor, type Viewer } from './request-age';
import { prSize } from './size';
import { blocksLayers, groupMyPrs, groupReviews } from './stacks';

export interface InboxInput {
  mine: PullRequest[];
  reviews: PullRequest[];
  viewer: Viewer;
  now: Date;
  unknownMergeStreaks: UnknownMergeStreaks;
}

export interface Inbox {
  mine: MySection[];
  reviews: ReviewEntry[];
  reviewCount: number;
}

function toReviewItem(pr: PullRequest, viewer: Viewer, now: Date): ReviewItem {
  const request = reviewRequestFor(pr, viewer);
  const size = prSize(pr);
  const blocking = blocksLayers(pr);
  return {
    pr,
    request,
    size,
    blocksLayers: blocking,
    priority: priority(
      { request, size, blocksLayers: blocking, isDraft: pr.isDraft, ci: pr.ci },
      now,
    ),
  };
}

export function buildInbox({
  mine,
  reviews,
  viewer,
  now,
  unknownMergeStreaks,
}: InboxInput): Inbox {
  const reviewItems = reviews.map((pr) => toReviewItem(pr, viewer, now));
  const classified = mine.map((pr) =>
    classifyMyPr(pr, { unknownMergeStreak: unknownMergeStreaks[pr.id] ?? 0 }),
  );
  return {
    mine: groupMyPrs(classified),
    reviews: groupReviews(reviewItems),
    reviewCount: reviewItems.length,
  };
}
