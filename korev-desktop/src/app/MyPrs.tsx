import { useId } from 'react';
import { EmptyState, Skeleton } from '../design-system';
import type {
  Bucket,
  InboxSnapshot,
  MyEntry,
  MySection,
  MyStack,
} from '../shared/inbox';
import { InboxList } from './inbox/InboxList';
import { LoadError, LoadingList, SkeletonRows } from './inbox/InboxStates';
import { MINE_MODEL } from './inbox/list-model';
import { MyPrRow } from './inbox/MyPrRow';
import { OtherLayerRow } from './inbox/OtherLayerRow';
import { inboxPhase } from './inbox/phase';
import { StackGroup, StackLayerItem, byPosition } from './inbox/StackGroup';

const BUCKET_ORDER: Bucket[] = ['needs-you', 'in-progress', 'ready'];

const BUCKET_LABELS: Record<Bucket, string> = {
  'needs-you': 'Needs you',
  'in-progress': 'In progress',
  ready: 'Ready to merge',
};

const LIST_LABEL = 'My pull requests';
const SKELETON_ROWS_PER_SECTION = 3;

function MyStackGroup({ stack }: { stack: MyStack }) {
  return (
    <StackGroup
      repo={stack.repo}
      baseRefName={stack.baseRefName}
      summary={stack.headline}
      partial={stack.partial}
    >
      {byPosition(stack.layers).map((layer) => (
        <StackLayerItem key={layer.position}>
          {layer.kind === 'mine' ? (
            <MyPrRow
              item={layer.item}
              stackPlace={{ position: layer.position, size: stack.size }}
            />
          ) : (
            <OtherLayerRow
              repo={stack.repo}
              layer={layer.layer}
              stackSize={stack.size}
            />
          )}
        </StackLayerItem>
      ))}
    </StackGroup>
  );
}

function entryKey(entry: MyEntry): string {
  return entry.kind === 'pr' ? entry.item.pr.id : entry.stack.id;
}

function MyEntryView({ entry }: { entry: MyEntry }) {
  if (entry.kind === 'stack') return <MyStackGroup stack={entry.stack} />;
  return <MyPrRow item={entry.item} />;
}

interface SectionHeadingProps {
  id: string;
  label: string;
  count: number;
}

function SectionHeading({ id, label, count }: SectionHeadingProps) {
  return (
    <h2
      id={id}
      className="m-0 flex items-center gap-2 px-5 pt-4 pb-1.5 type-overline text-fg-3"
    >
      {label}
      <span className="font-mono text-fg-2">{count}</span>
    </h2>
  );
}

function SectionBlock({ section }: { section: MySection }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId}>
      <SectionHeading
        id={headingId}
        label={BUCKET_LABELS[section.bucket]}
        count={section.count}
      />
      {section.entries.map((entry) => (
        <MyEntryView key={entryKey(entry)} entry={entry} />
      ))}
    </div>
  );
}

function orderedSections(snapshot: InboxSnapshot): MySection[] {
  return BUCKET_ORDER.flatMap((bucket) =>
    snapshot.mine.filter(
      (section) => section.bucket === bucket && section.entries.length > 0,
    ),
  );
}

function MyPrsSkeleton() {
  return (
    <LoadingList>
      {BUCKET_ORDER.map((bucket) => (
        <div key={bucket}>
          <div className="px-5 pt-4 pb-1.5">
            <Skeleton className="h-2.5 w-20" />
          </div>
          <SkeletonRows count={SKELETON_ROWS_PER_SECTION} />
        </div>
      ))}
    </LoadingList>
  );
}

const NOTHING_NEEDS_YOU = (
  <EmptyState
    icon="check-check"
    title="Nothing needs you."
    description="You have no open PRs in the repos Korev watches."
  />
);

export interface MyPrsProps {
  snapshot: InboxSnapshot | null;
  onOpenSettings: () => void;
}

export function MyPrs({ snapshot, onOpenSettings }: MyPrsProps) {
  const phase = inboxPhase(snapshot);
  if (phase.kind === 'loading') return <MyPrsSkeleton />;
  if (phase.kind === 'failed') {
    return <LoadError title="Couldn't load your PRs" message={phase.message} />;
  }
  return (
    <InboxList
      snapshot={phase.snapshot}
      model={MINE_MODEL}
      view="mine"
      label={LIST_LABEL}
      onOpenSettings={onOpenSettings}
      empty={NOTHING_NEEDS_YOU}
    >
      {(displayed) =>
        orderedSections(displayed).map((section) => (
          <SectionBlock key={section.bucket} section={section} />
        ))
      }
    </InboxList>
  );
}
