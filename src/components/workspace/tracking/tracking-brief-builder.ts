import type { TrackingBrief, TrackingOpportunity } from './tracking-contract'

export type TrackingProjectInput = {
  id: string; status: string; clientName: string; clientFirstName: string; projectType: string; trade: string; budget: string; devisAmount: number; completenessScore: number; createdAt: string; updatedAt: string; callbackDate: string; quoteSentAt: string | null; acceptedAt: string | null; lastFollowUpAt: string | null
}

const DAY = 86_400_000
function daysSince(value: string | null, now: Date) { const time = value ? new Date(value).getTime() : NaN; return Number.isFinite(time) ? Math.max(0, Math.floor((now.getTime() - time) / DAY)) : null }
function parseBudget(value: string) { const values = value.match(/\d+[\s\d]*/g)?.map((part) => Number.parseInt(part.replace(/\s/g, ''), 10)).filter(Number.isFinite) || []; return values.length ? Math.max(...values) : null }
function clientLabel(project: TrackingProjectInput) { return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client à préciser' }
function title(project: TrackingProjectInput) { return project.projectType || project.trade || 'Dossier commercial' }
function destination(project: TrackingProjectInput, label: string, focus: string) { return { label, href: `/dashboard-v2/projet/${project.id}?focus=${focus}` } }

function opportunityFor(project: TrackingProjectInput, now: Date): TrackingOpportunity | null {
  if (!project.id || project.status === 'Gagné' || project.status === 'Perdu' || project.acceptedAt) return null
  const amount = project.devisAmount > 0 ? project.devisAmount : parseBudget(project.budget)
  const quoteDays = daysSince(project.quoteSentAt, now)
  const stalledDays = daysSince(project.lastFollowUpAt || project.updatedAt || project.createdAt, now)
  const base = { projectId: project.id, title: title(project), clientLabel: clientLabel(project), amount, stalledForDays: quoteDays ?? stalledDays }
  if (project.quoteSentAt && quoteDays !== null) return { ...base, id: `quote-${project.id}`, stage: 'Devis envoyé', observedFacts: [`Un devis est envoyé depuis ${quoteDays} jour${quoteDays > 1 ? 's' : ''}.`, 'Aucune acceptation n’est enregistrée.'], evidenceLevel: 'strong', uncertainty: 'L’absence de réponse enregistrée ne confirme pas un refus.', blockage: 'La décision client reste inconnue.', missingInformation: [], recommendation: 'Préparer une relance adaptée au dossier.', destination: destination(project, 'Préparer la relance', 'quote_followup') }
  if ((project.status === 'Qualifié' || project.status === 'À rappeler') && !project.callbackDate) return { ...base, id: `callback-${project.id}`, stage: 'Qualification', observedFacts: ['Le dossier est qualifié.', 'Aucun rappel n’est planifié.'], evidenceLevel: 'strong', uncertainty: null, blockage: 'La prochaine étape commerciale n’est pas enregistrée.', missingInformation: [], recommendation: 'Définir la prochaine reprise de contact.', destination: destination(project, 'Définir un rappel', 'callback') }
  if (project.completenessScore < 60) return { ...base, id: `incomplete-${project.id}`, stage: 'Qualification', observedFacts: [`La complétude renseignée est de ${project.completenessScore}%.`], evidenceLevel: 'moderate', uncertainty: 'Le score de complétude est un signal ; le dossier doit être vérifié avant conclusion.', blockage: 'Le chiffrage peut manquer de base fiable.', missingInformation: ['Informations de qualification'], recommendation: 'Compléter les informations nécessaires avant de poursuivre.', destination: destination(project, 'Compléter le dossier', 'completion') }
  if (stalledDays !== null && stalledDays >= 10) return { ...base, id: `inactive-${project.id}`, stage: 'Suivi commercial', observedFacts: [`Aucune activité commerciale n’est enregistrée depuis ${stalledDays} jours.`], evidenceLevel: 'weak', uncertainty: 'L’absence d’activité enregistrée peut indiquer un ralentissement, sans confirmer un abandon.', blockage: 'La prochaine décision commerciale reste à confirmer.', missingInformation: [], recommendation: 'Examiner le dossier et décider de la prochaine étape.', destination: destination(project, 'Examiner le dossier', 'commercial') }
  return null
}

export function buildTrackingBrief(projects: TrackingProjectInput[], input: { now?: Date; reservations?: string[]; insufficient?: boolean } = {}): TrackingBrief {
  const now = input.now || new Date()
  const reservations = input.reservations || []
  const opportunities = projects.map((project) => opportunityFor(project, now)).filter((item): item is TrackingOpportunity => Boolean(item)).sort((a, b) => ({ strong: 3, moderate: 2, weak: 1 }[b.evidenceLevel] - { strong: 3, moderate: 2, weak: 1 }[a.evidenceLevel] || (b.stalledForDays || 0) - (a.stalledForDays || 0))).slice(0, 12)
  return { generatedAt: now.toISOString(), dataQuality: { level: input.insufficient ? 'insufficient' : reservations.length ? 'partial' : 'complete', reservations }, opportunities }
}
