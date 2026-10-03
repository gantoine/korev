import type { PrSize, SizeInfo } from '../shared/inbox';
import type { ChangedFile, PullRequest } from '../shared/pull-request';

const LOCKFILE_NAMES: ReadonlySet<string> = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'bun.lock',
  'Cargo.lock',
  'poetry.lock',
  'uv.lock',
  'Pipfile.lock',
  'Gemfile.lock',
  'composer.lock',
  'go.sum',
  'flake.lock',
  'Podfile.lock',
  'mix.lock',
]);

const GENERATED_SUFFIXES: readonly string[] = [
  '.min.js',
  '.min.css',
  '.map',
  '.snap',
  '.pb.go',
  '_pb2.py',
  '.generated.ts',
];

const GENERATED_DIRECTORIES: readonly string[] = [
  'dist/',
  'generated/',
  '__generated__/',
  '__snapshots__/',
];

interface SizeLimit {
  lines: number;
  files: number;
}

const SIZE_LIMITS: readonly { size: PrSize; limit: SizeLimit }[] = [
  { size: 'S', limit: { lines: 100, files: 5 } },
  { size: 'M', limit: { lines: 500, files: 20 } },
];

const LARGEST_SIZE: PrSize = 'L';

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function isInDirectory(path: string, directory: string): boolean {
  return path.startsWith(directory) || path.includes(`/${directory}`);
}

function isExcludedFromSize(path: string): boolean {
  return (
    LOCKFILE_NAMES.has(fileName(path)) ||
    GENERATED_SUFFIXES.some((suffix) => path.endsWith(suffix)) ||
    GENERATED_DIRECTORIES.some((directory) => isInDirectory(path, directory))
  );
}

function countedChanges(pr: PullRequest): { lines: number; files: number } {
  const useTotals = pr.files.length === 0 || pr.filesTruncated;
  if (useTotals) {
    return { lines: pr.additions + pr.deletions, files: pr.changedFiles };
  }
  const counted = pr.files.filter((file) => !isExcludedFromSize(file.path));
  return { lines: counted.reduce(addLines, 0), files: counted.length };
}

function addLines(total: number, file: ChangedFile): number {
  return total + file.additions + file.deletions;
}

function sizeFor(lines: number, files: number): PrSize {
  const fitting = SIZE_LIMITS.find(
    ({ limit }) => lines <= limit.lines && files <= limit.files,
  );
  return fitting?.size ?? LARGEST_SIZE;
}

export function prSize(pr: PullRequest): SizeInfo {
  const { lines, files } = countedChanges(pr);
  const size = pr.filesTruncated ? LARGEST_SIZE : sizeFor(lines, files);
  return { size, lines, files, filesTruncated: pr.filesTruncated };
}
