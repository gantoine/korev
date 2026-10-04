import { useSyncExternalStore } from 'react';
import type { InboxSnapshot } from '../shared/inbox';
import { korev } from './bridge';
import { createBridgeStore } from './store';

const inboxStore = createBridgeStore<InboxSnapshot>(() => ({
  load: () => korev().inbox.load(),
  watch: (listener) => korev().inbox.onUpdated(listener),
}));

export function useInboxSnapshot(): InboxSnapshot | null {
  return useSyncExternalStore(inboxStore.subscribe, inboxStore.getSnapshot);
}

export function refreshInbox(): Promise<void> {
  return korev().inbox.refresh();
}
