import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from './fake-bridge';
import { SettingsPage } from './Settings';
import {
  CONNECTED_AUTH,
  WATCHING_SETTINGS,
  makeSnapshot,
} from './test-fixtures';

afterEach(cleanup);

describe('SettingsPage', () => {
  it('stops watching an unchecked repo and restores it on Undo', async () => {
    const { bridge } = installFakeBridge();
    render(
      <SettingsPage
        auth={CONNECTED_AUTH}
        settings={WATCHING_SETTINGS}
        snapshot={makeSnapshot()}
      />,
    );

    fireEvent.click(screen.getByLabelText('acme/api'));

    expect(bridge.settings.setRepos).toHaveBeenLastCalledWith(['acme/web']);
    expect(screen.getByText('Stopped watching acme/api')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(bridge.settings.setRepos).toHaveBeenLastCalledWith(
      WATCHING_SETTINGS.repos,
    );
    expect(screen.queryByText('Stopped watching acme/api')).toBeNull();
  });
});

describe('Inbox order', () => {
  it('moves a repo up with ⌥↑, saves the order and announces the move', () => {
    const { bridge } = installFakeBridge();
    render(
      <SettingsPage
        auth={CONNECTED_AUTH}
        settings={WATCHING_SETTINGS}
        snapshot={makeSnapshot()}
      />,
    );

    const handle = screen.getByRole('button', {
      name: 'Reorder acme/web, 2 of 2',
    });
    fireEvent.keyDown(handle, { key: 'ArrowUp', altKey: true });

    expect(bridge.settings.setRepos).toHaveBeenLastCalledWith([
      'acme/web',
      'acme/api',
    ]);
    expect(screen.getByText('Moved acme/web to 1 of 2')).toBeTruthy();
  });
});
