import { describe, expect, it } from 'vitest';
import type { RepoMergeInfo } from '../shared/merge';
import { mergeMethodChoice, mergePathFor, mergeRange } from './merge-path';
import { makeLayer, makePr } from './test-fixtures';

const SQUASH_ONLY: RepoMergeInfo = {
  defaultMethod: 'squash',
  allowedMethods: ['squash'],
  hasMergeQueue: false,
};

describe('mergePathFor', () => {
  it("uses GitHub's merge queue whenever the repo has one", () => {
    expect(
      mergePathFor({ ...SQUASH_ONLY, hasMergeQueue: true }, 'trunk'),
    ).toEqual({ kind: 'github-queue' });
  });

  it('merges directly when the repo merges with GitHub', () => {
    expect(mergePathFor(SQUASH_ONLY, 'github')).toEqual({ kind: 'direct' });
  });

  it('posts a command comment for a third-party queue', () => {
    expect(mergePathFor(SQUASH_ONLY, 'mergify')).toEqual({
      kind: 'comment',
      tool: 'mergify',
    });
  });
});

describe('mergeMethodChoice', () => {
  it("defaults to the viewer's default method and hides the picker when only one is allowed", () => {
    expect(mergeMethodChoice(SQUASH_ONLY)).toEqual({
      initial: 'squash',
      options: ['squash'],
    });
  });

  it('falls back to the first allowed method when the default is not allowed', () => {
    expect(
      mergeMethodChoice({
        defaultMethod: 'merge',
        allowedMethods: ['rebase', 'squash'],
        hasMergeQueue: false,
      }),
    ).toEqual({ initial: 'rebase', options: ['rebase', 'squash'] });
  });
});

describe('mergeRange', () => {
  it('includes every open layer below the PR and skips merged ones', () => {
    const pr = makePr({
      number: 303,
      stack: {
        id: 'S',
        size: 4,
        baseRefName: 'main',
        position: 3,
        layers: [
          makeLayer({ position: 1, number: 301, state: 'MERGED' }),
          makeLayer({ position: 2, number: 302 }),
          makeLayer({ position: 3, number: 303 }),
          makeLayer({ position: 4, number: 304 }),
        ],
      },
    });
    expect(mergeRange(pr)).toEqual([302, 303]);
  });
});
