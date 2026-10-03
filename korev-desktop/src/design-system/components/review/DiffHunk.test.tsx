import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DiffHunk, type DiffLine } from './DiffHunk';

afterEach(cleanup);

function gutters(container: HTMLElement) {
  return Array.from(container.querySelectorAll('tbody tr'))
    .filter((row) => row.querySelectorAll('.kv-diff__num').length === 2)
    .map((row) => {
      const [oldNum, newNum] = row.querySelectorAll('.kv-diff__num');
      return [oldNum.textContent, newNum.textContent];
    });
}

describe('DiffHunk', () => {
  it('advances old and new line numbers independently', () => {
    const lines: DiffLine[] = [
      { type: 'ctx', code: 'a' },
      { type: 'del', code: 'b' },
      { type: 'add', code: 'c' },
      { type: 'ctx', code: 'd' },
    ];
    const { container } = render(
      <DiffHunk lines={lines} oldStart={10} newStart={20} />,
    );
    expect(gutters(container)).toEqual([
      ['10', '20'],
      ['11', ''],
      ['', '21'],
      ['12', '22'],
    ]);
  });

  it('restarts numbering from a hunk header', () => {
    const lines: DiffLine[] = [
      { type: 'hunk', code: '@@ -38,11 +40,17 @@ take()' },
      { type: 'ctx', code: 'a' },
    ];
    const { container } = render(<DiffHunk lines={lines} />);
    expect(gutters(container).at(-1)).toEqual(['38', '40']);
  });

  it('renders a note directly under its line', () => {
    const lines: DiffLine[] = [
      { type: 'ctx', code: 'first' },
      { type: 'add', code: 'second' },
    ];
    const { container } = render(
      <DiffHunk lines={lines} notes={{ 0: 'Note on first' }} />,
    );
    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows.map((row) => row.textContent)).toEqual([
      '11 first',
      'Note on first',
      '2+second',
    ]);
  });
});
