import type { MySection, ReviewEntry, ReviewItem } from '../shared/inbox';
import type { PullRequest } from '../shared/pull-request';
import { classifyMyPr } from './classify';
import { priority } from './priority';
import { reviewRequestFor, type Viewer } from './request-age';
import { prSize } from './size';
import { blocksLayers, groupMyPrs, groupReviews } from './stacks';

export interface InboxInput {
  mine: PullRequest[];
  reviews: PullRequest[];
  viewer: Viewer;
  now: Date;
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

export function buildInbox({ mine, reviews, viewer, now }: InboxInput): Inbox {
  const reviewItems = reviews.map((pr) => toReviewItem(pr, viewer, now));
  return {
    mine: groupMyPrs(mine.map(classifyMyPr)),
    reviews: groupReviews(reviewItems),
    reviewCount: reviewItems.length,
  };
}
