import { describe, expect, it } from 'vitest';
import { formatAge } from './format';
import { NOW, daysAgo, hoursAgo } from './test-fixtures';

describe('formatAge', () => {
  it.each([
    [hoursAgo(0.2), '12m'],
    [hoursAgo(3), '3h'],
    [daysAgo(2), '2d'],
    [daysAgo(35), '5w'],
  ])('formats %s as %s', (from, expected) => {
    expect(formatAge(from, NOW)).toBe(expected);
  });
});
