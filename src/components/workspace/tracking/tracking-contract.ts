export type TrackingDataQuality = {
  level: 'complete' | 'partial' | 'insufficient'
  reservations: string[]
}

export type TrackingEvidenceLevel = 'strong' | 'moderate' | 'weak'

export type TrackingOpportunity = {
  id: string
  projectId: string
  title: string
  clientLabel: string
  stage: string
  amount: number | null
  stalledForDays: number | null
  observedFacts: string[]
  evidenceLevel: TrackingEvidenceLevel
  uncertainty: string | null
  blockage: string | null
  missingInformation: string[]
  recommendation: string
  destination: { label: string; href: string }
}

export type TrackingPipelineStage = {
  key: 'new' | 'qualification' | 'quote_to_prepare' | 'quote_sent' | 'waiting_client' | 'won'
  label: string
  count: number
  quoteAmount: number
}

export type TrackingProjectRow = {
  id: string
  title: string
  clientLabel: string
  stage: TrackingPipelineStage['key']
  stageLabel: string
  progress: number
  lastActivity: { label: string; ageLabel: string; tone: 'neutral' | 'positive' | 'attention' }
  nextStep: { label: string; href: string }
}

export type TrackingMovement = {
  id: string
  projectId: string
  title: string
  clientLabel: string
  description: string
  occurredAt: string
  timeLabel: string
  stageLabel: string
  tone: 'positive' | 'info' | 'attention'
}

export type TrackingSlowdown = {
  id: string
  projectId: string
  title: string
  clientLabel: string
  stageLabel: string
  reason: string
  stalledForDays: number
  evidenceLevel: TrackingEvidenceLevel
  href: string
}

export type TrackingWorkspace = {
  firstName: string | null
  activeCount: number
  progressingCount: number
  slowingCount: number
  decisionCount: number
  pipeline: TrackingPipelineStage[]
  quoteValueInProgress: number
  progressedThroughQuoteCount: number
  movements: TrackingMovement[]
  slowdowns: TrackingSlowdown[]
  projects: TrackingProjectRow[]
}

export type TrackingBrief = {
  generatedAt: string
  dataQuality: TrackingDataQuality
  opportunities: TrackingOpportunity[]
  workspace?: TrackingWorkspace
}
