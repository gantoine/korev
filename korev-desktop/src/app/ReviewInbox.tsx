import { useState } from 'react';
import { EmptyState, Icon, cn } from '../design-system';
import type {
  InboxSnapshot,
  ReviewEntry,
  ReviewStack,
  ReviewStackLayer,
} from '../shared/inbox';
import { formatSynced, joinMeta, pluralize } from './format';
import { toggleKey } from './inbox/entries';
import { REVIEW_GRID } from './inbox/grid';
import { InboxList } from './inbox/InboxList';
import { LoadError, LoadingList, SkeletonRows } from './inbox/InboxStates';
import { REVIEW_MODEL } from './inbox/list-model';
import { useListOption } from './inbox/listbox';
import { OtherLayerRow } from './inbox/OtherLayerRow';
import { inboxPhase } from './inbox/phase';
import { ReviewRow } from './inbox/ReviewRow';
import { StackGroup, StackLayerItem, byPosition } from './inbox/StackGroup';
import { NARROW_HIDDEN } from './layout';
import { MINUTE_MS, useNow } from './useNow';

const SKELETON_ROWS = 5;
const LIST_LABEL = 'Review requests';

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

interface OtherLayersToggleProps {
  stackId: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
}

function OtherLayersToggle({
  stackId,
  summary,
  expanded,
  onToggle,
}: OtherLayersToggleProps) {
  const option = useListOption(toggleKey(stackId), { onActivate: onToggle });
  return (
    <div
      {...option}
      aria-expanded={expanded}
      className="flex w-full cursor-pointer items-center gap-1.5 py-2 pr-5 pl-20 text-left font-sans text-xs text-fg-3 hover:bg-hover hover:text-fg-1 aria-selected:bg-raised focus-visible:relative focus-visible:shadow-focus"
    >
      {summary}
      <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
    </div>
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
        <OtherLayersToggle
          stackId={stack.id}
          summary={otherLayersSummary(others)}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
        />
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
      title="No reviews waiting on you."
      description={syncedAt ? formatSynced(syncedAt, now) : undefined}
    />
  );
}

export interface ReviewInboxProps {
  snapshot: InboxSnapshot | null;
  onOpenSettings: () => void;
}

export function ReviewInbox({ snapshot, onOpenSettings }: ReviewInboxProps) {
  const phase = inboxPhase(snapshot);
  if (phase.kind === 'loading') {
    return (
      <LoadingList>
        <SkeletonRows count={SKELETON_ROWS} />
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
      {(displayed) =>
        displayed.reviews.map((entry) => (
          <ReviewEntryView key={entryKey(entry)} entry={entry} />
        ))
      }
    </InboxList>
  );
}
