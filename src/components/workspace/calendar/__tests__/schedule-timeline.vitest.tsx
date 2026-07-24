import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import ScheduleTimeline from '../ScheduleTimeline'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'

afterEach(cleanup)

Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })

const handlers = () => ({ onPrevious: vi.fn(), onNext: vi.fn(), onToday: vi.fn(), onViewChange: vi.fn(), onOpenEvent: vi.fn(), onCreate: vi.fn(), onMoveEvent: vi.fn(), onResizeEvent: vi.fn() })

function appointment(day: string): NormalizedCalendarEvent {
  return { id: 'appointment-1', title: 'Visite', start: `${day}T09:00:00.000Z`, end: `${day}T10:00:00.000Z`, allDay: false, source: 'kadria-appointment', type: 'rendez-vous', location: null, projectId: null, projectRecordId: null, projectInternalNumber: null, projectReference: null, clientName: null, clientPhone: null, clientEmail: null, address: null, latitude: null, longitude: null, projectTitle: null, projectSummary: null, budget: null, desiredTimeline: null, photoCount: 0, responsibleUserId: null, responsibleUserName: null, actionUrl: null, googleEventId: null, googleEventUrl: null, description: null, color: 'rendez-vous', status: 'confirmed', assignedUserId: null, assignedUserName: null, isAssignedToCurrentUser: false, isUnassigned: false, qualification: null, confirmation: null, rawAppointmentId: 'appointment-1' }
}

function renderTimeline(events: NormalizedCalendarEvent[] = [], view: 'jour' | 'semaine' = 'semaine', selectedDate = new Date('2026-07-21T12:00:00')) {
  const calls = handlers()
  render(<ScheduleTimeline view={view} selectedDate={selectedDate} events={events} qualificationAvailable={false} workStartTime={null} workEndTime={null} savingEventIds={new Set()} {...calls} />)
  return calls
}

test('shows the selected date and uses day-specific navigation labels', () => {
  const calls = renderTimeline([], 'jour')
  expect(screen.getByText(/Mardi 21 juillet 2026/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Jour précédent' }))
  fireEvent.click(screen.getByRole('button', { name: 'Jour suivant' }))
  expect(calls.onPrevious).toHaveBeenCalledOnce()
  expect(calls.onNext).toHaveBeenCalledOnce()
})

test('only exposes the now action for today in day view', async () => {
  renderTimeline([], 'jour', new Date())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aller à l’heure actuelle' })).toBeInTheDocument())
  expect(screen.getByRole('button', { name: 'Revenir à aujourd’hui' })).toBeDisabled()
})

test('does not render permanent add actions in day headers', () => {
  renderTimeline([appointment('2026-07-21')])
  expect(screen.queryByRole('button', { name: /ajouter un rendez-vous le/i })).toBeNull()
})

test('opens contextual creation from a keyboard-focused free planning area', () => {
  const calls = renderTimeline([appointment('2026-07-21'), appointment('2026-07-22')])
  const planningArea = screen.getByLabelText(/planning du mardi 21 juillet/i)
  planningArea.focus()
  expect(planningArea).toHaveFocus()
  fireEvent.keyDown(planningArea, { key: 'Enter' })
  expect(calls.onCreate).toHaveBeenCalledOnce()
  expect(calls.onCreate.mock.calls[0][0].toDateString()).toBe(new Date('2026-07-21T12:00:00').toDateString())
  expect(calls.onCreate.mock.calls[0][1]).toBeUndefined()
  expect(calls.onCreate.mock.calls[0][2]).toBeDefined()
})

test('shows a full-width contextual creation band over a free slot', () => {
  renderTimeline([appointment('2026-07-21')])
  const planningArea = screen.getByLabelText(/planning du mardi 21 juillet/i)
  fireEvent.mouseMove(planningArea, { clientY: 160 })
  const action = screen.getByRole('button', { name: /ajouter un rendez-vous le mardi 21/i })
  expect(action).toHaveTextContent('Ajouter un rendez-vous')
  expect(action.className).toContain('inset-x-2')
})
