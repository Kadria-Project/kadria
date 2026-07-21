import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppointmentDetailsModal from '../AppointmentDetailsModal'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'

function event(projectId: string | null): NormalizedCalendarEvent {
  return { title: 'Visite', projectId, start: null, end: null, clientName: null, projectTitle: null, address: null, location: null, clientPhone: null, clientEmail: null, confirmation: null } as unknown as NormalizedCalendarEvent
}

const handlers = () => ({ onClose: vi.fn(), onPrepare: vi.fn(), onManual: vi.fn(), onReplan: vi.fn(), onEdit: vi.fn(), onOpenProject: vi.fn() })

afterEach(cleanup)

describe('AppointmentDetailsModal actions', () => {
  it('renders accessible buttons and invokes their existing actions', () => {
    const calls = handlers()
    render(<AppointmentDetailsModal event={event('project-1')} {...calls} />)
    fireEvent.click(screen.getByRole('button', { name: /modifier le rendez-vous/i }))
    fireEvent.click(screen.getByRole('button', { name: /ouvrir le dossier/i }))
    expect(calls.onEdit).toHaveBeenCalledOnce()
    expect(calls.onOpenProject).toHaveBeenCalledOnce()
  })

  it('hides the project action when no project is associated', () => {
    render(<AppointmentDetailsModal event={event(null)} {...handlers()} />)
    expect(screen.queryByRole('button', { name: /ouvrir le dossier/i })).toBeNull()
  })
})
