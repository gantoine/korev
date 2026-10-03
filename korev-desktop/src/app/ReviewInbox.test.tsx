import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { installFakeBridge } from './fake-bridge';
import { ReviewInbox } from './ReviewInbox';
import { INVOICE_REVIEW, SPIKE_REVIEW, makeSnapshot } from './test-fixtures';

afterEach(cleanup);

function rowTitled(title: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(title) });
}

describe('ReviewInbox', () => {
  it('keeps the given order and marks only drafts', () => {
    installFakeBridge();
    render(<ReviewInbox snapshot={makeSnapshot()} />);
    const titles = screen
      .getAllByRole('button')
      .map((row) => row.textContent ?? '');
    const order = [
      'Fix double-charge',
      'planner rewrite',
      'Migrate dashboards',
      'Spike: replace cron',
    ].map((title) => titles.findIndex((text) => text.includes(title)));
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(screen.getAllByText('Draft')).toHaveLength(1);
    expect(rowTitled(SPIKE_REVIEW.pr.title).textContent).toContain('Draft');
  });

  it('opens the PR on GitHub when a row is clicked', () => {
    const { bridge } = installFakeBridge();
    render(<ReviewInbox snapshot={makeSnapshot()} />);
    fireEvent.click(rowTitled(INVOICE_REVIEW.pr.title));
    expect(bridge.shell.openGithub).toHaveBeenCalledWith(INVOICE_REVIEW.pr.url);
  });
});
