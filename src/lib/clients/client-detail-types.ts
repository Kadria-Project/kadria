import type { ClientActionPriority, ClientActionReason } from './clients-action-types'

export type ClientDetailTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type ClientProjectStatusGroup = 'active' | 'won' | 'lost' | 'other'

export type ClientNextAction = {
  reason: ClientActionReason
  label: string
  description: string
  priority: ClientActionPriority
  dueAt: string | null
  projectId: string | null
  projectTitle: string | null
  ctaLabel: string
  href: string | null
}

export type ClientAppointment = {
  id: string
  title: string
  startTime: string
  status: string | null
  confirmationStatus: string
  assignedUserId: string | null
  projectId: string
  projectTitle: string
  href: string
  isPast: boolean
}

export type ClientProjectSummary = {
  id: string
  title: string
  status: string
  statusGroup: ClientProjectStatusGroup
  createdAt: string | null
  updatedAt: string | null
  siteAddress: string | null
  acceptedAmount: number | null
  quoteCount: number
  nextAppointmentAt: string | null
  lastActivityAt: string | null
  href: string
}

export type ClientQuoteSummary = {
  id: string
  numero: string | null
  projectId: string
  projectTitle: string
  status: string
  statusLabel: string
  totalTtc: number
  sentAt: string | null
  acceptedAt: string | null
  createdAt: string | null
  href: string
}

export type ClientTimelineEvent = {
  id: string
  type: string
  title: string
  description: string | null
  occurredAt: string
  projectId: string | null
  projectTitle: string | null
  href: string | null
  tone: ClientDetailTone
}

export type ClientCommercialSummary = {
  totalQuotedAmount: number
  acceptedAmount: number
  conversionRate: number | null
  wonProjectCount: number
  averageWonProjectValue: number | null
  relationshipStartAt: string | null
  lastInteractionAt: string | null
}

export type ClientDetailSummary = {
  projectCount: number
  activeProjectCount: number
  wonProjectCount: number
  lostProjectCount: number
  quoteCount: number
  pendingQuoteCount: number
  acceptedQuoteCount: number
  totalQuotedAmount: number
  acceptedAmount: number
  averageProjectValue: number | null
  firstProjectAt: string | null
  lastProjectAt: string | null
  lastInteractionAt: string | null
}

export type ClientDetailIdentity = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  displayName: string
  contactName: string | null
  isCompany: boolean
  email: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  status: string
  createdAt: string | null
  isRecurring: boolean
}

export type ClientDetail = {
  client: ClientDetailIdentity
  summary: ClientDetailSummary
  commercialSummary: ClientCommercialSummary
  nextAction: ClientNextAction | null
  nextAppointment: ClientAppointment | null
  projects: ClientProjectSummary[]
  quotes: ClientQuoteSummary[]
  appointments: ClientAppointment[]
  timeline: ClientTimelineEvent[]
}

export type ClientDetailApiResponse =
  | ({ success: true } & { client: ClientDetail })
  | { success: false; error: string }
