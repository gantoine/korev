import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RepoPage } from '../../shared/repos';
import { installFakeBridge } from '../fake-bridge';
import { makeOwner, makeRepoPage } from '../test-fixtures';
import { RepoPicker } from './RepoPicker';

afterEach(cleanup);

const REQUEST_ACCESS_URL =
  'https://github.com/settings/connections/applications/korev';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function renderPicker(pinnedRepos: string[] = []) {
  render(
    <RepoPicker
      pinned={{ title: 'Selected', repos: pinnedRepos, emptyMessage: 'None' }}
      selected={pinnedRepos}
      onToggle={vi.fn()}
    />,
  );
}

describe('RepoPicker', () => {
  it('loads a group on expand, then pages the rest in the background', async () => {
    const { bridge } = installFakeBridge({ owners: [makeOwner('acme')] });
    const secondPage = deferred<RepoPage>();
    vi.mocked(bridge.repos.page).mockImplementation(async (owner, cursor) => {
      if (cursor) return secondPage.promise;
      return makeRepoPage(owner, ['acme/api', 'acme/web'], {
        totalCount: 3,
        nextCursor: 'cursor-2',
      });
    });
    renderPicker();

    fireEvent.click(await screen.findByRole('button', { name: 'acme' }));

    expect(bridge.repos.page).toHaveBeenCalledWith('acme', null);
    expect(await screen.findByText('2 of 3 loaded')).toBeTruthy();
    expect(bridge.repos.page).toHaveBeenCalledWith('acme', 'cursor-2');

    secondPage.resolve(makeRepoPage('acme', ['acme/infra'], { totalCount: 3 }));

    expect(await screen.findByLabelText('acme/infra')).toBeTruthy();
    expect(screen.queryByText(/of 3 loaded/)).toBeNull();
  });

  it('shows the selected group without waiting for GitHub', () => {
    const { bridge } = installFakeBridge();
    vi.mocked(bridge.repos.owners).mockReturnValue(
      new Promise(() => undefined),
    );
    renderPicker(['acme/api']);

    const selected = screen.getByRole('region', { name: 'Selected' });
    const checkbox = within(selected).getByLabelText('acme/api');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(bridge.repos.page).not.toHaveBeenCalled();
  });

  it('searches GitHub for a group that is not loaded before saying nothing matches', async () => {
    const { bridge } = installFakeBridge({ owners: [makeOwner('acme')] });
    const results = deferred<string[]>();
    vi.mocked(bridge.repos.search).mockReturnValue(results.promise);
    renderPicker();
    await screen.findByRole('button', { name: 'acme' });

    fireEvent.change(screen.getByLabelText('Filter repos'), {
      target: { value: 'billing' },
    });

    await waitFor(() =>
      expect(bridge.repos.search).toHaveBeenCalledWith('acme', 'billing'),
    );
    expect(screen.getByText('Searching GitHub…')).toBeTruthy();
    expect(screen.queryByText(/No repos match/)).toBeNull();

    results.resolve([]);

    expect(await screen.findByText("No repos match 'billing'")).toBeTruthy();
  });

  it('links a restricted org to its access request page', async () => {
    const { bridge } = installFakeBridge({
      owners: [
        makeOwner('acme', {
          access: 'restricted',
          actionUrl: REQUEST_ACCESS_URL,
        }),
      ],
    });
    renderPicker();

    const group = await screen.findByRole('region', { name: 'acme' });
    expect(
      within(group).getByText('Waiting for approval from an owner'),
    ).toBeTruthy();
    fireEvent.click(
      within(group).getByRole('button', { name: 'Request access' }),
    );

    expect(bridge.shell.openGithub).toHaveBeenCalledWith(REQUEST_ACCESS_URL);
  });

  it('adds a repo outside your account and orgs by its full name', () => {
    installFakeBridge();
    const onToggle = vi.fn();
    render(
      <RepoPicker
        pinned={{ title: 'Selected', repos: [], emptyMessage: 'None' }}
        selected={[]}
        onToggle={onToggle}
      />,
    );
    fireEvent.change(screen.getByLabelText('Add a repo'), {
      target: { value: 'dbt-labs/metricflow' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onToggle).toHaveBeenCalledWith('dbt-labs/metricflow', true);
  });
});
