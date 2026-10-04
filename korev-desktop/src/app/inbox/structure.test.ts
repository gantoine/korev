import { describe, expect, it } from 'vitest';
import { changeCount, diffStructure, type Placement } from './structure';

function placements(group: string, keys: string[]): Placement[] {
  return keys.map((key) => ({ key, group }));
}

describe('diffStructure', () => {
  it('finds nothing when only the same rows remain in the same order', () => {
    const rows = placements('needs-you', ['a', 'b', 'c']);
    expect(changeCount(diffStructure(rows, [...rows]))).toBe(0);
  });

  it('reports added and removed rows', () => {
    const diff = diffStructure(
      placements('reviews', ['a', 'b']),
      placements('reviews', ['b', 'c']),
    );
    expect(diff.added).toEqual(['c']);
    expect(diff.removed).toEqual(['a']);
    expect(diff.moved).toEqual([]);
  });

  it('counts one row jumping to the top as a single move', () => {
    const diff = diffStructure(
      placements('reviews', ['a', 'b', 'c', 'd']),
      placements('reviews', ['d', 'a', 'b', 'c']),
    );
    expect(diff.moved).toEqual(['d']);
  });

  it('treats a row that changes section as moved', () => {
    const diff = diffStructure(
      [...placements('needs-you', ['a']), ...placements('ready', ['b'])],
      [...placements('ready', ['a', 'b'])],
    );
    expect(diff.moved).toEqual(['a']);
    expect(changeCount(diff)).toBe(1);
  });
});
