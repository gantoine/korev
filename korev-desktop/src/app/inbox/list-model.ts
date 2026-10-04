import type {
  InboxSnapshot,
  MyEntry,
  MyPr,
  ReviewItem,
} from '../../shared/inbox';
import type { StackInfo, StackLayer } from '../../shared/pull-request';
import {
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
  | { kind: 'review'; key: string; item: ReviewItem }
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

const REVIEW_GROUP = 'reviews';

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
  return { kind: 'review', key: prRef(item.pr), item };
}

function mineEntries(snapshot: InboxSnapshot): MyEntry[] {
  return snapshot.mine.flatMap((section) => section.entries);
}

export const MINE_MODEL: ListModel = {
  placements: (snapshot) =>
    snapshot.mine.flatMap((section) =>
      entryPlacements(section.entries, section.bucket),
    ),
  refresh: (held, incoming) => {
    const index = indexEntries(mineEntries(incoming));
    return {
      ...incoming,
      mine: held.mine.map((section) => ({
        ...section,
        entries: refreshEntries(section.entries, index),
      })),
    };
  },
  subjects: (snapshot) => entrySubjects(mineEntries(snapshot), mineSubject),
  isEmpty: (snapshot) => mineEntries(snapshot).length === 0,
};

export const REVIEW_MODEL: ListModel = {
  placements: (snapshot) => entryPlacements(snapshot.reviews, REVIEW_GROUP),
  refresh: (held, incoming) => ({
    ...incoming,
    reviews: refreshEntries(held.reviews, indexEntries(incoming.reviews)),
  }),
  subjects: (snapshot) => entrySubjects(snapshot.reviews, reviewSubject),
  isEmpty: (snapshot) => snapshot.reviews.length === 0,
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
