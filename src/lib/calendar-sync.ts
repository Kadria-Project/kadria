export type CalendarProvider = 'google' | 'outlook' | 'apple'

export type CalendarConnection = {
  artisanId: string
  calendarConnected: boolean
  calendarProvider: CalendarProvider | null
  calendarToken?: string
  calendarRefreshToken?: string
  calendarSyncEnabled: boolean
}

export type CalendarSyncCapability =
  | 'createAppointments'
  | 'showAvailability'
  | 'blockUnavailableSlots'
  | 'suggestTimeSlots'

export const CALENDAR_PROVIDER_V1: CalendarProvider = 'google'
export const FUTURE_CALENDAR_PROVIDERS: CalendarProvider[] = ['outlook', 'apple']

export const FUTURE_CALENDAR_CAPABILITIES: CalendarSyncCapability[] = [
  'createAppointments',
  'showAvailability',
  'blockUnavailableSlots',
  'suggestTimeSlots',
]

export function createEmptyCalendarConnection(artisanId: string): CalendarConnection {
  return {
    artisanId,
    calendarConnected: false,
    calendarProvider: null,
    calendarSyncEnabled: false,
  }
}
