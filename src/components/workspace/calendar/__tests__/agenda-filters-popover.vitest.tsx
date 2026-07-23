import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { createRef } from 'react';
import AgendaFiltersPopover from '../AgendaFiltersPopover';

afterEach(cleanup);

function renderPopover() {
  const triggerRef = createRef<HTMLButtonElement>();
  const onClose = vi.fn();
  const onApply = vi.fn();
  const onReset = vi.fn();
  const confirmation = 'all';
  const collaborator = 'all';
  render(<><button ref={triggerRef}>Filtres</button><AgendaFiltersPopover open triggerRef={triggerRef} confirmation={confirmation} collaborator={collaborator} members={[{ userId: 'user-1', name: 'Antoine' }]} onConfirmationChange={vi.fn()} onCollaboratorChange={vi.fn()} onApply={onApply} onReset={onReset} onClose={onClose} /></>);
  return { onClose, onApply, onReset };
}

test('renders an opaque portal above the planning and exposes its controls', () => {
  renderPopover();
  const dialog = screen.getByRole('dialog', { name: 'Filtres' });
  expect(dialog.className).toContain('bg-white');
  expect(dialog.className).toContain('z-[81]');
  expect(screen.getByLabelText('Statut')).toBeVisible();
  expect(screen.getByLabelText('Collaborateur')).toBeVisible();
});

test('closes on Escape and an outside click', () => {
  const { onClose } = renderPopover();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  fireEvent.mouseDown(document.body);
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('keeps application and reset actions reachable', () => {
  const { onApply, onReset } = renderPopover();
  fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onReset).toHaveBeenCalledOnce();
});

test('uses a viewport-safe sheet on mobile', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  renderPopover();
  fireEvent.resize(window);
  expect(document.querySelector('.fixed.inset-x-3.bottom-3.top-3')).not.toBeNull();
  expect(document.querySelector('.fixed.inset-0.z-\\[80\\]')).not.toBeNull();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
});
