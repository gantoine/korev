const REPO_NAME_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function isRepoName(value: string): boolean {
  return REPO_NAME_PATTERN.test(value);
}

export function uniqueRepos(...lists: string[][]): string[] {
  return [...new Set(lists.flat())];
}
