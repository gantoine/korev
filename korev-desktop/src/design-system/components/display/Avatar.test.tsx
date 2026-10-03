import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

afterEach(cleanup);

describe('Avatar', () => {
  it('shows the first two initials of a human name', () => {
    render(<Avatar name="maya ana okafor" />);
    expect(screen.getByTitle('maya ana okafor').textContent).toBe('MA');
  });

  it('renders the Korev mark instead of initials for the agent', () => {
    render(<Avatar kind="korev" name="ignored" />);
    const avatar = screen.getByTitle('Korev');
    expect(avatar.textContent).toBe('');
    expect(avatar.querySelector('svg')).not.toBeNull();
  });
});
