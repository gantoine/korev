import { BannerGroup, type BannerItem } from '../../design-system';
import type { InboxSnapshot, Problem } from '../../shared/inbox';
import type { InboxView } from '../../shared/settings';
import { formatClock, formatCountdown, joinMeta } from '../format';
import { SECOND_MS, useNow } from '../useNow';

const SEARCH_CAP = 300;

type OpenSettings = () => void;

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

function problemBanner(problem: Problem, index: number): BannerItem {
  return {
    id: `problem:${index}`,
    tone: 'warning',
    message: problem.repo
      ? `${problem.repo}: ${problem.message}`
      : problem.message,
  };
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
    ...snapshot.problems.map(problemBanner),
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
