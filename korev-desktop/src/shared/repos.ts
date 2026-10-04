export type OwnerAccess = 'ok' | 'restricted' | 'sso';

export interface RepoOwner {
  login: string;
  kind: 'viewer' | 'org';
  access: OwnerAccess;
  actionUrl: string | null;
}

export interface RepoPage {
  owner: string;
  repos: string[];
  totalCount: number;
  nextCursor: string | null;
  access: OwnerAccess;
  actionUrl: string | null;
}
