import { Badge, SizeBadge, cn } from '../../design-system';
import type {
  Approval,
  ApprovedReview,
  ReviewItem,
  ReviewRequest,
} from '../../shared/inbox';
import { formatAge, joinMeta, pluralize } from '../format';
import { NARROW_HIDDEN } from '../layout';
import { MINUTE_MS, useNow } from '../useNow';
import { CiIcon } from './CiIcon';
import { approvedKey } from './entries';
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

function reviewMeta(item: ReviewItem, now: number): string {
  const { pr } = item;
  return joinMeta([
    authorHandle(pr.authorLogin),
    `#${pr.number}`,
    ...requestTiming(item, now),
    blocksNote(item.blocksLayers),
  ]);
}

export function approvalText(approval: Approval): string {
  switch (approval.kind) {
    case 'you':
      return 'You approved';
    case 'teammate':
      return `Approved by @${approval.login}`;
    case 'bot':
      return `Approved by bot @${approval.login}`;
    default:
      return 'Approved';
  }
}

export function ApprovalBadge({ approval }: { approval: Approval }) {
  if (approval.kind === 'bot') return <Badge>Bot approved</Badge>;
  return <Badge tone="success">Approved</Badge>;
}

function approvedMeta({ item, approval }: ApprovedReview): string {
  return joinMeta([
    authorHandle(item.pr.authorLogin),
    `#${item.pr.number}`,
    requestSource(item.request),
    approvalText(approval),
  ]);
}

interface ReviewColumnsProps {
  item: ReviewItem;
}

function ReviewColumns({ item }: ReviewColumnsProps) {
  const { pr, size } = item;
  return (
    <>
      <span
        className={cn('text-right font-mono text-xs text-fg-2', NARROW_HIDDEN)}
      >
        {pr.changedFiles}
        <span className="sr-only"> files</span>
      </span>
      <SizeBadge {...size} />
      <span>{pr.isDraft ? <Badge outline>Draft</Badge> : null}</span>
      <CiIcon state={pr.ci} checks={pr.checks} />
    </>
  );
}

export interface ReviewRowProps {
  item: ReviewItem;
  stackPlace?: StackPlace;
}

export function ReviewRow({ item, stackPlace }: ReviewRowProps) {
  const now = useNow(MINUTE_MS);
  const { pr, priority } = item;
  return (
    <PrRow
      optionKey={prRef(pr)}
      url={pr.url}
      className={stackPlace ? REVIEW_LAYER_GRID : REVIEW_GRID}
    >
      {stackPlace ? <LayerLabel {...stackPlace} /> : null}
      <PriorityBadge priority={priority} />
      <PrSummary title={pr.title} meta={reviewMeta(item, now)} />
      <ReviewColumns item={item} />
    </PrRow>
  );
}

export function ApprovedRow({ approved }: { approved: ApprovedReview }) {
  const { pr } = approved.item;
  return (
    <PrRow optionKey={approvedKey(pr)} url={pr.url} className={REVIEW_GRID}>
      <span>
        <ApprovalBadge approval={approved.approval} />
      </span>
      <PrSummary title={pr.title} meta={approvedMeta(approved)} />
      <ReviewColumns item={approved.item} />
    </PrRow>
  );
}
