import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxSnapshot } from '../shared/inbox';
import { installFakeBridge, installMatchMedia } from './fake-bridge';
import { MyPrs } from './MyPrs';
import { makeSnapshot } from './test-fixtures';

beforeEach(() => {
  installMatchMedia();
  installFakeBridge();
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

function sectionHeading(name: string): HTMLElement {
  return screen.getByRole('heading', { name: new RegExp(`^${name}`) });
}

describe('MyPrs', () => {
  it('renders the three sections with their counts', () => {
    renderMyPrs();
    expect(within(sectionHeading('Needs you')).getByText('2')).toBeTruthy();
    expect(within(sectionHeading('In progress')).getByText('1')).toBeTruthy();
    expect(
      within(sectionHeading('Ready to merge')).getByText('1'),
    ).toBeTruthy();
  });

  it('hides the header of an empty section', () => {
    const snapshot = makeSnapshot();
    const mine = snapshot.mine.map((section) =>
      section.bucket === 'ready'
        ? { ...section, count: 0, entries: [] }
        : section,
    );
    renderMyPrs({ ...snapshot, mine });
    expect(
      screen.queryByRole('heading', { name: /^Ready to merge/ }),
    ).toBeNull();
    expect(sectionHeading('Needs you')).toBeTruthy();
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

  it('moves with j/k into stack layers and across section boundaries', () => {
    renderMyPrs();
    expect(
      pressFrom(rowTitled('Rate-limit per tenant'), 'j')?.textContent,
    ).toContain('App shell');
    expect(
      pressFrom(rowTitled('Settings: repo picker UI'), 'j')?.textContent,
    ).toContain('Retry flaky exporter');
    expect(
      pressFrom(rowTitled('Retry flaky exporter'), 'ArrowUp')?.textContent,
    ).toContain('Settings: repo picker UI');
  });

  it('keeps the list under an offline banner', () => {
    renderMyPrs(makeSnapshot({ status: 'offline' }));
    expect(screen.getByText(/^Offline · showing data from/)).toBeTruthy();
    expect(rowTitled('Bump OpenTelemetry')).toBeTruthy();
  });
});
