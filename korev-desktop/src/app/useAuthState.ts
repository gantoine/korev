import { useSyncExternalStore } from 'react';
import type { AuthState, TokenResult } from '../shared/auth';
import { korev } from './bridge';
import { createBridgeStore } from './store';

const authStore = createBridgeStore<AuthState>(() => ({
  load: () => korev().auth.getState(),
  watch: (listener) => korev().auth.onChanged(listener),
}));

function patchAuth(patch: Partial<AuthState>) {
  const current = authStore.getSnapshot();
  if (!current) return;
  authStore.set({ ...current, ...patch });
}

export function useAuthState(): AuthState | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}

export async function startDeviceFlow(): Promise<void> {
  patchAuth({ login: await korev().auth.startDeviceFlow() });
}

export async function cancelDeviceFlow(): Promise<void> {
  await korev().auth.cancelDeviceFlow();
  patchAuth({ login: { status: 'idle' } });
}

export async function connectWithToken(token: string): Promise<TokenResult> {
  const result = await korev().auth.useToken(token);
  if (result.ok) patchAuth({ connection: result.connection });
  return result;
}

export async function disconnect(): Promise<void> {
  await korev().auth.disconnect();
  patchAuth({ connection: null, login: { status: 'idle' } });
}
