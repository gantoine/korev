import { EmptyState, Skeleton } from '../design-system';
import type {
  Bucket,
  InboxSnapshot,
  MyEntry,
  MySection,
  MyStack,
} from '../shared/inbox';
import {
  LoadError,
  LoadingList,
  SkeletonRows,
  TruncatedNotice,
} from './inbox/InboxStates';
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
            <OtherLayerRow layer={layer.layer} stackSize={stack.size} />
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

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="m-0 flex items-center gap-2 px-5 pt-4 pb-1.5 type-overline text-fg-3">
      {label}
      <span className="font-mono text-fg-2">{count}</span>
    </h2>
  );
}

function SectionBlock({ section }: { section: MySection }) {
  return (
    <section>
      <SectionHeading
        label={BUCKET_LABELS[section.bucket]}
        count={section.count}
      />
      <ul className="m-0 list-none p-0">
        {section.entries.map((entry) => (
          <li key={entryKey(entry)}>
            <MyEntryView entry={entry} />
          </li>
        ))}
      </ul>
    </section>
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

export function MyPrs({ snapshot }: { snapshot: InboxSnapshot | null }) {
  const phase = inboxPhase(snapshot);
  if (phase.kind === 'loading') return <MyPrsSkeleton />;
  if (phase.kind === 'failed') {
    return <LoadError title="Couldn't load your PRs" message={phase.message} />;
  }
  const sections = orderedSections(phase.snapshot);
  if (sections.length === 0) {
    return (
      <EmptyState
        icon="check-check"
        title="Nothing needs you."
        description="You have no open PRs in the repos Korev watches."
      />
    );
  }
  return (
    <div className="pb-6">
      {phase.snapshot.truncated.mine ? <TruncatedNotice /> : null}
      {sections.map((section) => (
        <SectionBlock key={section.bucket} section={section} />
      ))}
    </div>
  );
}
