import type { ReactNode } from 'react';
import { Button, EmptyState, Skeleton } from '../../design-system';
import { refreshInbox } from '../useInboxSnapshot';

const SEARCH_CAP = 300;
const FALLBACK_ERROR = 'Korev could not reach GitHub.';

export interface LoadErrorProps {
  title: string;
  message: string | null;
}

export function LoadError({ title, message }: LoadErrorProps) {
  return (
    <EmptyState
      icon="octagon-alert"
      title={title}
      description={message ?? FALLBACK_ERROR}
      action={
        <Button icon="refresh-cw" onClick={() => void refreshInbox()}>
          Retry
        </Button>
      }
    />
  );
}

export function TruncatedNotice() {
  return (
    <p className="mx-5 mt-3 mb-0 text-xs text-fg-3">
      Showing first {SEARCH_CAP} PRs
    </p>
  );
}

function SkeletonRow() {
  return (
    <div className="grid min-h-13 grid-cols-[16px_minmax(240px,1fr)_auto] items-center gap-3 px-5 py-2">
      <Skeleton className="size-3.5 rounded-full" />
      <span className="flex flex-col gap-1.5">
        <Skeleton className="w-2/3" />
        <Skeleton className="h-2.5 w-1/3" />
      </span>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

export function SkeletonRows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <SkeletonRow key={index} />
  ));
}

export function LoadingList({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Loading pull requests" className="pb-6">
      {children}
    </div>
  );
}
