import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from './fake-bridge';
import { makeSnapshot } from './test-fixtures';
import { useInboxSnapshot } from './useInboxSnapshot';

afterEach(cleanup);

describe('useInboxSnapshot', () => {
  it('seeds from load, then applies pushed updates', async () => {
    const { emitInbox } = installFakeBridge({
      snapshot: makeSnapshot({ reviewCount: 4 }),
    });
    const { result } = renderHook(() => useInboxSnapshot());
    await waitFor(() => expect(result.current?.reviewCount).toBe(4));

    act(() => emitInbox(makeSnapshot({ reviewCount: 7 })));

    expect(result.current?.reviewCount).toBe(7);
  });

  it('keeps a pushed update when the initial load resolves later', async () => {
    const { bridge, emitInbox } = installFakeBridge();
    let resolveLoad = (_snapshot: ReturnType<typeof makeSnapshot>) => {};
    bridge.inbox.load = () =>
      new Promise((resolve) => {
        resolveLoad = resolve;
      });
    const { result } = renderHook(() => useInboxSnapshot());

    act(() => emitInbox(makeSnapshot({ reviewCount: 9 })));
    await act(async () => resolveLoad(makeSnapshot({ reviewCount: 1 })));

    expect(result.current?.reviewCount).toBe(9);
  });

  it('unsubscribes from updates on unmount', () => {
    const { stopInbox } = installFakeBridge();
    const { unmount } = renderHook(() => useInboxSnapshot());
    unmount();
    expect(stopInbox).toHaveBeenCalledOnce();
  });
});
