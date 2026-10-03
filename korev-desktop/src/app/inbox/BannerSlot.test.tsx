import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatClock } from '../format';
import { makeSnapshot } from '../test-fixtures';
import { BannerSlot } from './BannerSlot';

afterEach(cleanup);

const RESET_IN_MS = 3 * 60 * 1000;

describe('BannerSlot', () => {
  it('shows when a rate limit resumes and counts down to it', () => {
    const resetAt = new Date(Date.now() + RESET_IN_MS).toISOString();
    render(
      <BannerSlot
        snapshot={makeSnapshot({
          status: 'rate_limited',
          rateLimitResetAt: resetAt,
        })}
        view="review"
        onOpenSettings={vi.fn()}
      />,
    );
    const banner = screen.getByText(/Rate limited/);
    expect(banner.textContent).toContain(`resumes ${formatClock(resetAt)}`);
    expect(banner.textContent).toMatch(/in [23]:\d\d/);
  });

  it('collapses several problems into one expandable line', () => {
    const problems = ['acme/api', 'acme/web', 'acme/billing'].map((repo) => ({
      repo,
      message: 'Korev can no longer read this repo',
    }));
    render(
      <BannerSlot
        snapshot={makeSnapshot({ problems })}
        view="mine"
        onOpenSettings={vi.fn()}
      />,
    );
    expect(screen.queryByText(/acme\/billing/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /3 problems/ }));

    expect(screen.getByText(/acme\/billing/)).toBeTruthy();
  });
});
