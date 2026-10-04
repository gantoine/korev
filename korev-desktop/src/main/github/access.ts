import type { ProblemKind } from '../../shared/inbox';
import type { OwnerAccess } from '../../shared/repos';
import { isGithubUrl } from '../app-origin';
import { GITHUB_OAUTH_CLIENT_ID, GITHUB_WEB_URL } from './config';

export interface AccessSignal {
  message: string;
  type?: string;
}

export type DeniedAccess = Exclude<OwnerAccess, 'ok'>;

export interface OwnerDenial {
  access: DeniedAccess;
  actionUrl: string | null;
}

export const SSO_HEADER = 'x-github-sso';
export const ORG_RESTRICTION_PATTERN = /OAuth App access restrictions/i;

const SAML_PATTERN = /SAML/i;
const SSO_URL_PATTERN = /url=(\S+)/;
const NOT_FOUND_TYPE = 'NOT_FOUND';
const FORBIDDEN_TYPE = 'FORBIDDEN';
const OAUTH_APP_SETTINGS_URL = `${GITHUB_WEB_URL}/settings/connections/applications/${GITHUB_OAUTH_CLIENT_ID}`;

export function classifyAccess(
  signal: AccessSignal,
  ssoHeader: string | null,
): ProblemKind {
  if (ORG_RESTRICTION_PATTERN.test(signal.message)) return 'restricted';
  if (isSsoSignal(signal, ssoHeader)) return 'sso';
  if (signal.type === NOT_FOUND_TYPE) return 'not_found';
  return 'other';
}

function isSsoSignal(signal: AccessSignal, ssoHeader: string | null): boolean {
  if (SAML_PATTERN.test(signal.message)) return true;
  return signal.type === FORBIDDEN_TYPE && ssoHeader !== null;
}

export function accessActionUrl(
  kind: ProblemKind,
  org: string | null,
  ssoHeader: string | null,
): string | null {
  if (kind === 'restricted') return OAUTH_APP_SETTINGS_URL;
  if (kind === 'sso') return ssoUrlFromHeader(ssoHeader) ?? orgSsoUrl(org);
  return null;
}

function ssoUrlFromHeader(ssoHeader: string | null): string | null {
  const url = ssoHeader ? SSO_URL_PATTERN.exec(ssoHeader)?.[1] : undefined;
  return url && isGithubUrl(url) ? url : null;
}

function orgSsoUrl(org: string | null): string | null {
  return org ? `${GITHUB_WEB_URL}/orgs/${org}/sso` : null;
}

export function ownerDenial(
  signals: AccessSignal[],
  owner: string,
  ssoHeader: string | null,
): OwnerDenial | null {
  const kinds = signals.map((signal) => classifyAccess(signal, ssoHeader));
  const denied = kinds.find(isDenied);
  if (!denied) return null;
  return deniedAccess(denied, owner, ssoHeader);
}

function isDenied(kind: ProblemKind): kind is DeniedAccess {
  return kind === 'restricted' || kind === 'sso';
}

export function deniedAccess(
  access: DeniedAccess,
  owner: string,
  ssoHeader: string | null,
): OwnerDenial {
  return { access, actionUrl: accessActionUrl(access, owner, ssoHeader) };
}
