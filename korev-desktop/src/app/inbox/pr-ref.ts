export function prRef(pr: { repo: string; number: number }): string {
  return `${pr.repo}#${pr.number}`;
}
