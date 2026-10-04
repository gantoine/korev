import { useId } from 'react';
import { EmptyState } from '../design-system';
import type {
  Bucket,
  InboxSnapshot,
  MyEntry,
  MyRepoGroup,
  MySection,
  MyStack,
} from '../shared/inbox';
import { InboxList } from './inbox/InboxList';
import { LoadError, LoadingList, RepoSkeletons } from './inbox/InboxStates';
import { MINE_MODEL } from './inbox/list-model';
import { MyPrRow } from './inbox/MyPrRow';
import { OtherLayerRow } from './inbox/OtherLayerRow';
import { inboxPhase } from './inbox/phase';
import { RepoBlock } from './inbox/RepoHeader';
import { groupNeedsYouCount, groupOpenCount } from './inbox/selectors';
import { StackGroup, StackLayerItem, byPosition } from './inbox/StackGroup';
import {
  useCollapsedRepos,
  type CollapsedRepos,
} from './inbox/useCollapsedRepos';

const BUCKET_ORDER: Bucket[] = ['needs-you', 'in-progress', 'ready'];

const BUCKET_LABELS: Record<Bucket, string> = {
  'needs-you': 'Needs you',
  'in-progress': 'In progress',
  ready: 'Ready to merge',
};

const LIST_LABEL = 'My pull requests';

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

function orderedSections(group: MyRepoGroup): MySection[] {
  return BUCKET_ORDER.flatMap((bucket) =>
    group.sections.filter(
      (section) => section.bucket === bucket && section.entries.length > 0,
    ),
  );
}

function urgentLabel(group: MyRepoGroup): string | null {
  const needsYou = groupNeedsYouCount(group);
  return needsYou > 0 ? `${needsYou} need you` : null;
}

interface MyRepoViewProps {
  group: MyRepoGroup;
  collapsed: CollapsedRepos;
}

function MyRepoView({ group, collapsed }: MyRepoViewProps) {
  const sections = orderedSections(group);
  if (sections.length === 0) return null;
  return (
    <RepoBlock
      repo={group.repo}
      countLabel={`${groupOpenCount(group)} open`}
      urgentLabel={urgentLabel(group)}
      expanded={!collapsed.isCollapsed(group.repo)}
      onToggle={() => collapsed.toggle(group.repo)}
    >
      {sections.map((section) => (
        <SectionBlock key={section.bucket} section={section} />
      ))}
    </RepoBlock>
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
  const collapsed = useCollapsedRepos('mine');
  const phase = inboxPhase(snapshot);
  if (phase.kind === 'loading') {
    return (
      <LoadingList>
        <RepoSkeletons />
      </LoadingList>
    );
  }
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
        displayed.mine.map((group) => (
          <MyRepoView key={group.repo} group={group} collapsed={collapsed} />
        ))
      }
    </InboxList>
  );
}
