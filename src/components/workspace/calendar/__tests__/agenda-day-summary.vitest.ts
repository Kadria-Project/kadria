import { expect, test } from 'vitest';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { deriveAgendaDaySummary } from '../agenda-day-summary';

function event(id: string, start: string | null, end: string | null, address: string | null = '12 rue des Lilas, Rouen'): NormalizedCalendarEvent {
  return { id, title: `Rendez-vous ${id}`, start, end, allDay: false, source: 'kadria-appointment', type: 'rendez-vous', location: null, projectId: null, projectRecordId: null, projectInternalNumber: null, projectReference: null, clientName: `Client ${id}`, clientPhone: null, clientEmail: null, address, latitude: null, longitude: null, projectTitle: null, projectSummary: null, budget: null, desiredTimeline: null, photoCount: 0, responsibleUserId: null, responsibleUserName: null, actionUrl: null, googleEventId: null, googleEventUrl: null, description: null, color: 'rendez-vous', status: 'confirmed', assignedUserId: null, assignedUserName: null, isAssignedToCurrentUser: false, isUnassigned: false, qualification: null, confirmation: { status: 'confirmed', source: 'artisan', note: null, updatedAt: null, version: 1 }, rawAppointmentId: id };
}

const selectedDate = new Date('2026-07-23T12:00:00');
const summary = (events: NormalizedCalendarEvent[], eventTypesByAppointmentId: Record<string, string> = {}) => deriveAgendaDaySummary({ events, selectedDate, eventTypesByAppointmentId, workStartTime: '08:00', workEndTime: '18:00' });

test('derives reliable day numbers, available slots and an itinerary from complete data', () => {
  const result = summary([event('one', '2026-07-23T08:30:00', '2026-07-23T10:00:00'), event('travel', '2026-07-23T10:00:00', '2026-07-23T10:30:00'), event('two', '2026-07-23T12:00:00', '2026-07-23T13:00:00', '0 Test Avenue, Rouen')], { travel: 'travel' });
  expect(result.appointmentCount).toBe(2);
  expect(result.plannedMinutes).toBe(150);
  expect(result.travelMinutes).toBe(30);
  expect(result.estimatedEnd).toBe('13:00');
  expect(result.availableSlots?.map((slot) => `${slot.start}-${slot.end}`)).toEqual(['08:00-08:30', '10:30-12:00', '13:00-18:00']);
  expect(result.routeStops).toHaveLength(2);
  expect(result.mapsUrl).toContain('google.com/maps/dir');
});

test('does not expose an itinerary when an address is missing', () => {
  const result = summary([event('one', '2026-07-23T09:00:00', '2026-07-23T10:00:00'), event('two', '2026-07-23T11:00:00', '2026-07-23T12:00:00', null)]);
  expect(result.routeStops).toBeNull();
  expect(result.mapsUrl).toBeNull();
});

test('does not calculate availability or end time from incomplete durations', () => {
  const result = summary([event('one', '2026-07-23T09:00:00', null)]);
  expect(result.incompleteDurations).toBe(true);
  expect(result.availableSlots).toBeNull();
  expect(result.availableMinutes).toBeNull();
  expect(result.estimatedEnd).toBeNull();
});
