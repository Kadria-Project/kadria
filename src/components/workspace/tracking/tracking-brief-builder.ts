import type { TrackingAnalysis, TrackingBrief, TrackingMovement, TrackingOpportunity, TrackingPipelineStage, TrackingProjectRow, TrackingSlowdown } from './tracking-contract'

export type TrackingProjectInput = {
  id: string; status: string; clientName: string; clientFirstName: string; projectType: string; trade: string; budget: string; devisAmount: number; completenessScore: number; createdAt: string; updatedAt: string; callbackDate: string; quoteSentAt: string | null; acceptedAt: string | null; lastFollowUpAt: string | null
}

export type TrackingExplorerItem = {
  id: string
  title: string
  clientLabel: string
  stage: { key: 'new' | 'qualification' | 'quote_to_prepare' | 'quote_sent' | 'waiting_client' | 'won' | 'lost' | 'archived' | 'legacy'; label: string }
  value: { amountLabel: string; typeLabel: 'Devis' | 'Budget estimé' | 'Valeur non renseignée' }
  signal: { key: 'inactive' | 'quote_waiting' | 'ready_to_quote' | 'missing_information' | 'next_step_missing' | 'none'; label: string; tone: 'neutral' | 'attention' | 'positive' }
  lastActivity: { label: string; ageLabel: string; tone: 'neutral' | 'attention' | 'positive' }
  nextStep: { label: string; href: string }
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

function explorerStageFor(project: TrackingProjectInput, now: Date): TrackingExplorerItem['stage'] {
  const status = normalizedStatus(project)
  if (['Archivé', 'Archive'].includes(status)) return { key: 'archived', label: 'Archivé' }
  if (['Perdu', 'Clôturé', 'Terminé'].includes(status)) return { key: 'lost', label: 'Perdu' }
  const stage = stageFor(project, now)
  if (stage === 'waiting_client') return { key: stage, label: 'En attente client' }
  if (stage === 'won') return { key: stage, label: 'Gagné' }
  if (stage === 'quote_sent') return { key: stage, label: 'Devis envoyé' }
  if (stage === 'quote_to_prepare') return { key: stage, label: 'À chiffrer' }
  if (stage === 'qualification') return { key: stage, label: 'Qualification' }
  return status === 'Nouveau' ? { key: 'new', label: 'Nouveau' } : { key: 'legacy', label: 'Statut à vérifier' }
}

function commercialActivityFor(project: TrackingProjectInput, now: Date): TrackingExplorerItem['lastActivity'] {
  const facts: Array<{ at: string | null; label: string; tone: TrackingExplorerItem['lastActivity']['tone'] }> = [
    { at: project.acceptedAt, label: 'Devis accepté', tone: 'positive' },
    { at: project.lastFollowUpAt, label: 'Relance enregistrée', tone: 'neutral' },
    { at: project.quoteSentAt, label: 'Devis envoyé', tone: 'neutral' },
    { at: project.createdAt || null, label: 'Dossier créé', tone: 'neutral' },
  ]
  const fact = facts.filter((item) => item.at && Number.isFinite(new Date(item.at).getTime())).sort((a, b) => new Date(b.at!).getTime() - new Date(a.at!).getTime())[0]
  return fact?.at ? { label: fact.label, ageLabel: relativeLabel(fact.at, now), tone: fact.tone } : { label: '—', ageLabel: 'Aucune activité enregistrée', tone: 'neutral' }
}

function explorerValueFor(project: TrackingProjectInput): TrackingExplorerItem['value'] {
  if (project.devisAmount > 0) return { amountLabel: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(project.devisAmount) + ' €', typeLabel: 'Devis' }
  if (project.budget.trim()) return { amountLabel: project.budget.trim(), typeLabel: 'Budget estimé' }
  return { amountLabel: '—', typeLabel: 'Valeur non renseignée' }
}

export function buildTrackingExplorerItem(project: TrackingProjectInput, input: { now?: Date } = {}): TrackingExplorerItem {
  const now = input.now || new Date()
  const stage = explorerStageFor(project, now)
  const activity = commercialActivityFor(project, now)
  const quoteDays = daysSince(project.quoteSentAt, now)
  const missingInformation = project.completenessScore > 0 && project.completenessScore < 60
  const inactive = ['new', 'qualification'].includes(stage.key) && activity.ageLabel !== 'Aucune activité enregistrée' && daysSince(project.lastFollowUpAt || project.createdAt, now) !== null && daysSince(project.lastFollowUpAt || project.createdAt, now)! >= 10
  const signal = stage.key === 'lost' ? { key: 'none' as const, label: 'Projet perdu', tone: 'attention' as const }
    : stage.key === 'archived' ? { key: 'none' as const, label: 'Projet archivé', tone: 'neutral' as const }
    : stage.key === 'won' ? { key: 'none' as const, label: 'Projet gagné, prochaine étape à examiner', tone: 'positive' as const }
    : missingInformation ? { key: 'missing_information' as const, label: 'Informations à compléter', tone: 'attention' as const }
    : stage.key === 'waiting_client' && quoteDays !== null ? { key: 'quote_waiting' as const, label: `Sans réponse depuis ${quoteDays} jours`, tone: 'attention' as const }
    : stage.key === 'quote_sent' ? { key: 'quote_waiting' as const, label: 'Devis envoyé, réponse attendue', tone: 'neutral' as const }
    : stage.key === 'quote_to_prepare' ? { key: 'ready_to_quote' as const, label: 'Prêt à chiffrer', tone: 'neutral' as const }
    : inactive ? { key: 'inactive' as const, label: `Sans activité depuis ${daysSince(project.lastFollowUpAt || project.createdAt, now)} jours`, tone: 'attention' as const }
    : stage.key === 'legacy' ? { key: 'next_step_missing' as const, label: 'Prochaine étape à examiner', tone: 'neutral' as const }
    : { key: 'none' as const, label: 'Aucun signal particulier', tone: 'neutral' as const }
  const nextStep = stage.key === 'lost' || stage.key === 'archived' || stage.key === 'won' ? destination(project, 'Examiner la prochaine étape', 'planning')
    : missingInformation ? destination(project, 'Compléter le dossier', 'completion')
    : stage.key === 'waiting_client' ? destination(project, 'Relancer le client', 'quote_followup')
    : stage.key === 'quote_sent' ? destination(project, 'Suivre la réception du devis', 'quote_followup')
    : stage.key === 'quote_to_prepare' ? destination(project, 'Préparer le devis', 'quote')
    : stage.key === 'qualification' ? destination(project, project.callbackDate ? 'Préparer le rappel' : 'Définir la prochaine étape', project.callbackDate ? 'callback' : 'commercial')
    : destination(project, 'Examiner la prochaine étape', 'commercial')
  return { id: project.id, title: title(project), clientLabel: clientLabel(project), stage, value: explorerValueFor(project), signal, lastActivity: activity, nextStep }
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
