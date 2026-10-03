import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Finding } from './Finding';

afterEach(cleanup);

const TITLE = 'Read-modify-write on the token bucket is not atomic';

function findingRoot() {
  return screen.getByText(TITLE).parentElement as HTMLElement;
}

describe('Finding', () => {
  it('shows no status badge while open', () => {
    render(<Finding level="high" title={TITLE} />);
    expect(screen.queryByText('open')).toBeNull();
    expect(findingRoot().className).not.toContain('opacity-60');
  });

  it.each(['resolved', 'dismissed'] as const)(
    'dims a %s finding and labels it',
    (status) => {
      render(<Finding level="high" title={TITLE} status={status} />);
      expect(screen.getByText(status)).toBeTruthy();
      expect(findingRoot().className).toContain('opacity-60');
    },
  );
});
