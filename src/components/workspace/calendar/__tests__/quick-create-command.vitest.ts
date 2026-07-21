import { describe, expect, it } from 'vitest'
import { consumeAppointmentQuickCreateRoute, isAppointmentQuickCreate } from '../quick-create-command'

describe('agenda quick-create command', () => {
  it('opens only for the appointment command and consumes it durably on close', () => {
    expect(isAppointmentQuickCreate('appointment')).toBe(true)
    expect(isAppointmentQuickCreate(null)).toBe(false)
    expect(consumeAppointmentQuickCreateRoute()).toBe('/dashboard-v2/agenda')
  })
})
