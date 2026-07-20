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
}

export type HomeBrief = {
  generatedAt: string
  situation: string
  attention: HomeBriefItem[]
  opportunity: HomeBriefItem | null
  risk: HomeBriefItem | null
  canWait: string
}
