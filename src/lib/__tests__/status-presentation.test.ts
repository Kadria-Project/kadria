import { describe, expect, it } from 'vitest'
import { formatAppointmentStatus, formatAutomationStatus, formatProjectStatus, formatQuoteStatus } from '../status-presentation'

describe('status presentation', () => {
  it('never exposes technical status values', () => {
    expect(formatAppointmentStatus('confirmed')).toBe('Confirmé')
    expect(formatProjectStatus('quote_sent')).toBe('Devis envoyé')
    expect(formatQuoteStatus('draft')).toBe('Brouillon')
    expect(formatAutomationStatus('pending')).toBe('En attente')
    expect(formatProjectStatus('future_enum')).toBe('Statut indisponible')
  })
})
