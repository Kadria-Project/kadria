import { describe, expect, it } from 'vitest'
import { formatDateFr, formatDateShortFr, formatDateTimeFr, formatSmartDateFr, formatTimeFr } from '../date-format'

describe('date format', () => {
  const options = { timeZone: 'Europe/Paris' }

  it('formats ISO values for French user-facing text', () => {
    const value = '2026-07-24T08:30:00+00:00'
    expect(formatDateFr(value, options)).toBe('24 juillet 2026')
    expect(formatDateShortFr(value, options)).toBe('24/07/2026')
    expect(formatTimeFr(value, options)).toBe('10 h 30')
    expect(formatDateTimeFr(value, options)).toBe('24 juillet 2026 à 10 h 30')
  })

  it('uses contextual today labels and safe fallbacks', () => {
    expect(formatSmartDateFr('2026-07-24T08:30:00+00:00', { ...options, now: new Date('2026-07-24T07:00:00+00:00') })).toBe('Aujourd’hui à 10 h 30')
    expect(formatDateTimeFr('not-a-date', options)).toBe('Date indisponible')
  })
})
