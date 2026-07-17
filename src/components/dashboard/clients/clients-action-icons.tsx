import { CalendarClock, CalendarCheck2, FileClock, PhoneCall, Clock, RefreshCcw, Users, Link2Off, type LucideIcon } from 'lucide-react'
import type { ClientActionConfigEntry } from '@/src/lib/clients/clients-action-config'

export const CLIENT_ACTION_ICONS: Record<ClientActionConfigEntry['icon'], LucideIcon> = {
  'calendar-change': CalendarClock,
  'calendar-check': CalendarCheck2,
  quote: FileClock,
  phone: PhoneCall,
  clock: Clock,
  refresh: RefreshCcw,
  users: Users,
  'link-off': Link2Off,
}
