import { describe, expect, it } from 'vitest';
import { restorableBounds } from './window-bounds';

const LAPTOP = { x: 0, y: 0, width: 1512, height: 944 };
const SAVED = { x: 200, y: 100, width: 1100, height: 700 };

describe('restorableBounds', () => {
  it('restores bounds that sit on a connected display', () => {
    expect(restorableBounds(SAVED, [LAPTOP])).toEqual(SAVED);
  });

  it('drops bounds left on a display that is gone', () => {
    const onExternalMonitor = { ...SAVED, x: 2400 };
    expect(restorableBounds(onExternalMonitor, [LAPTOP])).toBeNull();
  });
});
