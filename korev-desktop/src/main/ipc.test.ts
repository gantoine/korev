import type { IpcMainInvokeEvent } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { IpcChannel } from '../shared/ipc-contract';
import { isAppUrl, isGithubUrl, type AppOrigin } from './app-origin';
import { registerIpcHandlers, UntrustedSenderError } from './ipc';

const DEV_ORIGIN: AppOrigin = {
  devServerUrl: 'http://localhost:5173',
  rendererDirectory: '/unused',
};
const PACKAGED_ORIGIN: AppOrigin = {
  devServerUrl: undefined,
  rendererDirectory: '/Applications/Korev.app/renderer/main_window',
};

type Listener = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function invokeFrom(senderUrl: string, handler: () => unknown) {
  const listeners = new Map<string, Listener>();
  registerIpcHandlers(
    { handle: (channel, listener) => listeners.set(channel, listener) },
    { [IpcChannel.InboxRefresh]: handler },
    (url) => isAppUrl(url, DEV_ORIGIN),
  );
  const event = { senderFrame: { url: senderUrl } } as IpcMainInvokeEvent;
  return () => listeners.get(IpcChannel.InboxRefresh)?.(event);
}

describe('IPC sender guard', () => {
  it('runs the handler for the app origin', () => {
    const handler = vi.fn(() => 'ok');
    expect(invokeFrom('http://localhost:5173/index.html', handler)()).toBe(
      'ok',
    );
  });

  it('rejects a sender outside the app origin', () => {
    const handler = vi.fn();
    const invoke = invokeFrom('https://evil.example/', handler);
    expect(invoke).toThrow(UntrustedSenderError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('app origin', () => {
  it('accepts only files inside the packaged renderer directory', () => {
    expect(
      isAppUrl(
        'file:///Applications/Korev.app/renderer/main_window/index.html',
        PACKAGED_ORIGIN,
      ),
    ).toBe(true);
    expect(isAppUrl('file:///etc/passwd', PACKAGED_ORIGIN)).toBe(false);
  });

  it('allows external links only to github.com', () => {
    expect(isGithubUrl('https://github.com/acme/api/pull/1')).toBe(true);
    expect(isGithubUrl('https://github.com.evil.example/')).toBe(false);
    expect(isGithubUrl('http://github.com/acme')).toBe(false);
  });
});
