import type { TrackingAnalysis, TrackingBrief, TrackingMovement, TrackingOpportunity, TrackingPipelineStage, TrackingProjectRow, TrackingSlowdown } from './tracking-contract'

export type TrackingProjectInput = {
  id: string; status: string; clientName: string; clientFirstName: string; projectType: string; trade: string; budget: string; devisAmount: number; completenessScore: number; createdAt: string; updatedAt: string; callbackDate: string; quoteSentAt: string | null; acceptedAt: string | null; lastFollowUpAt: string | null
}

const DAY = 86_400_000
const pipeline: Array<Pick<TrackingPipelineStage, 'key' | 'label'>> = [
  { key: 'new', label: 'Nouveau' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'quote_to_prepare', label: 'À chiffrer' },
  { key: 'quote_sent', label: 'Devis envoyé' },
  { key: 'waiting_client', label: 'En attente client' },
  { key: 'won', label: 'Gagné' },
]

function daysSince(value: string | null, now: Date) { const time = value ? new Date(value).getTime() : NaN; return Number.isFinite(time) ? Math.max(0, Math.floor((now.getTime() - time) / DAY)) : null }
function relativeLabel(value: string, now: Date) { const days = daysSince(value, now); if (days === null) return 'Date non disponible'; if (days === 0) return 'Aujourd’hui'; if (days === 1) return 'Hier'; return `Il y a ${days} jours` }
function parseBudget(value: string) { const values = value.match(/\d+[\s\d]*/g)?.map((part) => Number.parseInt(part.replace(/\s/g, ''), 10)).filter(Number.isFinite) || []; return values.length ? Math.max(...values) : null }
function clientLabel(project: TrackingProjectInput) { return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client à préciser' }
function title(project: TrackingProjectInput) { return project.projectType || project.trade || 'Dossier commercial' }
function destination(project: TrackingProjectInput, label: string, focus: string) { return { label, href: `/dashboard-v2/projet/${project.id}?focus=${focus}` } }
function normalizedStatus(project: TrackingProjectInput) { const value = project.status.trim(); return ({ 'A rappeler': 'À rappeler', Qualifie: 'Qualifié', 'Devis envoye': 'Devis envoyé', 'Devis accepte': 'Devis accepté', Gagne: 'Gagné' } as Record<string, string>)[value] || value || 'Nouveau' }
function isClosed(project: TrackingProjectInput) { return ['Perdu', 'Archivé', 'Archive', 'Clôturé', 'Terminé'].includes(normalizedStatus(project)) }
function quoteAmount(project: TrackingProjectInput) { return project.devisAmount > 0 ? project.devisAmount : 0 }
function stageFor(project: TrackingProjectInput, now: Date): TrackingPipelineStage['key'] {
  const status = normalizedStatus(project)
  if (status === 'Gagné' || status === 'Devis accepté' || project.acceptedAt) return 'won'
  const sentDays = daysSince(project.quoteSentAt, now)
  if (project.quoteSentAt || status === 'Devis envoyé') return sentDays !== null && sentDays >= 7 ? 'waiting_client' : 'quote_sent'
  if (status === 'Qualifié' || status === 'En cours') return 'quote_to_prepare'
  if (status === 'À rappeler') return 'qualification'
  return 'new'
}
function stageLabel(project: TrackingProjectInput, now: Date) { return pipeline.find((item) => item.key === stageFor(project, now))?.label || 'Nouveau' }

function nextStepFor(project: TrackingProjectInput, now: Date) {
  const stage = stageFor(project, now)
  if (stage === 'waiting_client') return destination(project, 'Relancer le client', 'quote_followup')
  if (stage === 'quote_sent') return destination(project, 'Suivre la réception du devis', 'quote_followup')
  if (stage === 'quote_to_prepare') return destination(project, 'Préparer le devis', 'quote')
  if (stage === 'qualification') return destination(project, project.callbackDate ? 'Préparer le rappel' : 'Définir un rappel', 'callback')
  if (stage === 'won') return destination(project, 'Examiner la prochaine étape', 'planning')
  return destination(project, 'Qualifier la demande', 'qualification')
}

function slowdownFor(project: TrackingProjectInput, now: Date): TrackingSlowdown | null {
  const stage = stageFor(project, now)
  const quoteDays = daysSince(project.quoteSentAt, now)
  const activityDays = daysSince(project.lastFollowUpAt || project.updatedAt || project.createdAt, now)
  if (stage === 'waiting_client' && quoteDays !== null) return { id: `waiting-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), stageLabel: 'En attente client', reason: `Le devis est envoyé depuis ${quoteDays} jours, sans décision enregistrée.`, stalledForDays: quoteDays, evidenceLevel: 'strong', href: destination(project, 'Préparer la relance', 'quote_followup').href }
  if (stage === 'quote_to_prepare' && activityDays !== null && activityDays >= 7) return { id: `quote-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), stageLabel: 'À chiffrer', reason: `Le devis n’est pas encore préparé après ${activityDays} jours sans activité récente.`, stalledForDays: activityDays, evidenceLevel: 'moderate', href: destination(project, 'Préparer le devis', 'quote').href }
  if ((stage === 'new' || stage === 'qualification') && activityDays !== null && activityDays >= 10) return { id: `inactive-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), stageLabel: stageLabel(project, now), reason: `Aucune activité commerciale n’est enregistrée depuis ${activityDays} jours.`, stalledForDays: activityDays, evidenceLevel: 'weak', href: destination(project, 'Examiner le dossier', 'commercial').href }
  return null
}

function movementFor(project: TrackingProjectInput, now: Date): TrackingMovement | null {
  const acceptedDays = daysSince(project.acceptedAt, now)
  if (project.acceptedAt && acceptedDays !== null && acceptedDays <= 1) return { id: `accepted-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), description: 'Le devis a été accepté.', occurredAt: project.acceptedAt, timeLabel: relativeLabel(project.acceptedAt, now), stageLabel: 'Gagné', tone: 'positive' }
  const quoteDays = daysSince(project.quoteSentAt, now)
  if (project.quoteSentAt && quoteDays !== null && quoteDays <= 1) return { id: `sent-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), description: 'Le devis a été envoyé.', occurredAt: project.quoteSentAt, timeLabel: relativeLabel(project.quoteSentAt, now), stageLabel: 'Devis envoyé', tone: 'info' }
  const followUpDays = daysSince(project.lastFollowUpAt, now)
  if (project.lastFollowUpAt && followUpDays !== null && followUpDays <= 1) return { id: `follow-up-${project.id}`, projectId: project.id, title: title(project), clientLabel: clientLabel(project), description: 'Une relance client a été enregistrée.', occurredAt: project.lastFollowUpAt, timeLabel: relativeLabel(project.lastFollowUpAt, now), stageLabel: stageLabel(project, now), tone: 'info' }
  return null
}

function rowFor(project: TrackingProjectInput, now: Date): TrackingProjectRow {
  const stage = stageFor(project, now)
  const slowdown = slowdownFor(project, now)
  const lastActivity = slowdown
    ? { label: slowdown.reason, ageLabel: relativeLabel(project.lastFollowUpAt || project.quoteSentAt || project.createdAt, now), tone: 'attention' as const }
    : project.acceptedAt
      ? { label: 'Devis accepté', ageLabel: relativeLabel(project.acceptedAt, now), tone: 'positive' as const }
      : project.quoteSentAt
        ? { label: 'Devis envoyé', ageLabel: relativeLabel(project.quoteSentAt, now), tone: 'neutral' as const }
        : project.lastFollowUpAt
          ? { label: 'Relance client enregistrée', ageLabel: relativeLabel(project.lastFollowUpAt, now), tone: 'neutral' as const }
          : { label: 'Demande créée', ageLabel: relativeLabel(project.createdAt, now), tone: 'neutral' as const }
  const watchReason = slowdown ? slowdown.reason : stage === 'waiting_client' ? 'Devis sans réponse' : stage === 'quote_to_prepare' ? 'Prêt à chiffrer' : stage === 'quote_sent' ? 'Mouvement récent à accompagner' : stage === 'qualification' ? 'Décision attendue' : 'Prochaine étape à confirmer'
  return { id: project.id, title: title(project), clientLabel: clientLabel(project), stage, stageLabel: stageLabel(project, now), progress: pipeline.findIndex((item) => item.key === stage) + 1, lastActivity, watchReason, nextStep: nextStepFor(project, now) }
}

function analysesFor(projects: TrackingProjectInput[], slowdowns: TrackingSlowdown[], now: Date): TrackingAnalysis[] {
  const analyses: TrackingAnalysis[] = []
  const strongestSlowdown = slowdowns.find((item) => item.evidenceLevel === 'strong')
  if (strongestSlowdown) analyses.push({ id: 'main_risk', title: 'Risque principal', description: strongestSlowdown.reason, evidenceLevel: 'strong', tone: 'attention' })
  const followUpTarget = projects.find((project) => stageFor(project, now) === 'waiting_client' && daysSince(project.quoteSentAt, now) !== null)
  if (followUpTarget) analyses.push({ id: 'best_lever', title: 'Meilleur levier', description: `Relancer ${clientLabel(followUpTarget)} : le devis est en attente d’une décision client.`, evidenceLevel: 'strong', tone: 'positive' })
  const progressedCount = projects.filter((project) => ['quote_sent', 'waiting_client'].includes(stageFor(project, now))).length
  if (progressedCount >= 2) analyses.push({ id: 'observed_trend', title: 'Tendance observée', description: `${progressedCount} dossiers ont atteint l’étape devis ou attendent une réponse client.`, evidenceLevel: 'moderate', tone: 'neutral' })
  return analyses.slice(0, 3)
}

function opportunityFor(project: TrackingProjectInput, now: Date): TrackingOpportunity | null {
  if (!project.id || isClosed(project) || stageFor(project, now) === 'won') return null
  const slowdown = slowdownFor(project, now)
  const amount = project.devisAmount > 0 ? project.devisAmount : parseBudget(project.budget)
  const base = { projectId: project.id, title: title(project), clientLabel: clientLabel(project), amount, stalledForDays: slowdown?.stalledForDays || null }
  if (slowdown) return { ...base, id: slowdown.id, stage: slowdown.stageLabel, observedFacts: [slowdown.reason], evidenceLevel: slowdown.evidenceLevel, uncertainty: slowdown.evidenceLevel === 'weak' ? 'L’absence d’activité enregistrée peut indiquer un ralentissement, sans confirmer un abandon.' : 'L’absence de décision enregistrée ne permet pas de conclure à un refus.', blockage: slowdown.reason, missingInformation: [], recommendation: nextStepFor(project, now).label, destination: { label: nextStepFor(project, now).label, href: slowdown.href } }
  if (project.completenessScore < 60) return { ...base, id: `incomplete-${project.id}`, stage: 'Qualification', observedFacts: [`La complétude renseignée est de ${project.completenessScore}%.`], evidenceLevel: 'moderate', uncertainty: 'Le niveau de complétude est un signal ; le dossier doit être vérifié avant conclusion.', blockage: 'Le chiffrage peut manquer de base fiable.', missingInformation: ['Informations de qualification'], recommendation: 'Compléter les informations nécessaires avant de poursuivre.', destination: destination(project, 'Compléter le dossier', 'completion') }
  return null
}

export function buildTrackingBrief(projects: TrackingProjectInput[], input: { now?: Date; reservations?: string[]; insufficient?: boolean; firstName?: string | null } = {}): TrackingBrief {
  const now = input.now || new Date()
  const reservations = input.reservations || []
  const visibleProjects = projects.filter((project) => project.id && !isClosed(project))
  const evidenceWeight = { strong: 3, moderate: 2, weak: 1 }
  const opportunities = visibleProjects.map((project) => opportunityFor(project, now)).filter((item): item is TrackingOpportunity => Boolean(item)).sort((a, b) => evidenceWeight[b.evidenceLevel] - evidenceWeight[a.evidenceLevel] || (b.stalledForDays || 0) - (a.stalledForDays || 0)).slice(0, 12)
  const stages = pipeline.map((item) => { const rows = visibleProjects.filter((project) => stageFor(project, now) === item.key); return { ...item, count: rows.length, quoteAmount: rows.reduce((sum, project) => sum + quoteAmount(project), 0) } })
  const slowdowns = visibleProjects.map((project) => slowdownFor(project, now)).filter((item): item is TrackingSlowdown => Boolean(item)).sort((a, b) => b.stalledForDays - a.stalledForDays).slice(0, 4)
  const movements = visibleProjects.map((project) => movementFor(project, now)).filter((item): item is TrackingMovement => Boolean(item)).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 4)
  const activeProjects = visibleProjects.filter((project) => stageFor(project, now) !== 'won')
  const projectsForTable = activeProjects.length ? activeProjects : visibleProjects
  const rows = projectsForTable.map((project) => rowFor(project, now)).sort((a, b) => (b.lastActivity.tone === 'attention' ? 1 : 0) - (a.lastActivity.tone === 'attention' ? 1 : 0) || (b.stage === 'waiting_client' ? 1 : 0) - (a.stage === 'waiting_client' ? 1 : 0) || (b.stage === 'quote_to_prepare' ? 1 : 0) - (a.stage === 'quote_to_prepare' ? 1 : 0) || a.title.localeCompare(b.title)).slice(0, 5)
  const progressingCount = visibleProjects.filter((project) => !slowdowns.some((item) => item.projectId === project.id) && stageFor(project, now) !== 'new').length
  const decisionCount = visibleProjects.filter((project) => stageFor(project, now) === 'waiting_client' || project.completenessScore < 60).length
  return { generatedAt: now.toISOString(), dataQuality: { level: input.insufficient ? 'insufficient' : reservations.length ? 'partial' : 'complete', reservations }, opportunities, workspace: { firstName: input.firstName || null, activeCount: visibleProjects.length, progressingCount, slowingCount: slowdowns.length, decisionCount, pipeline: stages, quoteValueInProgress: stages.filter((item) => !['new', 'qualification', 'won'].includes(item.key)).reduce((sum, item) => sum + item.quoteAmount, 0), progressedThroughQuoteCount: stages.filter((item) => ['quote_sent', 'waiting_client', 'won'].includes(item.key)).reduce((sum, item) => sum + item.count, 0), movements, slowdowns, analyses: analysesFor(visibleProjects, slowdowns, now), projects: rows } }
}
