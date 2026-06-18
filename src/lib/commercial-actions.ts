export type OpportunityBadge = {
  label: string
  color: string
  bg: string
  border: string
}

type ProjectLike = {
  id?: string
  status?: string
  completenessScore?: number
  budget?: string
  desiredTimeline?: string
  maturity?: string
  createdAt?: string
  callbackDate?: string
  updatedAt?: string
  lastInteractionAt?: string | null
  quoteSentAt?: string | null
  lastFollowUpAt?: string | null
  lastOpenedDate?: string | null
  opensCount?: number
  city?: string
  latitude?: number | null
  longitude?: number | null
  projectType?: string
  trade?: string
  clientFirstName?: string
  clientName?: string
  clientEmail?: string
}

type FollowUpProjectLike = ProjectLike & {
  lastOpenedDate?: string | null
  firstOpenedAt?: string | null
}

export type ProjectRiskStatus = {
  status: 'none' | 'atRisk' | 'followUp'
  label: string
  reason: string
  daysWithoutAction: number | null
}

export type Task = {
  id: string
  projectId: string
  type: 'call' | 'quote' | 'followUp' | 'email'
  title: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function parseBudgetValue(budget?: string): number {
  if (!budget) return 0
  const matches = budget.match(/\d+[\s\d]*/g)
  if (!matches) return 0
  const values = matches
    .map((value) => Number.parseInt(value.replace(/\s/g, ''), 10))
    .filter((value) => Number.isFinite(value) && value > 0)

  return values.length ? Math.max(...values) : 0
}

function budgetScore(budget?: string): number {
  const value = parseBudgetValue(budget)
  if (value >= 12000) return 100
  if (value >= 8000) return 85
  if (value >= 5000) return 70
  if (value >= 3000) return 55
  if (value >= 1000) return 35
  return value > 0 ? 20 : 0
}

function urgencyScore(project: ProjectLike): number {
  const text = `${project.maturity || ''} ${project.desiredTimeline || ''}`.toLowerCase()
  if (text.includes('urgent') || text.includes('au plus vite')) return 100
  if (text.includes('pret') || text.includes('pret') || text.includes('1 mois')) return 80
  if (text.includes('3 mois') || text.includes('court')) return 60
  if (text.includes('compare') || text.includes('renseigne')) return 35
  return 45
}

function timelineScore(timeline?: string): number {
  const text = (timeline || '').toLowerCase()
  if (!text) return 30
  if (text.includes('urgent') || text.includes('1 mois') || text.includes('moins')) return 100
  if (text.includes('3 mois') || text.includes('court')) return 70
  if (text.includes('6 mois')) return 45
  return 55
}

function responsivenessScore(project: ProjectLike): number {
  const date = project.callbackDate || project.createdAt
  if (!date) return 40
  const ageDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (!Number.isFinite(ageDays) || ageDays < 0) return 60
  if (ageDays <= 1) return 100
  if (ageDays <= 3) return 80
  if (ageDays <= 7) return 55
  if (ageDays <= 14) return 35
  return 20
}

function distanceScore(project: ProjectLike): number {
  if (project.latitude && project.longitude) return 100
  if (project.city) return 70
  return 35
}

function daysSince(value?: string | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.floor((Date.now() - time) / 86400000))
}

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function isHotLead(project: ProjectLike): boolean {
  const budgetHigh = parseBudgetValue(project.budget) >= 10000
  const urgencyHigh = urgencyScore(project) >= 80 || timelineScore(project.desiredTimeline) >= 90
  const complete = Number(project.completenessScore) >= 100
  const meetingRequested = `${project.maturity || ''} ${project.desiredTimeline || ''}`.toLowerCase().includes('rdv')
  const recentAfterFollowUp = daysSince(project.lastFollowUpAt) !== null && daysSince(project.lastFollowUpAt)! <= 1
  const quoteOpenedOften = Number(project.opensCount || 0) >= 2

  return budgetHigh || urgencyHigh || complete || meetingRequested || recentAfterFollowUp || quoteOpenedOften
}

