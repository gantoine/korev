import type { InboxSnapshot, SyncStatus } from '../../shared/inbox';

export type InboxPhase =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string | null }
  | { kind: 'loaded'; snapshot: InboxSnapshot };

const FIRST_LOAD_STATUSES: SyncStatus[] = ['idle', 'syncing'];

export function inboxPhase(snapshot: InboxSnapshot | null): InboxPhase {
  if (!snapshot) return { kind: 'loading' };
  if (snapshot.syncedAt !== null || snapshot.status === 'live') {
    return { kind: 'loaded', snapshot };
  }
  if (FIRST_LOAD_STATUSES.includes(snapshot.status)) return { kind: 'loading' };
  return { kind: 'failed', message: snapshot.error };
}
