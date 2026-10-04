import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxSnapshot } from '../shared/inbox';
import { installFakeBridge, installMatchMedia } from './fake-bridge';
import { ReviewInbox } from './ReviewInbox';
import {
  APPROVED_REVIEW,
  INVOICE_REVIEW,
  SPIKE_REVIEW,
  makeSnapshot,
} from './test-fixtures';

beforeEach(() => installMatchMedia());
afterEach(cleanup);

function renderInbox(snapshot: InboxSnapshot = makeSnapshot()) {
  const utils = render(
    <ReviewInbox snapshot={snapshot} onOpenSettings={vi.fn()} />,
  );
  const rerenderWith = (next: InboxSnapshot) =>
    utils.rerender(<ReviewInbox snapshot={next} onOpenSettings={vi.fn()} />);
  return { ...utils, rerenderWith };
}

function rowTitled(title: string): HTMLElement {
  return screen.getByRole('option', { name: new RegExp(title) });
}

function optionTitles(): string[] {
  return screen.getAllByRole('option').map((row) => row.textContent ?? '');
}

function panel(): HTMLElement {
  return screen.getByRole('complementary', { name: 'Pull request details' });
}

function reorderedSnapshot(): InboxSnapshot {
  const snapshot = makeSnapshot();
  const [api, web, billing] = snapshot.reviews;
  return { ...snapshot, reviews: [billing, api, web] };
}

function withApproved(
  reviews: InboxSnapshot['reviews'] = makeSnapshot().reviews,
): InboxSnapshot {
  return makeSnapshot({
    reviews: reviews.map((group) =>
      group.repo === 'acme/web'
        ? { ...group, approved: [APPROVED_REVIEW] }
        : group,
    ),
  });
}

describe('ReviewInbox', () => {
  it('lists requests by repo in the given order and marks only drafts', () => {
    installFakeBridge();
    renderInbox();
    const titles = optionTitles();
    const order = [
      'acme/api',
      'Spike: replace cron',
      'acme/web',
      'planner rewrite',
      'Migrate dashboards',
      'acme/billing',
      'Fix double-charge',
    ].map((title) => titles.findIndex((text) => text.includes(title)));
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(screen.getAllByText('Draft')).toHaveLength(1);
    expect(rowTitled(SPIKE_REVIEW.pr.title).textContent).toContain('Draft');
  });

  it('keeps already-approved requests in a collapsed section of their repo', () => {
    installFakeBridge();
    renderInbox(withApproved());
    expect(screen.queryByText(APPROVED_REVIEW.item.pr.title)).toBeNull();

    fireEvent.click(rowTitled('Already approved'));

    const row = rowTitled(APPROVED_REVIEW.item.pr.title);
    expect(row.textContent).toContain('Approved by @sakce');
    expect(within(row).getByText('Approved')).toBeTruthy();
  });

  it('says nothing is waiting while still listing approved requests', () => {
    installFakeBridge();
    const onlyApproved = withApproved(
      makeSnapshot().reviews.map((group) => ({ ...group, entries: [] })),
    );
    renderInbox({ ...onlyApproved, reviewCount: 0 });

    expect(screen.getByText('No reviews waiting on you.')).toBeTruthy();
    expect(rowTitled('acme/web').textContent).toContain('0 waiting');
    expect(rowTitled('Already approved')).toBeTruthy();
  });

  it('opens the panel on Enter and returns focus to the row on Escape', () => {
    installFakeBridge();
    renderInbox();
    const row = rowTitled(INVOICE_REVIEW.pr.title);
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });

    expect(within(panel()).getByText('Ready for review')).toBeTruthy();
    expect(within(panel()).getByText(INVOICE_REVIEW.pr.title)).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('complementary')).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it('opens GitHub directly on ⌘Enter', () => {
    const { bridge } = installFakeBridge();
    renderInbox();
    const row = rowTitled(INVOICE_REVIEW.pr.title);
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter', metaKey: true });
    expect(bridge.shell.openGithub).toHaveBeenCalledWith(INVOICE_REVIEW.pr.url);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('holds a reorder while hovered and applies it from the pill', () => {
    installFakeBridge();
    const { rerenderWith } = renderInbox();
    fireEvent.mouseEnter(screen.getByRole('listbox').parentElement!);

    rerenderWith(reorderedSnapshot());

    expect(optionTitles()[1]).toContain(SPIKE_REVIEW.pr.title);
    fireEvent.click(screen.getByRole('button', { name: /1 update/ }));
    expect(optionTitles()[1]).toContain(INVOICE_REVIEW.pr.title);
  });

  it('applies the first live sync after a cached launch without holding it', () => {
    installFakeBridge();
    const { rerenderWith } = renderInbox(makeSnapshot({ fromCache: true }));
    fireEvent.mouseEnter(screen.getByRole('listbox').parentElement!);

    rerenderWith(reorderedSnapshot());

    expect(optionTitles()[1]).toContain(INVOICE_REVIEW.pr.title);
    expect(screen.queryByRole('button', { name: /update/ })).toBeNull();
  });

  it('keeps the selected PR selected and in the panel across a reorder', () => {
    installFakeBridge();
    const { rerenderWith } = renderInbox();
    fireEvent.click(rowTitled(INVOICE_REVIEW.pr.title));

    rerenderWith(reorderedSnapshot());
    fireEvent.click(screen.getByRole('button', { name: /update/ }));

    const selected = screen.getByRole('option', { selected: true });
    expect(selected.textContent).toContain(INVOICE_REVIEW.pr.title);
    expect(within(panel()).getByText(INVOICE_REVIEW.pr.title)).toBeTruthy();
  });
});
