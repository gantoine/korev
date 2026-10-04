export interface Placement {
  key: string;
  group: string;
}

export interface StructuralDiff {
  added: string[];
  removed: string[];
  moved: string[];
}

const NO_PREVIOUS = -1;

function keysOf(placements: Placement[]): string[] {
  return placements.map((placement) => placement.key);
}

function insertionPoint(
  tails: number[],
  sequence: number[],
  value: number,
): number {
  let low = 0;
  let high = tails.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sequence[tails[middle]] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function increasingRun(sequence: number[]): Set<number> {
  const tails: number[] = [];
  const previous = sequence.map(() => NO_PREVIOUS);
  sequence.forEach((value, index) => {
    const point = insertionPoint(tails, sequence, value);
    if (point > 0) previous[index] = tails[point - 1];
    tails[point] = index;
  });
  const run = new Set<number>();
  let cursor = tails.at(-1) ?? NO_PREVIOUS;
  while (cursor !== NO_PREVIOUS) {
    run.add(cursor);
    cursor = previous[cursor];
  }
  return run;
}

function reorderedKeys(before: Placement[], stayed: Placement[]): string[] {
  const beforeIndex = new Map(keysOf(before).map((key, index) => [key, index]));
  const sequence = stayed.map(
    (placement) => beforeIndex.get(placement.key) ?? 0,
  );
  const inOrder = increasingRun(sequence);
  return keysOf(stayed.filter((_, index) => !inOrder.has(index)));
}

export function diffStructure(
  before: Placement[],
  after: Placement[],
): StructuralDiff {
  const groupBefore = new Map(
    before.map((placement) => [placement.key, placement.group]),
  );
  const keysAfter = new Set(keysOf(after));
  const kept = after.filter((placement) => groupBefore.has(placement.key));
  const regrouped = kept.filter(
    (placement) => groupBefore.get(placement.key) !== placement.group,
  );
  const stayed = kept.filter(
    (placement) => groupBefore.get(placement.key) === placement.group,
  );
  return {
    added: keysOf(after.filter((placement) => !groupBefore.has(placement.key))),
    removed: keysOf(
      before.filter((placement) => !keysAfter.has(placement.key)),
    ),
    moved: [...keysOf(regrouped), ...reorderedKeys(before, stayed)],
  };
}

export function changeCount(diff: StructuralDiff): number {
  return diff.added.length + diff.removed.length + diff.moved.length;
}
