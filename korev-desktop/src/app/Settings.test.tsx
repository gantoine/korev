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
