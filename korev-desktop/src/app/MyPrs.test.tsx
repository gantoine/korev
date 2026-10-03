import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MyPrs } from './MyPrs';
import { makeSnapshot } from './test-fixtures';

afterEach(cleanup);

function sectionHeading(name: string): HTMLElement {
  return screen.getByRole('heading', { name: new RegExp(`^${name}`) });
}

describe('MyPrs', () => {
  it('renders the three sections with their counts', () => {
    render(<MyPrs snapshot={makeSnapshot()} />);
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
    render(<MyPrs snapshot={{ ...snapshot, mine }} />);
    expect(
      screen.queryByRole('heading', { name: /^Ready to merge/ }),
    ).toBeNull();
    expect(sectionHeading('Needs you')).toBeTruthy();
  });

  it('renders stack layers bottom-first and labels the teammate layer', () => {
    render(<MyPrs snapshot={makeSnapshot()} />);
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
});
