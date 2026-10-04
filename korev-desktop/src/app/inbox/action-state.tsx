import { createContext, useContext } from 'react';
import { Badge, Icon } from '../../design-system';
import type { PrActionState } from '../../shared/merge';

const ActionsContext = createContext<Record<string, PrActionState>>({});

export const ActionsProvider = ActionsContext.Provider;

export function usePrAction(key: string): PrActionState | null {
  return useContext(ActionsContext)[key] ?? null;
}

export const CLOSED_GONE_LABEL = 'Closed · gone on next refresh';
export const MERGED_GONE_LABEL = 'Merged · gone on next refresh';

const BUSY_LABELS: Partial<Record<PrActionState['kind'], string>> = {
  merging: 'Merging…',
  sending: 'Sending…',
  closing: 'Closing…',
};

const SETTLED_LABELS: Partial<Record<PrActionState['kind'], string>> = {
  merged: MERGED_GONE_LABEL,
  closed: CLOSED_GONE_LABEL,
};

export function isBusy(state: PrActionState | null): boolean {
  return state !== null && state.kind in BUSY_LABELS;
}

export function settledLabel(state: PrActionState | null): string | null {
  return state ? (SETTLED_LABELS[state.kind] ?? null) : null;
}

export function ActionChip({ state }: { state: PrActionState }) {
  const busy = BUSY_LABELS[state.kind];
  if (busy) {
    return (
      <Badge>
        <Icon
          name="loader"
          size={11}
          className="animate-spin motion-reduce:animate-none"
        />
        {busy}
      </Badge>
    );
  }
  if (state.kind === 'still-merging')
    return <Badge>Still merging on GitHub</Badge>;
  if (state.kind === 'merge-failed')
    return <Badge tone="danger">Merge failed</Badge>;
  if (state.kind === 'close-failed')
    return <Badge tone="danger">Close failed</Badge>;
  return null;
}
