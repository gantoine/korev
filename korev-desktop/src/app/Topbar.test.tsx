import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatClock } from './format';
import { SYNCED_AT, makeSnapshot } from './test-fixtures';
import { Topbar } from './Topbar';

afterEach(cleanup);

describe('Topbar', () => {
  it('offers Reconnect GitHub when auth is lost', () => {
    const onReconnect = vi.fn();
    render(
      <Topbar
        title="My PRs"
        snapshot={makeSnapshot({ status: 'auth_lost' })}
        onReconnect={onReconnect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect GitHub' }));
    expect(onReconnect).toHaveBeenCalledOnce();
  });

  it('shows when the offline data was synced', () => {
    render(
      <Topbar
        title="My PRs"
        snapshot={makeSnapshot({ status: 'offline' })}
        onReconnect={vi.fn()}
      />,
    );
    expect(
      screen.getByText(`Offline · ${formatClock(SYNCED_AT)}`),
    ).toBeTruthy();
  });
});
