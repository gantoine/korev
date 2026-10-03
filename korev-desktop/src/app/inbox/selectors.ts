import type {
  InboxSnapshot,
  ReviewEntry,
  ReviewItem,
} from '../../shared/inbox';

function requestedInEntry(entry: ReviewEntry): ReviewItem[] {
  if (entry.kind === 'pr') return [entry.item];
  return entry.stack.layers.flatMap((layer) =>
    layer.kind === 'requested' ? [layer.item] : [],
  );
}

export function requestedItems(snapshot: InboxSnapshot): ReviewItem[] {
  return snapshot.reviews.flatMap(requestedInEntry);
}

export function needsYouCount(snapshot: InboxSnapshot): number {
  return snapshot.mine
    .filter((section) => section.bucket === 'needs-you')
    .reduce((total, section) => total + section.count, 0);
}

export function openCount(snapshot: InboxSnapshot): number {
  return snapshot.mine.reduce((total, section) => total + section.count, 0);
}

export function hasTopPriority(snapshot: InboxSnapshot): boolean {
  return requestedItems(snapshot).some((item) => item.priority.tier === 'P1');
}
