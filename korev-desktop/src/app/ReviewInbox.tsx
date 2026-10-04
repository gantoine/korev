import { useState } from 'react';
import { EmptyState, cn } from '../design-system';
import type {
  ApprovedReview,
  InboxSnapshot,
  ReviewEntry,
  ReviewRepoGroup,
  ReviewStack,
  ReviewStackLayer,
} from '../shared/inbox';
import { formatSynced, joinMeta, pluralize } from './format';
import { approvedKey, approvedToggleKey, toggleKey } from './inbox/entries';
import { REVIEW_GRID } from './inbox/grid';
import { InboxList } from './inbox/InboxList';
import { LoadError, LoadingList, RepoSkeletons } from './inbox/InboxStates';
import { REVIEW_MODEL } from './inbox/list-model';
import { OtherLayerRow } from './inbox/OtherLayerRow';
import { inboxPhase } from './inbox/phase';
import { RepoBlock } from './inbox/RepoHeader';
import { ApprovedRow, ReviewRow } from './inbox/ReviewRow';
import {
  requestedInGroup,
  requestedItems,
  topPriorityCount,
} from './inbox/selectors';
import { StackGroup, StackLayerItem, byPosition } from './inbox/StackGroup';
import { ToggleRow } from './inbox/ToggleRow';
import {
  useCollapsedRepos,
  type CollapsedRepos,
} from './inbox/useCollapsedRepos';
import { NARROW_HIDDEN } from './layout';
import { MINUTE_MS, useNow } from './useNow';

const LIST_LABEL = 'Review requests';
const NO_REVIEWS = 'No reviews waiting on you.';

type OtherLayer = Extract<ReviewStackLayer, { kind: 'other' }>;

function isOtherLayer(layer: ReviewStackLayer): layer is OtherLayer {
  return layer.kind === 'other';
}

function otherLayersSummary(others: OtherLayer[]): string {
  const merged = others.filter((other) => other.layer.state === 'MERGED');
  return joinMeta([
    pluralize(others.length, 'other layer'),
    merged.length > 0 ? `${merged.length} merged` : null,
  ]);
}

function ReviewLayer({
  repo,
  layer,
  size,
}: {
  repo: string;
  layer: ReviewStackLayer;
  size: number;
}) {
  if (layer.kind === 'other') {
    return <OtherLayerRow repo={repo} layer={layer.layer} stackSize={size} />;
  }
  return (
    <ReviewRow
      item={layer.item}
      stackPlace={{ position: layer.position, size }}
    />
  );
}

function ReviewStackGroup({ stack }: { stack: ReviewStack }) {
  const [expanded, setExpanded] = useState(false);
  const layers = byPosition(stack.layers);
  const others = layers.filter(isOtherLayer);
  const visible = expanded
    ? layers
    : layers.filter((layer) => !isOtherLayer(layer));
  return (
    <StackGroup
      repo={stack.repo}
      baseRefName={stack.baseRefName}
      summary={`you're asked on ${stack.requestedCount} of ${stack.size}`}
      partial={stack.partial}
    >
      {others.length > 0 ? (
        <ToggleRow
          optionKey={toggleKey(stack.id)}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
          className="pl-20"
        >
          {otherLayersSummary(others)}
        </ToggleRow>
      ) : null}
      {visible.map((layer) => (
        <StackLayerItem key={layer.position}>
          <ReviewLayer repo={stack.repo} layer={layer} size={stack.size} />
        </StackLayerItem>
      ))}
    </StackGroup>
  );
}

function entryKey(entry: ReviewEntry): string {
  return entry.kind === 'pr' ? entry.item.pr.id : entry.stack.id;
}

function ReviewEntryView({ entry }: { entry: ReviewEntry }) {
  if (entry.kind === 'stack') return <ReviewStackGroup stack={entry.stack} />;
  return <ReviewRow item={entry.item} />;
}

