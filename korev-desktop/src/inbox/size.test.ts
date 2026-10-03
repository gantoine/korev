import { describe, expect, it } from 'vitest';
import type { ChangedFile } from '../shared/pull-request';
import { prSize } from './size';
import { makePr } from './test-fixtures';

function sourceFiles(count: number, linesEach: number): ChangedFile[] {
  return Array.from({ length: count }, (_, index) => ({
    path: `src/file-${index}.ts`,
    additions: linesEach,
    deletions: 0,
  }));
}

describe('prSize', () => {
  it('excludes lockfiles and generated paths from lines and files', () => {
    const pr = makePr({
      files: [
        { path: 'src/app.ts', additions: 20, deletions: 5 },
        { path: 'package-lock.json', additions: 4000, deletions: 900 },
        { path: 'apps/api/go.sum', additions: 300, deletions: 0 },
        { path: 'web/dist/bundle.min.js', additions: 1, deletions: 1 },
        {
          path: 'src/__snapshots__/app.test.ts.snap',
          additions: 80,
          deletions: 0,
        },
      ],
    });

    expect(prSize(pr)).toMatchObject({ size: 'S', lines: 25, files: 1 });
  });

  it.each([
    [5, 20, 'S'],
    [6, 1, 'M'],
    [1, 101, 'M'],
    [20, 25, 'M'],
    [21, 1, 'L'],
    [1, 501, 'L'],
  ] as const)('%i files of %i lines is %s', (fileCount, linesEach, size) => {
    const pr = makePr({ files: sourceFiles(fileCount, linesEach) });

    expect(prSize(pr).size).toBe(size);
  });

  it('falls back to PR totals when files were not fetched', () => {
    const pr = makePr({
      files: [],
      additions: 300,
      deletions: 100,
      changedFiles: 8,
    });

    expect(prSize(pr)).toMatchObject({ size: 'M', lines: 400, files: 8 });
  });

  it('is always large when the file list is truncated', () => {
    const pr = makePr({ files: sourceFiles(1, 1), filesTruncated: true });

    expect(prSize(pr).size).toBe('L');
  });
});
