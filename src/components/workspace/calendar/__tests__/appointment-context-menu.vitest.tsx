import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import AppointmentBriefDrawer from '../AppointmentBriefDrawer';
import AppointmentContextMenu from '../AppointmentContextMenu';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

afterEach(cleanup);

const event: NormalizedCalendarEvent = { id: 'appointment', title: 'Visite borne de recharge', start: '2026-07-23T09:50:00.000Z', end: '2026-07-23T10:50:00.000Z', allDay: false, source: 'kadria-appointment', type: 'rendez-vous', location: null, projectId: 'project-1', projectRecordId: null, projectInternalNumber: null, projectReference: null, clientName: 'Jean Martin', clientPhone: '0612345678', clientEmail: null, address: '12 rue des Lilas', latitude: null, longitude: null, projectTitle: 'Installation', projectSummary: 'Visite technique avant devis.', budget: '1 500 €', desiredTimeline: null, photoCount: 2, responsibleUserId: null, responsibleUserName: null, actionUrl: '/dashboard-v2/projet/project-1', googleEventId: null, googleEventUrl: null, description: null, color: 'rendez-vous', status: 'confirmed', assignedUserId: 'user-1', assignedUserName: 'Jean Martin', isAssignedToCurrentUser: true, isUnassigned: false, qualification: null, confirmation: { status: 'confirmed', source: 'artisan', note: 'Client disponible le matin.', updatedAt: null, version: 1 }, rawAppointmentId: 'appointment' };

test('opens the contextual actions without starting appointment editing', () => {
  const onBrief = vi.fn();
  const onEdit = vi.fn();
  render(<AppointmentContextMenu event={event} onClose={vi.fn()} onBrief={onBrief} onEdit={onEdit} onOpenProject={vi.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Visite borne de recharge' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Brief Kadria' }));
  expect(onBrief).toHaveBeenCalledOnce();
  expect(onEdit).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Google Maps' })).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
  expect(screen.getByRole('link', { name: 'Téléphoner' })).toHaveAttribute('href', 'tel:0612345678');
});

test('renders only factual brief sections and closes with Escape', () => {
  const onClose = vi.fn();
  render(<AppointmentBriefDrawer event={event} onClose={onClose} onEdit={vi.fn()} onOpenProject={vi.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Visite borne de recharge' })).toBeVisible();
  expect(screen.getByText('Résumé Kadria')).toBeVisible();
  expect(screen.getByText(/2 photos disponibles/)).toBeVisible();
  expect(screen.queryByText("Ce qu'il faudra vérifier")).toBeNull();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
});