function ColumnHeader() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid items-end gap-3 px-5 pt-3 pb-1 type-overline text-fg-3',
        REVIEW_GRID,
      )}
    >
      <span>Suggested priority</span>
      <span>Pull request</span>
      <span className={cn('text-right', NARROW_HIDDEN)}>Files</span>
      <span>Size</span>
      <span />
      <span>CI</span>
    </div>
  );
}

function NoReviews({ syncedAt }: { syncedAt: string | null }) {
  const now = useNow(MINUTE_MS);
  return (
    <EmptyState
      icon="inbox"
      title={NO_REVIEWS}
      description={syncedAt ? formatSynced(syncedAt, now) : undefined}
    />
  );
}

function ApprovedSection({
  repo,
  approved,
}: {
  repo: string;
  approved: ApprovedReview[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <ToggleRow
        optionKey={approvedToggleKey(repo)}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        className="pl-5"
      >
        Already approved
        <span className="font-mono text-fg-2">{approved.length}</span>
      </ToggleRow>
      {expanded
        ? approved.map((review) => (
            <ApprovedRow key={approvedKey(review.item.pr)} approved={review} />
          ))
        : null}
    </>
  );
}

function urgentLabel(group: ReviewRepoGroup): string | null {
  const topPriority = topPriorityCount(requestedInGroup(group));
  return topPriority > 0 ? `${topPriority} P1` : null;
}

interface ReviewRepoViewProps {
  group: ReviewRepoGroup;
  avatarUrl?: string;
  collapsed: CollapsedRepos;
}

function ReviewRepoView({ group, avatarUrl, collapsed }: ReviewRepoViewProps) {
  if (group.entries.length === 0 && group.approved.length === 0) return null;
  return (
    <RepoBlock
      repo={group.repo}
      avatarUrl={avatarUrl}
      countLabel={`${requestedInGroup(group).length} waiting`}
      urgentLabel={urgentLabel(group)}
      expanded={!collapsed.isCollapsed(group.repo)}
      onToggle={() => collapsed.toggle(group.repo)}
    >
      {group.entries.map((entry) => (
        <ReviewEntryView key={entryKey(entry)} entry={entry} />
      ))}
      {group.approved.length > 0 ? (
        <ApprovedSection repo={group.repo} approved={group.approved} />
      ) : null}
    </RepoBlock>
  );
}

function ReviewGroups({
  snapshot,
  collapsed,
}: {
  snapshot: InboxSnapshot;
  collapsed: CollapsedRepos;
}) {
  return (
    <>
      {requestedItems(snapshot).length === 0 ? (
        <p className="m-0 px-5 pt-4 pb-2 text-sm text-fg-2">{NO_REVIEWS}</p>
      ) : null}
      {snapshot.reviews.map((group) => (
        <ReviewRepoView
          key={group.repo}
          group={group}
          avatarUrl={snapshot.repoAvatars[group.repo]}
          collapsed={collapsed}
        />
      ))}
    </>
  );
}

export interface ReviewInboxProps {
  snapshot: InboxSnapshot | null;
  onOpenSettings: () => void;
}

export function ReviewInbox({ snapshot, onOpenSettings }: ReviewInboxProps) {
  const collapsed = useCollapsedRepos('review');
  const phase = inboxPhase(snapshot);
  if (phase.kind === 'loading') {
    return (
      <LoadingList>
        <RepoSkeletons />
      </LoadingList>
    );
  }
  if (phase.kind === 'failed') {
    return (
      <LoadError
        title="Couldn't load review requests"
        message={phase.message}
      />
    );
  }
  return (
    <InboxList
      snapshot={phase.snapshot}
      model={REVIEW_MODEL}
      view="review"
      label={LIST_LABEL}
      onOpenSettings={onOpenSettings}
      header={<ColumnHeader />}
      empty={<NoReviews syncedAt={phase.snapshot.syncedAt} />}
    >
      {(displayed) => (
        <ReviewGroups snapshot={displayed} collapsed={collapsed} />
      )}
    </InboxList>
  );
}
