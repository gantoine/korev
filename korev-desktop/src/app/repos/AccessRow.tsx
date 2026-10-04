import { Icon, type IconName } from '../../design-system';
import type { OwnerAccess } from '../../shared/repos';
import { korev } from '../bridge';
import { TEXT_BUTTON } from '../layout';

export type BlockedAccess = Exclude<OwnerAccess, 'ok'>;

interface AccessCopy {
  icon: IconName;
  note: string | null;
  linkLabel: string;
}

const ACCESS_COPY: Record<BlockedAccess, AccessCopy> = {
  restricted: {
    icon: 'lock',
    note: 'Waiting for approval from an owner',
    linkLabel: 'Request access',
  },
  sso: {
    icon: 'shield-alert',
    note: null,
    linkLabel: 'Authorize Korev for SSO',
  },
};

function AccessLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return <span>{label}</span>;
  return (
    <button
      type="button"
      className={TEXT_BUTTON}
      onClick={() => void korev().shell.openGithub(url)}
    >
      {label}
    </button>
  );
}

export interface AccessRowProps {
  access: BlockedAccess;
  actionUrl: string | null;
}

export function AccessRow({ access, actionUrl }: AccessRowProps) {
  const copy = ACCESS_COPY[access];
  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-xs text-warning-text">
      <Icon name={copy.icon} size={13} />
      {copy.note ? <span>{copy.note}</span> : null}
      <AccessLink label={copy.linkLabel} url={actionUrl} />
    </div>
  );
}
