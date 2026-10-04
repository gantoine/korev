import type {
  Approval,
  ApprovedReview,
  InboxSnapshot,
  MyEntry,
  MyPr,
  ReviewEntry,
  ReviewItem,
} from '../../shared/inbox';
import type { StackInfo, StackLayer } from '../../shared/pull-request';
import {
  approvedKey,
  entryPlacements,
  indexEntries,
  layerRef,
  refreshEntries,
  type EntryShape,
  type ItemShape,
  type LayerShape,
  type StackShape,
} from './entries';
import { prRef } from './pr-ref';
import type { Placement } from './structure';

export type PanelSubject =
  | { kind: 'mine'; key: string; item: MyPr }
  | {
      kind: 'review';
      key: string;
      item: ReviewItem;
      approval: Approval | null;
    }
  | {
      kind: 'layer';
      key: string;
      repo: string;
      layer: StackLayer;
      stack: StackInfo | null;
    };

export type SubjectIndex = Map<string, PanelSubject>;

export interface ListModel {
  placements(snapshot: InboxSnapshot): Placement[];
  refresh(held: InboxSnapshot, incoming: InboxSnapshot): InboxSnapshot;
  subjects(snapshot: InboxSnapshot): SubjectIndex;
  isEmpty(snapshot: InboxSnapshot): boolean;
}

const APPROVED_GROUP_SUFFIX = ':approved';

function stackInfoOf<Item extends ItemShape>(
  layers: LayerShape<Item>[],
): StackInfo | null {
  for (const layer of layers) {
    if (layer.kind !== 'other' && layer.item.pr.stack) {
      return layer.item.pr.stack;
    }
  }
  return null;
}

function layerSubject(
  repo: string,
  layer: StackLayer,
  stack: StackInfo | null,
): PanelSubject {
  return { kind: 'layer', key: layerRef(repo, layer), repo, layer, stack };
}

function stackSubjects<Item extends ItemShape>(
  stack: StackShape<LayerShape<Item>>,
  wrap: (item: Item) => PanelSubject,
): PanelSubject[] {
  const info = stackInfoOf(stack.layers);
  return stack.layers.map((layer) =>
    layer.kind === 'other'
      ? layerSubject(stack.repo, layer.layer, info)
      : wrap(layer.item),
  );
}

function entrySubjects<
  Item extends ItemShape,
  Stack extends StackShape<LayerShape<Item>>,
>(
  entries: EntryShape<Item, Stack>[],
  wrap: (item: Item) => PanelSubject,
): SubjectIndex {
  const subjects = entries.flatMap((entry) =>
    entry.kind === 'pr' ? [wrap(entry.item)] : stackSubjects(entry.stack, wrap),
  );
  return new Map(subjects.map((subject) => [subject.key, subject]));
}

function mineSubject(item: MyPr): PanelSubject {
  return { kind: 'mine', key: prRef(item.pr), item };
}

function reviewSubject(item: ReviewItem): PanelSubject {
  return { kind: 'review', key: prRef(item.pr), item, approval: null };
}

function approvedSubject({ item, approval }: ApprovedReview): PanelSubject {
  return { kind: 'review', key: approvedKey(item.pr), item, approval };
}

function mineEntries(snapshot: InboxSnapshot): MyEntry[] {
  return snapshot.mine.flatMap((group) =>
    group.sections.flatMap((section) => section.entries),
  );
}

function reviewEntries(snapshot: InboxSnapshot): ReviewEntry[] {
  return snapshot.reviews.flatMap((group) => group.entries);
}

function approvedReviews(snapshot: InboxSnapshot): ApprovedReview[] {
  return snapshot.reviews.flatMap((group) => group.approved);
}

function keyOfApproved(approved: ApprovedReview): string {
  return approvedKey(approved.item.pr);
}

export const MINE_MODEL: ListModel = {
  placements: (snapshot) =>
    snapshot.mine.flatMap((group) =>
      group.sections.flatMap((section) =>
        entryPlacements(section.entries, `${group.repo}:${section.bucket}`),
      ),
    ),
  refresh: (held, incoming) => {
    const index = indexEntries(mineEntries(incoming));
    return {
      ...incoming,
      mine: held.mine.map((group) => ({
        ...group,
        sections: group.sections.map((section) => ({
          ...section,
          entries: refreshEntries(section.entries, index),
        })),
      })),
    };
  },
  subjects: (snapshot) => entrySubjects(mineEntries(snapshot), mineSubject),
  isEmpty: (snapshot) => mineEntries(snapshot).length === 0,
};

export const REVIEW_MODEL: ListModel = {
  placements: (snapshot) =>
    snapshot.reviews.flatMap((group) => [
      ...entryPlacements(group.entries, group.repo),
      ...group.approved.map((approved) => ({
        key: keyOfApproved(approved),
        group: `${group.repo}${APPROVED_GROUP_SUFFIX}`,
      })),
    ]),
  refresh: (held, incoming) => {
    const index = indexEntries(reviewEntries(incoming));
    const latestApproved = new Map(
      approvedReviews(incoming).map((approved) => [
        keyOfApproved(approved),
        approved,
      ]),
    );
    return {
      ...incoming,
      reviews: held.reviews.map((group) => ({
        ...group,
        entries: refreshEntries(group.entries, index),
        approved: group.approved.map(
          (approved) => latestApproved.get(keyOfApproved(approved)) ?? approved,
        ),
      })),
    };
  },
  subjects: (snapshot) => {
    const approved = approvedReviews(snapshot).map(approvedSubject);
    return new Map([
      ...entrySubjects(reviewEntries(snapshot), reviewSubject),
      ...approved.map((subject) => [subject.key, subject] as const),
    ]);
  },
  isEmpty: (snapshot) =>
    reviewEntries(snapshot).length === 0 &&
    approvedReviews(snapshot).length === 0,
};

export interface SubjectSummary {
  title: string;
  url: string;
  reference: string;
  authorLogin: string | null;
}

export function subjectSummary(subject: PanelSubject): SubjectSummary {
  if (subject.kind === 'layer') {
    const { layer } = subject;
    return {
      title: layer.title,
      url: layer.url,
      reference: subject.key,
      authorLogin: layer.authorLogin,
    };
  }
  const { pr } = subject.item;
  return {
    title: pr.title,
    url: pr.url,
    reference: subject.key,
    authorLogin: pr.authorLogin,
  };
}
