export interface InRepo {
  repo: string;
}

function rankIn(repoOrder: string[]): (repo: string) => number {
  const ranks = new Map(repoOrder.map((repo, index) => [repo, index]));
  return (repo) => ranks.get(repo) ?? repoOrder.length;
}

export function sortByRepoOrder<Group extends InRepo>(
  groups: Group[],
  repoOrder: string[],
): Group[] {
  const rank = rankIn(repoOrder);
  return [...groups].sort(
    (left, right) =>
      rank(left.repo) - rank(right.repo) || left.repo.localeCompare(right.repo),
  );
}

export function groupByRepo<Item>(
  items: Item[],
  repoOf: (item: Item) => string,
): [string, Item[]][] {
  const byRepo = new Map<string, Item[]>();
  for (const item of items) {
    const repo = repoOf(item);
    byRepo.set(repo, [...(byRepo.get(repo) ?? []), item]);
  }
  return [...byRepo];
}
