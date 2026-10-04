import type {
  ApprovedReview,
  MyRepoGroup,
  ReviewItem,
  ReviewRepoGroup,
} from '../shared/inbox';
import type { MergeTool } from '../shared/merge';
import type { PullRequest } from '../shared/pull-request';
import { approvalFor } from './approval';
import { classifyMyPr } from './classify';
import type { UnknownMergeStreaks } from './merge-streaks';
import { compareReviewItems, priority } from './priority';
import { queueStatusFor } from './queue-status';
import { groupByRepo, sortByRepoOrder } from './repo-order';
import { reviewRequestFor, type Viewer } from './request-age';
import { prSize } from './size';
import { blocksLayers, groupMyPrs, groupReviews } from './stacks';

export interface InboxInput {
  mine: PullRequest[];
  reviews: PullRequest[];
  viewer: Viewer;
  now: Date;
  unknownMergeStreaks: UnknownMergeStreaks;
  repoOrder: string[];
  mergeWith: Record<string, MergeTool>;
}

export interface Inbox {
  mine: MyRepoGroup[];
  reviews: ReviewRepoGroup[];
  reviewCount: number;
}

interface SortedReview {
  item: ReviewItem;
  approved: ApprovedReview | null;
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

function sortReview(item: ReviewItem, viewer: Viewer): SortedReview {
  const approval = approvalFor(item.pr, item.request, viewer);
  return { item, approved: approval ? { item, approval } : null };
}

function toReviewGroup(repo: string, sorted: SortedReview[]): ReviewRepoGroup {
  const waiting = sorted.filter((review) => !review.approved);
  const approved = sorted
    .flatMap((review) => (review.approved ? [review.approved] : []))
    .sort((left, right) => compareReviewItems(left.item, right.item));
  return {
    repo,
    entries: groupReviews(waiting.map((review) => review.item)),
    approved,
  };
}

export function buildInbox({
  mine,
  reviews,
  viewer,
  now,
  unknownMergeStreaks,
  repoOrder,
  mergeWith,
}: InboxInput): Inbox {
  const classified = mine.map((pr) =>
    classifyMyPr(pr, {
      unknownMergeStreak: unknownMergeStreaks[pr.id] ?? 0,
      queue: queueStatusFor(pr, mergeWith[pr.repo] ?? 'github'),
    }),
  );
  const mineGroups = groupByRepo(classified, (item) => item.pr.repo).map(
    ([repo, items]) => ({ repo, sections: groupMyPrs(items) }),
  );
  const sorted = reviews.map((pr) =>
    sortReview(toReviewItem(pr, viewer, now), viewer),
  );
  const reviewGroups = groupByRepo(sorted, (review) => review.item.pr.repo).map(
    ([repo, items]) => toReviewGroup(repo, items),
  );
  return {
    mine: sortByRepoOrder(mineGroups, repoOrder),
    reviews: sortByRepoOrder(reviewGroups, repoOrder),
    reviewCount: sorted.filter((review) => !review.approved).length,
  };
}
