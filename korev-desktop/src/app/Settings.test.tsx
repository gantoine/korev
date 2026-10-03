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
  it('saves the repo list without a repo when it is unchecked', () => {
    const { bridge } = installFakeBridge();
    render(
      <SettingsPage
        auth={CONNECTED_AUTH}
        settings={WATCHING_SETTINGS}
        snapshot={makeSnapshot()}
      />,
    );
    fireEvent.click(screen.getByLabelText('acme/api'));
    expect(bridge.settings.setRepos).toHaveBeenCalledWith(['acme/web']);
  });
});
