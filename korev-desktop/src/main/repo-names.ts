const NAME_SEGMENT = '[\\w.-]+';
const OWNER_PATTERN = new RegExp(`^${NAME_SEGMENT}$`);
const REPO_PATTERN = new RegExp(`^${NAME_SEGMENT}/${NAME_SEGMENT}$`);
const OWNER_SEPARATOR = '/';

export interface RepoParts {
  owner: string;
  name: string;
}

export function isRepoName(value: unknown): value is string {
  return typeof value === 'string' && REPO_PATTERN.test(value);
}

export function isOwnerLogin(value: unknown): value is string {
  return typeof value === 'string' && OWNER_PATTERN.test(value);
}

export function splitRepoName(repo: string): RepoParts {
  const [owner, name] = repo.split(OWNER_SEPARATOR);
  return { owner, name };
}

export function isOwnedBy(repo: string, owner: string): boolean {
  return splitRepoName(repo).owner.toLowerCase() === owner.toLowerCase();
}
