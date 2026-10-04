import {
  BannerGroup,
  type BannerAction,
  type BannerItem,
  type BannerTone,
} from '../../design-system';
import type { InboxSnapshot, Problem, ProblemKind } from '../../shared/inbox';
import type { InboxView } from '../../shared/settings';
import { korev } from '../bridge';
import { formatClock, formatCountdown, joinMeta } from '../format';
import { SECOND_MS, useNow } from '../useNow';

const SEARCH_CAP = 300;

type OpenSettings = () => void;

type ProblemTarget = 'github' | 'settings';

interface ProblemCopy {
  tone: BannerTone;
  describe?: (repo: string) => string;
  action?: { label: string; target: ProblemTarget };
}

const PROBLEM_COPY: Record<ProblemKind, ProblemCopy> = {
  restricted: {
    tone: 'warning',
    describe: (repo) => `${repo} needs approval from an org owner`,
    action: { label: 'Request access', target: 'github' },
  },
  sso: {
    tone: 'warning',
    describe: (repo) => `${repo} needs SSO authorization`,
    action: { label: 'Authorize', target: 'github' },
  },
  not_found: {
    tone: 'warning',
    describe: (repo) => `Korev can no longer read ${repo}`,
    action: { label: 'Check repos', target: 'settings' },
  },
  archived: {
    tone: 'neutral',
    describe: (repo) => `${repo} is archived, no new PRs`,
  },
  other: { tone: 'warning' },
};

function clockPhrase(prefix: string, iso: string | null): string | null {
  return iso ? `${prefix} ${formatClock(iso)}` : null;
}

function Countdown({ until }: { until: string }) {
  const now = useNow(SECOND_MS);
  return (
    <span className="font-mono">
      {formatCountdown(Date.parse(until) - now)}
    </span>
  );
}

function offlineBanner(snapshot: InboxSnapshot): BannerItem {
  return {
    id: 'offline',
    tone: 'warning',
    message: joinMeta([
      'Offline',
      clockPhrase('showing data from', snapshot.syncedAt),
      clockPhrase('retrying at', snapshot.nextRetryAt),
    ]),
  };
}

function rateLimitBanner({ rateLimitResetAt }: InboxSnapshot): BannerItem {
  return {
    id: 'rate-limited',
    tone: 'warning',
    message: (
      <>
        {joinMeta(['Rate limited', clockPhrase('resumes', rateLimitResetAt)])}
        {rateLimitResetAt ? (
          <>
            {' · in '}
            <Countdown until={rateLimitResetAt} />
          </>
        ) : null}
      </>
    ),
  };
}

function authLostBanner(openSettings: OpenSettings): BannerItem {
  return {
    id: 'auth-lost',
    tone: 'danger',
    message: 'GitHub access was revoked',
    action: { label: 'Reconnect', onClick: openSettings },
  };
}

function statusBanners(
  snapshot: InboxSnapshot,
  openSettings: OpenSettings,
): BannerItem[] {
  if (snapshot.status === 'offline') return [offlineBanner(snapshot)];
  if (snapshot.status === 'rate_limited') return [rateLimitBanner(snapshot)];
  if (snapshot.status === 'auth_lost') return [authLostBanner(openSettings)];
  return [];
}

function problemMessage(problem: Problem, copy: ProblemCopy): string {
  const { repo, message } = problem;
  if (!repo) return message;
  return copy.describe ? copy.describe(repo) : `${repo}: ${message}`;
}

function openGithubAction(
  label: string,
  url: string | null,
): BannerAction | undefined {
  if (!url) return undefined;
  return { label, onClick: () => void korev().shell.openGithub(url) };
}

function problemAction(
  problem: Problem,
  copy: ProblemCopy,
  openSettings: OpenSettings,
): BannerAction | undefined {
  const { action } = copy;
  if (!action) return undefined;
  if (action.target === 'settings') {
    return { label: action.label, onClick: openSettings };
  }
  return openGithubAction(action.label, problem.actionUrl);
}

function problemBanners(
  problems: Problem[],
  openSettings: OpenSettings,
): BannerItem[] {
  return problems.map((problem, index) => {
    const copy = PROBLEM_COPY[problem.kind];
    return {
      id: `problem:${index}`,
      tone: copy.tone,
      message: problemMessage(problem, copy),
      action: problemAction(problem, copy, openSettings),
    };
  });
}

function truncatedBanners(
  snapshot: InboxSnapshot,
  view: InboxView,
  openSettings: OpenSettings,
): BannerItem[] {
  const truncated =
    view === 'mine' ? snapshot.truncated.mine : snapshot.truncated.reviews;
  if (!truncated) return [];
  return [
    {
      id: 'truncated',
      tone: 'neutral',
      message: `Showing ${SEARCH_CAP} PRs — more aren't loaded`,
      action: { label: 'Narrow repos', onClick: openSettings },
    },
  ];
}

function stacksBanners(snapshot: InboxSnapshot): BannerItem[] {
  if (!snapshot.stacksUnavailable) return [];
  return [
    {
      id: 'stacks',
      tone: 'neutral',
      message: 'Stack relationships unavailable',
    },
  ];
}

export function inboxBanners(
  snapshot: InboxSnapshot,
  view: InboxView,
  openSettings: OpenSettings,
): BannerItem[] {
  return [
    ...statusBanners(snapshot, openSettings),
    ...problemBanners(snapshot.problems, openSettings),
    ...truncatedBanners(snapshot, view, openSettings),
    ...stacksBanners(snapshot),
  ];
}

export interface BannerSlotProps {
  snapshot: InboxSnapshot;
  view: InboxView;
  onOpenSettings: OpenSettings;
}

export function BannerSlot({
  snapshot,
  view,
  onOpenSettings,
}: BannerSlotProps) {
  const items = inboxBanners(snapshot, view, onOpenSettings);
  if (items.length === 0) return null;
  return <BannerGroup items={items} className="mx-5 mt-3" />;
}
