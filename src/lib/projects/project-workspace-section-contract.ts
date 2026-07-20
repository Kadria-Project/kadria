export type ProjectWorkspaceSectionKey = 'client' | 'documents' | 'commercial' | 'history' | 'engagement'

export type ProjectClientSectionDto = { label: string | null; phone: string | null; email: string | null; address: string | null }
export type ProjectDocumentsSectionDto = { items: Array<{ id: string; type: 'photo' | 'document'; name: string; url: string; createdAt?: string }> }
export type ProjectCommercialSectionDto = { quotes: Array<{ id: string; number: string | null; status: string; amount: number; issuedAt: string | null; sentAt: string | null; acceptedAt: string | null; declinedAt: string | null }> }
export type ProjectHistorySectionDto = { events: Array<{ id: string; type: string; label: string; occurredAt: string; summary: string | null; source: string | null }>; nextOffset: number | null }
export type ProjectEngagementSectionDto = { appointments: Array<{ id: string; type: string; status: string; startsAt: string; endsAt: string | null; label: string | null; assigneeId: string | null; location: string | null }> }

export type ProjectWorkspaceSectionData = {
  client: ProjectClientSectionDto
  documents: ProjectDocumentsSectionDto
  commercial: ProjectCommercialSectionDto
  history: ProjectHistorySectionDto
  engagement: ProjectEngagementSectionDto
}
