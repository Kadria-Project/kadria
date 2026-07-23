import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import AppointmentMoveConfirmationModal from '../AppointmentMoveConfirmationModal';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

afterEach(cleanup);

const event: NormalizedCalendarEvent = { id: 'appointment', title: 'Visite borne de recharge', start: '2026-07-23T09:50:00.000Z', end: '2026-07-23T10:50:00.000Z', allDay: false, source: 'kadria-appointment', type: 'rendez-vous', location: null, projectId: 'project-1', projectRecordId: null, projectInternalNumber: null, projectReference: null, clientName: 'Jean Martin', clientPhone: null, clientEmail: null, address: '12 rue des Lilas', latitude: null, longitude: null, projectTitle: 'Installation', projectSummary: null, budget: null, desiredTimeline: null, photoCount: 0, responsibleUserId: null, responsibleUserName: null, actionUrl: '/dashboard-v2/projet/project-1', googleEventId: null, googleEventUrl: null, description: null, color: 'rendez-vous', status: 'confirmed', assignedUserId: 'user-1', assignedUserName: 'Jean Martin', isAssignedToCurrentUser: true, isUnassigned: false, qualification: null, confirmation: { status: 'confirmed', source: 'artisan', note: null, updatedAt: null, version: 1 }, rawAppointmentId: 'appointment' };

test('keeps a move pending until an explicit confirmation and allows time correction', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<AppointmentMoveConfirmationModal event={event} previousStart={new Date(event.start!)} previousEnd={new Date(event.end!)} nextStart={new Date('2026-07-23T10:15:00.000Z')} nextEnd={new Date('2026-07-23T11:15:00.000Z')} previousAssigneeName="Jean Martin" nextAssigneeName="Jean Martin" conflictTitle={null} saving={false} error={null} onCancel={onCancel} onConfirm={onConfirm} />);
  expect(screen.getByRole('dialog', { name: 'Confirmer le déplacement du rendez-vous' })).toBeVisible();
  expect(screen.getAllByText('Jean Martin')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Nouvelle fin'), { target: { value: '2026-07-23T13:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer le nouvel horaire' }));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(onCancel).not.toHaveBeenCalled();
});

test('can be cancelled without confirming a move', () => {
  const onCancel = vi.fn();
  render(<AppointmentMoveConfirmationModal event={event} previousStart={new Date(event.start!)} previousEnd={new Date(event.end!)} nextStart={new Date('2026-07-23T10:15:00.000Z')} nextEnd={new Date('2026-07-23T11:15:00.000Z')} previousAssigneeName="Jean Martin" nextAssigneeName="Claire Dupont" conflictTitle="Diagnostic électrique" saving={false} error={null} onCancel={onCancel} onConfirm={vi.fn()} />);
  expect(screen.getByText(/Nouvelle affectation/)).toBeVisible();
  expect(screen.getByText(/Conflit potentiel/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(onCancel).toHaveBeenCalledOnce();
});
