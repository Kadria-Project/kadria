export type TrackingDataQuality = {
  level: 'complete' | 'partial' | 'insufficient'
  reservations: string[]
}

export type TrackingOpportunity = {
  id: string
  projectId: string
  title: string
  clientLabel: string
  stage: string
  amount: number | null
  stalledForDays: number | null
  observedFacts: string[]
  evidenceLevel: 'strong' | 'moderate' | 'weak'
  uncertainty: string | null
  blockage: string | null
  missingInformation: string[]
  recommendation: string
  destination: { label: string; href: string }
}

export type TrackingBrief = {
  generatedAt: string
  dataQuality: TrackingDataQuality
  opportunities: TrackingOpportunity[]
}
