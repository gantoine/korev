import type { ReactNode } from 'react';
import { cn } from '../../design-system';
import { korev } from '../bridge';

const ROW =
  'grid min-h-13 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-5 py-2 text-left font-sans text-fg-1 transition-colors duration-(--dur-fast) ease-out hover:bg-hover focus-visible:relative focus-visible:shadow-focus';

export interface PrRowProps {
  url: string;
  className?: string;
  children: ReactNode;
}

export function PrRow({ url, className, children }: PrRowProps) {
  return (
    <button
      type="button"
      onClick={() => korev().shell.openGithub(url)}
      className={cn(ROW, className)}
    >
      {children}
    </button>
  );
}

export interface PrSummaryProps {
  title: string;
  meta: ReactNode;
  muted?: boolean;
}

export function PrSummary({ title, meta, muted = false }: PrSummaryProps) {
  return (
    <span className="flex min-w-0 flex-col">
      <span
        title={title}
        className={cn(
          'truncate type-ui font-medium',
          muted ? 'text-fg-3' : 'text-fg-1',
        )}
      >
        {title}
      </span>
      <span className="mt-0.5 truncate text-xs text-fg-3">{meta}</span>
    </span>
  );
}

export interface StackPlace {
  position: number;
  size: number;
}

export function LayerLabel({ position, size }: StackPlace) {
  return (
    <span className="font-mono text-2xs whitespace-nowrap text-fg-3">
      {position} of {size}
    </span>
  );
}

export function prRef(pr: { repo: string; number: number }): string {
  return `${pr.repo}#${pr.number}`;
}

export function authorHandle(login: string | null): string | null {
  return login ? `@${login}` : null;
}
