import type { AssistantResponse } from './assistant-response'
import type { AssistantIntent } from './assistant-intents'
import { getDateRange } from '@/src/lib/performance/date-range'
import type { PerformancePeriodKey } from '@/src/lib/performance/performance-types'
import { buildPerformanceSnapshot } from '@/src/lib/performance/performanceService'
import { inRange, isAcceptedQuote, quoteAmount } from '@/src/lib/performance/performance-analytics'

type Row = Record<string, unknown>
export type PerformanceAssistantData = { projects: Row[]; quotes: Row[]; period: PerformancePeriodKey }

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
const percent = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(value)

function evidence(acceptedCount: number, previousRevenue: number) {
  if (acceptedCount === 0) return { level: 'limited' as const, note: 'Aucun devis accepté sur cette période.' }
  if (acceptedCount === 1) return { level: 'limited' as const, note: 'Un seul devis accepté : la variation reste à confirmer.' }
  if (previousRevenue === 0) return { level: 'moderate' as const, note: 'La période précédente ne permet pas une comparaison en pourcentage fiable.' }
  return { level: acceptedCount >= 4 ? 'solid' as const : 'moderate' as const }
}

function contributors(data: PerformanceAssistantData) {
  const period = getDateRange(data.period)
  const titleByProject = new Map(data.projects.map((project) => [String(project.id || ''), String(project.project_title || project.project_type || 'Dossier')]))
  return data.quotes
    .filter((quote) => isAcceptedQuote(quote) && inRange(quote.accepted_at ?? quote.created_at, period.current))
    .map((quote) => ({ id: String(quote.project_id || ''), label: titleByProject.get(String(quote.project_id || '')) || 'Dossier', amount: quoteAmount(quote), date: String(quote.accepted_at ?? quote.created_at ?? ''), href: `/dashboard-v2/projet/${encodeURIComponent(String(quote.project_id || ''))}` }))
    .filter((item) => item.id)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
}

export function buildPerformanceAssistantResponse(intent: Extract<AssistantIntent, `performance.${string}`>, data: PerformanceAssistantData): AssistantResponse {
  const snapshot = buildPerformanceSnapshot({ projects: data.projects, quotes: data.quotes }, data.period)
  const revenue = snapshot.kpis.find((kpi) => kpi.id === 'revenue')!
  const created = snapshot.kpis.find((kpi) => kpi.id === 'createdProjects')!
  const conversion = snapshot.kpis.find((kpi) => kpi.id === 'conversionRate')!
  const accepted = data.quotes.filter((quote) => isAcceptedQuote(quote) && inRange(quote.accepted_at ?? quote.created_at, snapshot.period.current))
  const proof = evidence(accepted.length, revenue.comparison.previousValue)
  const list = contributors(data)
  const title = `Performance sur ${snapshot.period.label}`
  if (intent === 'performance.contributing_projects') {
    return { intent, title: 'Dossiers contributeurs', summary: list.length ? `${list.length} devis composent le montant observé.` : 'Aucun devis accepté ne compose le montant observé sur cette période.', details: list.map((item) => ({ id: item.id, label: item.label, value: money(item.amount), meta: item.date ? `Accepté le ${new Date(item.date).toLocaleDateString('fr-FR')}` : undefined })), actions: list.map((item) => ({ kind: 'navigate' as const, label: `Ouvrir ${item.label}`, href: item.href })), evidence: proof }
  }
  if (intent === 'performance.explain_change') {
    const delta = revenue.comparison.deltaAbsolute
    const direction = delta > 0 ? 'hausse' : delta < 0 ? 'baisse' : 'stabilité'
    const concentration = list.length > 0 && revenue.value > 0 ? list.slice(0, 3).reduce((sum, item) => sum + item.amount, 0) / revenue.value : 0
    const note = revenue.value === 0 ? 'Aucune acceptation ne permet d’expliquer une variation de chiffre d’affaires.' : `${direction[0].toUpperCase()}${direction.slice(1)} de ${money(Math.abs(delta))}${concentration >= 0.7 ? ', concentrée sur peu de dossiers.' : '.'}`
    return { intent, title: 'Évolution du chiffre d’affaires', summary: note, details: [{ id: 'current', label: 'Période actuelle', value: money(revenue.value) }, { id: 'previous', label: 'Période précédente', value: money(revenue.comparison.previousValue) }, { id: 'accepted', label: 'Devis acceptés', value: String(accepted.length) }], actions: list.slice(0, 3).map((item) => ({ kind: 'navigate' as const, label: `Ouvrir ${item.label}`, href: item.href })), evidence: proof }
  }
  return { intent, title, summary: `${money(revenue.value)} TTC observés sur ${snapshot.period.label.toLowerCase()}.`, details: [{ id: 'revenue', label: 'Chiffre d’affaires', value: money(revenue.value), meta: revenue.comparison.deltaPercent === null ? undefined : `${revenue.comparison.deltaPercent >= 0 ? '+' : ''}${revenue.comparison.deltaPercent.toFixed(1)} %` }, { id: 'projects', label: 'Dossiers créés', value: String(created.value) }, { id: 'conversion', label: 'Transformation', value: percent(conversion.value) }], actions: list.slice(0, 3).map((item) => ({ kind: 'navigate' as const, label: `Ouvrir ${item.label}`, href: item.href })), evidence: proof }
}
