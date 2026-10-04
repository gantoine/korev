import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProblemKind } from '../../shared/inbox';
import { installFakeBridge } from '../fake-bridge';
import { formatClock } from '../format';
import { makeSnapshot } from '../test-fixtures';
import { BannerSlot } from './BannerSlot';

afterEach(cleanup);

const RESET_IN_MS = 3 * 60 * 1000;
const ACTION_URL = 'https://github.com/orgs/acme/sso';

interface ProblemCase {
  kind: ProblemKind;
  text: string;
  action: string | null;
  opens: 'github' | 'settings' | null;
}

const PROBLEM_CASES: ProblemCase[] = [
  {
    kind: 'restricted',
    text: 'acme/api needs approval from an org owner',
    action: 'Request access',
    opens: 'github',
  },
  {
    kind: 'sso',
    text: 'acme/api needs SSO authorization',
    action: 'Authorize',
    opens: 'github',
  },
  {
    kind: 'not_found',
    text: 'Korev can no longer read acme/api',
    action: 'Check repos',
    opens: 'settings',
  },
  {
    kind: 'archived',
    text: 'acme/api is archived, no new PRs',
    action: null,
    opens: null,
  },
  {
    kind: 'other',
    text: 'acme/api: GitHub returned 502',
    action: null,
    opens: null,
  },
];

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
      kind: 'not_found' as const,
      repo,
      message: 'Korev can no longer read this repo',
      actionUrl: null,
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

  it.each(PROBLEM_CASES)(
    'explains a $kind repo problem',
    ({ kind, text, action, opens }) => {
      const { bridge } = installFakeBridge();
      const onOpenSettings = vi.fn();
      const problem = {
        kind,
        repo: 'acme/api',
        message: 'GitHub returned 502',
        actionUrl: opens === 'github' ? ACTION_URL : null,
      };
      render(
        <BannerSlot
          snapshot={makeSnapshot({ problems: [problem] })}
          view="review"
          onOpenSettings={onOpenSettings}
        />,
      );

      expect(screen.getByText(text)).toBeTruthy();
      if (!action) {
        expect(screen.queryByRole('button')).toBeNull();
        return;
      }
      fireEvent.click(screen.getByRole('button', { name: action }));
      if (opens === 'github') {
        expect(bridge.shell.openGithub).toHaveBeenCalledWith(ACTION_URL);
      } else {
        expect(onOpenSettings).toHaveBeenCalledOnce();
      }
    },
  );
});
