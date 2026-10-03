import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

afterEach(cleanup);

function renderOpenDialog() {
  const onClose = vi.fn();
  render(
    <Dialog open onClose={onClose} title="Approve with 2 open findings?">
      Body
    </Dialog>,
  );
  const dialog = screen.getByRole('dialog');
  return { onClose, dialog, scrim: dialog.parentElement as HTMLElement };
}

describe('Dialog', () => {
  it('closes on Escape', () => {
    const { onClose } = renderOpenDialog();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on a scrim press but not on a press inside the dialog', () => {
    const { onClose, dialog, scrim } = renderOpenDialog();
    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(scrim);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders nothing when closed', () => {
    render(<Dialog open={false} title="Hidden" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
