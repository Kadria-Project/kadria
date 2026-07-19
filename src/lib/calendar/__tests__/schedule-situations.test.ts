import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveDayReadiness, deriveScheduleSituations } from '../schedule-situations.ts'
import type { NormalizedCalendarEvent } from '../normalized-event.ts'

const today = new Date(); today.setHours(10, 0, 0, 0)
const appointment = (overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent => ({ id: 'event-1', title: 'Visite', start: today.toISOString(), end: new Date(today.getTime() + 3_600_000).toISOString(), allDay: false, source: 'kadria-appointment', type: 'rendez-vous', location: 'Rouen', projectId: 'project-1', projectRecordId: 'project-1', projectInternalNumber: null, projectReference: null, clientName: 'Jean Martin', clientPhone: null, clientEmail: null, address: '1 rue de Paris', latitude: null, longitude: null, projectTitle: 'Installation', projectSummary: null, budget: null, desiredTimeline: null, photoCount: 0, responsibleUserId: null, responsibleUserName: null, actionUrl: '/dashboard-v2/projet/project-1', googleEventId: null, googleEventUrl: null, description: null, color: 'rendez-vous', status: null, assignedUserId: 'user-1', assignedUserName: 'Paul', isAssignedToCurrentUser: true, isUnassigned: false, qualification: null, confirmation: { status: 'confirmed', source: 'manual', note: null, updatedAt: null, version: 1 }, rawAppointmentId: 'appointment-1', ...overrides })

test('prioritizes a requested appointment change and keeps its contextual action', () => {
  const situations = deriveScheduleSituations([appointment({ confirmation: { status: 'change_requested', source: 'client', note: null, updatedAt: null, version: 1 } })], null, today)
  assert.equal(situations[0]?.kind, 'replan')
  assert.equal(situations[0]?.primaryAction?.target, '/dashboard-v2/agenda?appointmentId=appointment-1')
})

test('does not declare the day ready while a confirmation is missing', () => {
  const events = [appointment({ confirmation: { status: 'pending', source: null, note: null, updatedAt: null, version: 1 } })]
  const situations = deriveScheduleSituations(events, null, today)
  assert.equal(deriveDayReadiness({ loading: false, error: null, events, situations }).state, 'attention')
})

test('does not declare the day ready when planning controls are unavailable', () => {
  const events = [appointment()]
  assert.equal(deriveDayReadiness({ loading: false, error: null, events, situations: [], insightsVerified: false }).state, 'insufficient')
})
