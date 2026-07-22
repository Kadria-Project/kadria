export type HomeBriefLevel = 'high' | 'medium' | 'low'

export type HomeBriefAction = {
  label: string
  href: string
}

export type HomeBriefItem = {
  id: string
  title: string
  observation: string
  proofLevel: HomeBriefLevel
  proofLabel: string
  whyItMatters: string
  consequence: string
  recommendation: string
  action: HomeBriefAction
  context?: {
    clientName: string
    projectTitle: string
    status: string
    value: string
    timing: string
  }
}

export type HomeBrief = {
  generatedAt: string
  situation: string
  attention: HomeBriefItem[]
  opportunity: HomeBriefItem | null
  risk: HomeBriefItem | null
  canWait: string
  impact: { headline: string; detail: string }
  agenda: Array<{ id: string; day: 'today' | 'tomorrow'; time: string; title: string; context: string; location: string | null }>
  deferred: HomeBriefItem[]
  summary: { quoteSent: number; quoteAccepted: number; activeProjects: number }
}
