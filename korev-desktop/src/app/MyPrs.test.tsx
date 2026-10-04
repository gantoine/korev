import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxSnapshot } from '../shared/inbox';
import { installFakeBridge, installMatchMedia } from './fake-bridge';
import { MyPrs } from './MyPrs';
import { makeSnapshot } from './test-fixtures';

let bridge: ReturnType<typeof installFakeBridge>['bridge'];

beforeEach(() => {
  installMatchMedia();
  bridge = installFakeBridge().bridge;
});
afterEach(cleanup);

function renderMyPrs(snapshot: InboxSnapshot = makeSnapshot()) {
  return render(<MyPrs snapshot={snapshot} onOpenSettings={vi.fn()} />);
}

function rowTitled(title: string): HTMLElement {
  return screen.getByRole('option', { name: new RegExp(title) });
}

function pressFrom(row: HTMLElement, key: string): Element | null {
  row.focus();
  fireEvent.keyDown(row, { key });
  return document.activeElement;
}

function repoGroup(repo: string): HTMLElement {
  return screen.getByRole('group', { name: repo });
}

function repoHeader(repo: string): HTMLElement {
  return screen.getByRole('option', { name: new RegExp(`^${repo}`) });
}

function sectionHeading(name: string, within_ = document.body): HTMLElement {
  return within(within_).getByRole('heading', {
    name: new RegExp(`^${name}`),
  });
}

describe('MyPrs', () => {
  it('groups PRs under repo headers in order, with sections inside each repo', () => {
    renderMyPrs();
    const headers = screen
      .getAllByRole('option')
      .filter((option) => option.hasAttribute('aria-expanded'))
      .map((option) => option.textContent);
    expect(headers[0]).toContain('acme/api');
    expect(headers[1]).toContain('acme/web');
    const api = repoGroup('acme/api');
    expect(
      within(sectionHeading('Needs you', api)).getByText('1'),
    ).toBeTruthy();
    expect(
      within(sectionHeading('In progress', api)).getByText('1'),
    ).toBeTruthy();
    expect(
      within(sectionHeading('Ready to merge', api)).getByText('1'),
    ).toBeTruthy();
    expect(within(repoHeader('acme/web')).getByText('2 need you')).toBeTruthy();
  });

  it("shows the repo owner's avatar in the repo header when GitHub has one", () => {
    const avatarUrl = 'https://avatars.githubusercontent.com/u/1?s=32';
    renderMyPrs(makeSnapshot({ repoAvatars: { 'acme/web': avatarUrl } }));

    expect(repoHeader('acme/web').querySelector('img')?.src).toBe(avatarUrl);
    expect(repoHeader('acme/api').querySelector('img')).toBeNull();
  });

  it('collapses a repo with ArrowLeft, keeps its urgency badge and saves the choice', async () => {
    renderMyPrs();
    const header = repoHeader('acme/web');
    header.focus();
    fireEvent.keyDown(header, { key: 'ArrowLeft' });

    expect(bridge.settings.setCollapsedRepos).toHaveBeenCalledWith('mine', [
      'acme/web',
    ]);
    await waitFor(() => expect(screen.queryByText('App shell')).toBeNull());
    expect(within(repoHeader('acme/web')).getByText('2 need you')).toBeTruthy();
  });

  it('hides the header of an empty section', () => {
    renderMyPrs();
    const web = repoGroup('acme/web');
    expect(
      within(web).queryByRole('heading', { name: /^Ready to merge/ }),
    ).toBeNull();
    expect(sectionHeading('Needs you', web)).toBeTruthy();
  });

  it('renders stack layers bottom-first and labels the teammate layer', () => {
    renderMyPrs();
    const layerTitles = [
      'App shell',
      'IPC bridge and token store',
      'Settings: org access states',
      'Settings: repo picker UI',
    ].map((title) => screen.getByText(title));
    const followsPrevious = layerTitles
      .slice(1)
      .map((title, index) =>
        Boolean(
          layerTitles[index].compareDocumentPosition(title) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      );
    expect(followsPrevious).toEqual([true, true, true]);
    expect(screen.getByText('1 of 4')).toBeTruthy();
    expect(screen.getByText('Waiting on @alex')).toBeTruthy();
    expect(screen.getByText('Merged')).toBeTruthy();
  });

  it('moves with j/k across sections, repo headers and into stack layers', () => {
    renderMyPrs();
    expect(
      pressFrom(rowTitled('Rate-limit per tenant'), 'j')?.textContent,
    ).toContain('Retry flaky exporter');
    expect(
      pressFrom(rowTitled('Bump OpenTelemetry'), 'j')?.textContent,
    ).toContain('acme/web');
    expect(pressFrom(repoHeader('acme/web'), 'j')?.textContent).toContain(
      'App shell',
    );
    expect(pressFrom(rowTitled('App shell'), 'ArrowUp')?.textContent).toContain(
      'acme/web',
    );
  });

  it('keeps the list under an offline banner', () => {
    renderMyPrs(makeSnapshot({ status: 'offline' }));
    expect(screen.getByText(/^Offline · showing data from/)).toBeTruthy();
    expect(rowTitled('Bump OpenTelemetry')).toBeTruthy();
  });
});
