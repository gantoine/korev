import type {
  InboxSnapshot,
  MyRepoGroup,
  ReviewEntry,
  ReviewItem,
  ReviewRepoGroup,
} from '../../shared/inbox';

function requestedInEntry(entry: ReviewEntry): ReviewItem[] {
  if (entry.kind === 'pr') return [entry.item];
  return entry.stack.layers.flatMap((layer) =>
    layer.kind === 'requested' ? [layer.item] : [],
  );
}

export function requestedInGroup(group: ReviewRepoGroup): ReviewItem[] {
  return group.entries.flatMap(requestedInEntry);
}

export function requestedItems(snapshot: InboxSnapshot): ReviewItem[] {
  return snapshot.reviews.flatMap(requestedInGroup);
}

export function groupNeedsYouCount(group: MyRepoGroup): number {
  return group.sections
    .filter((section) => section.bucket === 'needs-you')
    .reduce((total, section) => total + section.count, 0);
}

export function groupOpenCount(group: MyRepoGroup): number {
  return group.sections.reduce((total, section) => total + section.count, 0);
}

export function needsYouCount(snapshot: InboxSnapshot): number {
  return snapshot.mine.reduce(
    (total, group) => total + groupNeedsYouCount(group),
    0,
  );
}

export function openCount(snapshot: InboxSnapshot): number {
  return snapshot.mine.reduce(
    (total, group) => total + groupOpenCount(group),
    0,
  );
}

export function topPriorityCount(items: ReviewItem[]): number {
  return items.filter((item) => item.priority.tier === 'P1').length;
}

export function hasTopPriority(snapshot: InboxSnapshot): boolean {
  return topPriorityCount(requestedItems(snapshot)) > 0;
}
