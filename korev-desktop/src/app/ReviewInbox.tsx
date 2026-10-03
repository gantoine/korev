import { useState } from 'react';
import { EmptyState, Icon, cn } from '../design-system';
import type {
  InboxSnapshot,
  ReviewEntry,
  ReviewStack,
  ReviewStackLayer,
} from '../shared/inbox';
import { formatSynced, joinMeta, pluralize } from './format';
import {
  LoadError,
  LoadingList,
  SkeletonRows,
  TruncatedNotice,
} from './inbox/InboxStates';
import { REVIEW_GRID } from './inbox/grid';
import { OtherLayerRow } from './inbox/OtherLayerRow';
import { inboxPhase } from './inbox/phase';
import { ReviewRow } from './inbox/ReviewRow';
import { StackGroup, StackLayerItem, byPosition } from './inbox/StackGroup';
import { NARROW_HIDDEN } from './layout';
import { MINUTE_MS, useNow } from './useNow';

const SKELETON_ROWS = 5;

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
  layer,
  size,
}: {
  layer: ReviewStackLayer;
  size: number;
}) {
  if (layer.kind === 'other') {
    return <OtherLayerRow layer={layer.layer} stackSize={size} />;
  }
  return (
    <ReviewRow
      item={layer.item}
      stackPlace={{ position: layer.position, size }}
    />
  );
}

function OtherLayersToggle({
  summary,
  expanded,
  onToggle,
}: {
  summary: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent py-2 pr-5 pl-20 text-left font-sans text-xs text-fg-3 hover:bg-hover hover:text-fg-1 focus-visible:relative focus-visible:shadow-focus"
      >
        {summary}
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
    </li>
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
          summary={otherLayersSummary(others)}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
        />
      ) : null}
      {visible.map((layer) => (
        <StackLayerItem key={layer.position}>
          <ReviewLayer layer={layer} size={stack.size} />
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

export function ReviewInbox({ snapshot }: { snapshot: InboxSnapshot | null }) {
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
  const { reviews, truncated, syncedAt } = phase.snapshot;
  if (reviews.length === 0) return <NoReviews syncedAt={syncedAt} />;
  return (
    <div className="pb-6">
      {truncated.reviews ? <TruncatedNotice /> : null}
      <ColumnHeader />
      <ul className="m-0 list-none p-0">
        {reviews.map((entry) => (
          <li key={entryKey(entry)}>
            <ReviewEntryView entry={entry} />
          </li>
        ))}
      </ul>
    </div>
  );
}
