import { getProjectCommercialAnalysis } from '@/src/lib/project-scoring'

export type DashboardProject = Record<string, any>
export type Project = DashboardProject

export function opportunityScore(project: DashboardProject, artisanTrades: string[] = []) {
  return getProjectCommercialAnalysis({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    aiSummary: project.aiSummary,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    city: project.city,
    siteAddress: project.siteAddress,
    completenessScore: project.completenessScore,
    photos: project.photos,
    source: project.source,
  }, { artisanTrades }).score
}

export function formatCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M €`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k €`
  return `${Math.round(value)} €`
}

export function calcDelta(current: number, previous: number) {
  return previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100
}
