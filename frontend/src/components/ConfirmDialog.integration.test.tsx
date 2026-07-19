import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

test('requires an explicit confirmation and lets the user cancel with Escape', async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      title="Delete this chat?"
      description="This cannot be undone."
      confirmLabel="Delete chat"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );

  expect(screen.getByRole('alertdialog', { name: 'Delete this chat?' })).toBeTruthy();
  expect(onConfirm).not.toHaveBeenCalled();

  await user.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole('button', { name: 'Delete chat' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
