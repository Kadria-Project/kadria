export type ClientListSource = 'canonical' | 'legacy'

export type ClientListItem = {
  id: string
  source: ClientListSource
  displayName: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  city: string | null
  status: string
  projectCount: number
  activeProjectCount: number
  wonProjectCount: number
  lostProjectCount: number
  quoteCount: number
  acceptedQuoteCount: number
  pendingQuoteCount: number
  totalQuotedAmount: number
  acceptedAmount: number
  latestProject: { id: string; title: string; status: string; createdAt: string } | null
  nextAppointment: { id: string; title: string; startTime: string; confirmationStatus: string; assignedUserId: string | null } | null
  lastInteractionAt: string | null
  lastInteractionLabel: string | null
  needsAttention: boolean
  attentionReason: string | null
  possibleCanonicalClientId: string | null
}

export type ClientListResponse = {
  items: ClientListItem[]
  total: number
  page: number
  pageSize: number
  summary: { totalClients: number; activeClients: number; prospectsToFollowUp: number; recurringClients: number; totalAcceptedValue: number; legacyEntries: number; attentionCount: number }
  /**
   * Tenant-scoped CRM action center payload, derived from the full
   * (pre-pagination) client list so it never reflects only the current page.
   * Optional so older clients that don't need it can ignore it safely.
   */
  actions?: {
    items: import('./clients-action-types').ClientActionItem[]
    summary: import('./clients-action-types').ClientActionsSummary
  }
}
