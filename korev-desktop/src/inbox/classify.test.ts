import { describe, expect, it } from 'vitest';
import type { Check } from '../shared/pull-request';
import { classifyMyPr } from './classify';
import { makePr } from './test-fixtures';

function codesOf(result: ReturnType<typeof classifyMyPr>) {
  return result.reasons.map((reason) => reason.code);
}

function checks(outcomes: Check['outcome'][]): Check[] {
  return outcomes.map((outcome, index) => ({
    name: `check-${index}`,
    outcome,
  }));
}

describe('classifyMyPr merge states', () => {
  it.each([
    ['CLEAN', 'ready', 'ready-to-merge'],
    ['HAS_HOOKS', 'ready', 'ready-to-merge'],
    ['BEHIND', 'needs-you', 'behind'],
    ['DIRTY', 'needs-you', 'conflicts'],
    ['UNSTABLE', 'needs-you', 'optional-checks-failing'],
    ['UNKNOWN', 'in-progress', 'checking-mergeability'],
    ['BLOCKED', 'in-progress', 'blocked-by-rules'],
  ] as const)('%s puts the PR in %s with %s', (state, bucket, code) => {
    const result = classifyMyPr(makePr({ mergeStateStatus: state }));

    expect(result.bucket).toBe(bucket);
    expect(codesOf(result)).toEqual([code]);
  });

  it('reads BLOCKED with a required review as waiting on review', () => {
    const result = classifyMyPr(
      makePr({
        mergeStateStatus: 'BLOCKED',
        reviewDecision: 'REVIEW_REQUIRED',
      }),
    );

    expect(codesOf(result)).toEqual(['waiting-on-review']);
  });

  it('lists the failing optional checks by name when UNSTABLE', () => {
    const result = classifyMyPr(
      makePr({
        mergeStateStatus: 'UNSTABLE',
        checks: [
          { name: 'e2e', outcome: 'failing' },
          { name: 'build', outcome: 'passing' },
        ],
      }),
    );

    expect(result.reasons[0].label).toContain('e2e');
  });

  it('never marks an approved green PR ready unless the merge state allows it', () => {
    const result = classifyMyPr(
      makePr({
        reviewDecision: 'APPROVED',
        ci: 'passing',
        mergeStateStatus: 'BLOCKED',
      }),
    );

    expect(result.bucket).toBe('in-progress');
  });
});

describe('classifyMyPr needs-you reasons', () => {
  it('names the check when exactly one fails', () => {
    const result = classifyMyPr(
      makePr({
        mergeStateStatus: 'BLOCKED',
        checks: [
          { name: 'Lint', outcome: 'failing' },
          { name: 'Test', outcome: 'passing' },
        ],
      }),
    );

    expect(result.bucket).toBe('needs-you');
    expect(result.reasons[0].label).toBe('Lint failing');
  });

  it('counts failing checks when more than one fails', () => {
    const result = classifyMyPr(
      makePr({ checks: checks(['failing', 'failing', 'passing']) }),
    );

    expect(result.reasons[0].label).toBe('2 checks failing');
  });

  it('treats failing CI without check detail as failing', () => {
    const result = classifyMyPr(makePr({ ci: 'failing', checks: [] }));

    expect(codesOf(result)).toEqual(['checks-failing']);
  });

  it('flags requested changes', () => {
    const result = classifyMyPr(
      makePr({ reviewDecision: 'CHANGES_REQUESTED' }),
    );

    expect(result.bucket).toBe('needs-you');
    expect(codesOf(result)).toEqual(['changes-requested']);
  });

  it('flags unresolved threads even when the merge state is clean', () => {
    const result = classifyMyPr(makePr({ unresolvedThreads: 3 }));

    expect(result.bucket).toBe('needs-you');
    expect(codesOf(result)).toEqual(['unresolved-threads']);
  });

  it('orders reasons from most to least severe', () => {
    const result = classifyMyPr(
      makePr({
        mergeStateStatus: 'BEHIND',
        unresolvedThreads: 1,
        reviewDecision: 'CHANGES_REQUESTED',
      }),
    );

    expect(result.reasons[0].severity).toBe('danger');
    expect(result.reasons.at(-1)?.severity).toBe('warning');
  });
});

describe('classifyMyPr in-progress reasons', () => {
  it('keeps a clean draft in progress', () => {
    const result = classifyMyPr(makePr({ isDraft: true }));

    expect(result.bucket).toBe('in-progress');
    expect(codesOf(result)).toEqual(['draft']);
  });

  it('shows CI progress from the checks', () => {
    const result = classifyMyPr(
      makePr({
        ci: 'running',
        mergeStateStatus: 'BLOCKED',
        checks: checks([
          ...Array(6).fill('passing'),
          'pending',
          'pending',
          'pending',
        ]),
      }),
    );

    expect(result.bucket).toBe('in-progress');
    expect(result.reasons.map((reason) => reason.label)).toContain(
      'CI running · 6 of 9',
    );
  });

  it('does not treat a PR without checks as blocked', () => {
    const result = classifyMyPr(makePr({ ci: 'none', checks: [] }));

    expect(result.bucket).toBe('ready');
  });
});