export function getHotLeadMessage(project: ProjectLike): string {
  const name = [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Un prospect'
  const followUpDays = daysSince(project.lastFollowUpAt)
  if (followUpDays !== null && followUpDays < 1) return `${name} a repondu a votre e-mail recemment.`
  if (Number(project.opensCount || 0) >= 2) return `${name} a consulte le devis plusieurs fois.`
  if (parseBudgetValue(project.budget) >= 10000) return `${name} a un budget eleve a traiter en priorite.`
  if (Number(project.completenessScore) >= 100) return `${name} a un dossier complet pret a etre chiffre.`
  return `${name} montre des signaux commerciaux forts.`
}

export function getProjectRiskStatus(project: ProjectLike): ProjectRiskStatus {
  const lastAction = project.lastInteractionAt || project.updatedAt || project.callbackDate || project.createdAt
  const daysWithoutAction = daysSince(lastAction)
  const quoteAge = project.status?.startsWith('Devis') ? daysSince(project.quoteSentAt || project.updatedAt || project.createdAt) : null
  const incompleteAge = Number(project.completenessScore || 0) < 100 ? daysSince(project.createdAt) : null
  const appointmentUnconfirmed = `${project.maturity || ''} ${project.desiredTimeline || ''}`.toLowerCase().includes('rdv non confirme')

  if (appointmentUnconfirmed) {
    return { status: 'atRisk', label: 'En risque', reason: 'Rendez-vous non confirme', daysWithoutAction }
  }
  if (quoteAge !== null && quoteAge >= 10) {
    return { status: 'followUp', label: 'A relancer', reason: 'Devis envoye depuis 10 jours sans reponse', daysWithoutAction }
  }
  if (daysWithoutAction !== null && daysWithoutAction >= 14) {
    return { status: 'atRisk', label: 'En risque', reason: 'Aucune action depuis 14 jours', daysWithoutAction }
  }
  if (incompleteAge !== null && incompleteAge >= 7) {
    return { status: 'followUp', label: 'A relancer', reason: 'Dossier incomplet depuis 7 jours', daysWithoutAction }
  }

  return { status: 'none', label: 'OK', reason: '', daysWithoutAction }
}

export function buildAutomaticTasks(projects: ProjectLike[]): Task[] {
  const tasks = projects.flatMap((project) => {
    const projectId = project.id || ''
    if (!projectId) return []
    const list: Task[] = []
    const budget = parseBudgetValue(project.budget)
    const risk = getProjectRiskStatus(project)

    if (Number(project.completenessScore || 0) >= 100) {
      list.push({
        id: `${projectId}-call`,
        projectId,
        type: 'call',
        title: 'Appeler le prospect',
        dueDate: new Date().toISOString(),
        priority: budget > 10000 ? 'high' : 'medium',
        completed: false,
      })
    }

    if (Number(project.completenessScore || 0) >= 100 && !project.status?.startsWith('Devis')) {
      list.push({
        id: `${projectId}-quote`,
        projectId,
        type: 'quote',
        title: 'Preparer le devis',
        dueDate: new Date().toISOString(),
        priority: budget > 10000 ? 'high' : 'medium',
        completed: false,
      })
    }

    if (budget > 10000) {
      list.push({
        id: `${projectId}-high-priority`,
        projectId,
        type: 'call',
        title: 'Priorite haute',
        dueDate: new Date().toISOString(),
        priority: 'high',
        completed: false,
      })
    }

    if (project.status?.startsWith('Devis')) {
      list.push({
        id: `${projectId}-quote-follow-up`,
        projectId,
        type: 'followUp',
        title: 'Relancer dans 3 jours',
        dueDate: addDays(3),
        priority: 'medium',
        completed: false,
      })
    }

    if (risk.status !== 'none') {
      list.push({
        id: `${projectId}-email`,
        projectId,
        type: 'email',
        title: 'Envoyer un e-mail',
        dueDate: new Date().toISOString(),
        priority: risk.status === 'atRisk' ? 'high' : 'medium',
        completed: false,
      })
    }

    return list
  })

  const priorityWeight = { high: 0, medium: 1, low: 2 }
  return tasks.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
}

export function calculateOpportunityScore(project: ProjectLike): number {
  const completeness = clamp(Number(project.completenessScore) || 0)
  const score =
    completeness * 0.2 +
    budgetScore(project.budget) * 0.2 +
    urgencyScore(project) * 0.15 +
    timelineScore(project.desiredTimeline) * 0.15 +
    responsivenessScore(project) * 0.2 +
    distanceScore(project) * 0.1

  return Math.round(clamp(score))
}

export function getOpportunityBadge(score: number): OpportunityBadge {
  if (score >= 80) {
    return {
      label: 'Priorite elevee',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      border: 'rgba(34,197,94,0.28)',
    }
  }
  if (score >= 50) {
    return {
      label: 'A suivre',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.28)',
    }
  }
  return {
    label: 'Faible potentiel',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.28)',
  }
}

export function getBestFollowUpTime(project: FollowUpProjectLike) {
  const lastInteractionDate = project.lastOpenedDate || project.firstOpenedAt || project.callbackDate || project.createdAt || ''
  const lastInteraction = lastInteractionDate ? new Date(lastInteractionDate) : null
  const daysWithoutInteraction =
    lastInteraction && Number.isFinite(lastInteraction.getTime())
      ? Math.max(0, Math.floor((Date.now() - lastInteraction.getTime()) / 86400000))
      : null

  const urgent = urgencyScore(project) >= 80 || daysWithoutInteraction === null || daysWithoutInteraction >= 2

  return {
    primarySlot: urgent ? "Aujourd'hui entre 12 h et 14 h" : "Demain entre 12 h et 14 h",
    secondarySlot: 'Ou entre 17 h et 20 h',
    lastInteractionDate,
    daysWithoutInteraction,
  }
}

export function generateQuoteFollowUpEmail(params: {
  firstName?: string
  quoteSentAt?: string
  projectType?: string
  artisanName?: string
}) {
  const sentDate = params.quoteSentAt
    ? new Date(params.quoteSentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'pr\u00e9c\u00e9demment'
  const firstName = params.firstName?.trim() || ''
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const projectType = params.projectType?.trim() || 'votre projet'
  const artisanName = params.artisanName?.trim() || 'Votre artisan'

  return {
    subject: 'Suite \u00e0 votre demande de devis',
    text: `${greeting}

Je me permets de revenir vers vous concernant le devis transmis le ${sentDate} pour votre projet de ${projectType}.

Je reste disponible pour r\u00e9pondre \u00e0 vos questions ou \u00e9changer sur certains points si n\u00e9cessaire.

N'h\u00e9sitez pas \u00e0 me faire un retour afin que nous puissions avancer ensemble.

Bien cordialement,

${artisanName}`,
  }
}
