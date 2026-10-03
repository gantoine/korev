import { Badge, SizeBadge, cn } from '../../design-system';
import type { ReviewItem, ReviewRequest } from '../../shared/inbox';
import { formatAge, joinMeta, pluralize } from '../format';
import { NARROW_HIDDEN } from '../layout';
import { MINUTE_MS, useNow } from '../useNow';
import { CiIcon } from './CiIcon';
import { REVIEW_GRID, REVIEW_LAYER_GRID } from './grid';
import {
  LayerLabel,
  PrRow,
  PrSummary,
  authorHandle,
  prRef,
  type StackPlace,
} from './PrRow';
import { PriorityBadge } from './PriorityBadge';

function requestSource(request: ReviewRequest): string {
  if (!request.direct && request.team) return `via ${request.team}`;
  return 'Requested from you';
}

function requestTiming(item: ReviewItem, now: number): string[] {
  const { request, pr } = item;
  if (request.approximate) {
    return [
      `PR opened ${formatAge(pr.createdAt, now)} ago`,
      'request time unknown',
    ];
  }
  return [requestSource(request), formatAge(request.requestedAt, now)];
}

function blocksNote(blocksLayers: number): string | null {
  if (blocksLayers === 0) return null;
  return `blocks ${pluralize(blocksLayers, 'layer')}`;
}

function reviewMeta(item: ReviewItem, now: number, inStack: boolean): string {
  const { pr } = item;
  return joinMeta([
    authorHandle(pr.authorLogin),
    inStack ? `#${pr.number}` : prRef(pr),
    ...requestTiming(item, now),
    blocksNote(item.blocksLayers),
  ]);
}

export interface ReviewRowProps {
  item: ReviewItem;
  stackPlace?: StackPlace;
}

export function ReviewRow({ item, stackPlace }: ReviewRowProps) {
  const now = useNow(MINUTE_MS);
  const { pr, size, priority } = item;
  return (
    <PrRow
      url={pr.url}
      className={stackPlace ? REVIEW_LAYER_GRID : REVIEW_GRID}
    >
      {stackPlace ? <LayerLabel {...stackPlace} /> : null}
      <PriorityBadge priority={priority} />
      <PrSummary
        title={pr.title}
        meta={reviewMeta(item, now, Boolean(stackPlace))}
      />
      <span
        className={cn('text-right font-mono text-xs text-fg-2', NARROW_HIDDEN)}
      >
        {pr.changedFiles}
        <span className="sr-only"> files</span>
      </span>
      <SizeBadge {...size} />
      <span>{pr.isDraft ? <Badge outline>Draft</Badge> : null}</span>
      <CiIcon state={pr.ci} checks={pr.checks} />
    </PrRow>
  );
}
