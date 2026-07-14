import { getProjectRiskStatus } from '@/src/lib/commercial-actions';
import { getProjectLifecycle } from '@/src/lib/project-lifecycle';
import { getProjectCommercialAnalysis } from '@/src/lib/project-scoring';
import type { Project } from '@/src/components/ArtisanDashboard';
import type { CommercialMomentum, CommercialTemperature, PipelineStageId, TrackingProject, TrackingStage } from './tracking-types';

export const TRACKING_STAGES: TrackingStage[] = [
  { id: 'new', label: 'Nouveau' },
  { id: 'qualify', label: 'À qualifier' },
  { id: 'qualified', label: 'Qualifié' },
  { id: 'quote_preparation', label: 'Devis à préparer' },
  { id: 'quote_sent', label: 'Devis envoyé' },
  { id: 'decision', label: 'En décision' },
];

function parseBudget(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const values = value.match(/\d+[\s\d]*/g)?.map((item) => Number.parseInt(item.replace(/\s/g, ''), 10)).filter(Number.isFinite) || [];
  return values.length ? Math.max(...values) : null;
}

function daysSince(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function clientLabel(project: Project) {
  return [project.clientFirstName, project.clientName].filter(Boolean).join(' ') || 'Client à préciser';
}

function mapStage(project: Project): PipelineStageId {
  const lifecycle = getProjectLifecycle({
    status: project.status,
    completenessScore: project.completenessScore,
    callbackDate: project.callbackDate,
    quoteSentAt: project.quoteSentAt,
    acceptedAt: project.acceptedAt,
    depositStatus: project.depositStatus,
    appointment: project.appointment?.start ? { start: project.appointment.start } : null,
  });

  switch (lifecycle.stage) {
    case 'callback': return 'qualify';
    case 'qualified': return 'qualified';
    case 'in_progress': return 'quote_preparation';
    case 'quote_sent': return 'quote_sent';
    case 'quote_accepted':
    case 'deposit_requested':
    case 'deposit_paid':
    case 'execution': return 'decision';
    default: return 'new';
  }
}

function getTemperature(project: Project): CommercialTemperature {
  const risk = getProjectRiskStatus(project);
  const analysis = getProjectCommercialAnalysis({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    maturity: project.maturity,
    city: project.city,
    siteAddress: project.siteAddress,
    aiSummary: project.aiSummary,
    completenessScore: project.completenessScore,
    photos: project.photos,
    source: project.source,
  });

  if (analysis.confidence === 'low') return { label: 'À évaluer', tone: 'slate', reason: 'Les informations actuelles ne suffisent pas à évaluer la dynamique.' };
  if (risk.status !== 'none') return { label: 'À surveiller', tone: 'amber', reason: risk.reason };
  if (analysis.temperature === 'hot') return { label: 'Chaude', tone: 'orange', reason: analysis.recommendation };
  if (analysis.temperature === 'warm') return { label: 'À surveiller', tone: 'amber', reason: analysis.recommendation };
  return { label: 'Froide', tone: 'slate', reason: analysis.recommendation };
}

function getMomentum(project: Project): CommercialMomentum {
  const risk = getProjectRiskStatus(project);
  if (risk.status !== 'none') return { label: 'Ralentissement', tone: 'amber', reason: risk.reason };
  const recentDays = daysSince(project.lastInteractionAt || project.updatedAt || project.clientLastUpdateAt);
  if (recentDays === null) return { label: 'À évaluer', tone: 'slate', reason: 'Aucune activité datée n’est disponible.' };
  if (recentDays <= 2) return { label: 'Progression', tone: 'emerald', reason: 'Une activité récente fait avancer le dossier.' };
  return { label: 'Stable', tone: 'slate', reason: `Dernière activité il y a ${recentDays} jour${recentDays > 1 ? 's' : ''}.` };
}

function getLastActivityLabel(project: Project) {
  const days = daysSince(project.lastInteractionAt || project.updatedAt || project.clientLastUpdateAt || project.createdAt);
  if (days === null) return 'Activité à préciser';
  if (days === 0) return 'Activité aujourd’hui';
  return `Activité il y a ${days} jour${days > 1 ? 's' : ''}`;
}

export function formatAmount(amount: number | null) {
  return amount === null ? 'Montant à préciser' : amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function buildTrackingProject(project: Project): TrackingProject {
  const stage = mapStage(project);
  const amount = Number(project.devisAmount) > 0 ? Number(project.devisAmount) : parseBudget(project.budget);
  const risk = getProjectRiskStatus(project);
  const analysis = getProjectCommercialAnalysis({
    status: project.status,
    clientName: project.clientName,
    clientFirstName: project.clientFirstName,
    clientPhone: project.clientPhone,
    clientEmail: project.clientEmail,
    trade: project.trade,
    projectType: project.projectType,
    budget: project.budget,
    desiredTimeline: project.desiredTimeline,
    maturity: project.maturity,
    city: project.city,
    siteAddress: project.siteAddress,
    aiSummary: project.aiSummary,
    completenessScore: project.completenessScore,
    photos: project.photos,
    source: project.source,
  });
  const createdDays = daysSince(project.createdAt);

  return {
    project,
    stage,
    stageLabel: TRACKING_STAGES.find((item) => item.id === stage)?.label || 'Nouveau',
    clientLabel: clientLabel(project),
    projectLabel: project.projectType || project.trade || 'Projet à préciser',
    amount,
    amountLabel: amount === null ? null : Number(project.devisAmount) > 0 ? 'Montant du devis' : 'Budget déclaré',
    lastActivityLabel: getLastActivityLabel(project),
    ageLabel: createdDays === null ? null : `${createdDays} jour${createdDays > 1 ? 's' : ''} dans le suivi`,
    temperature: getTemperature(project),
    momentum: getMomentum(project),
    nextDecision: analysis.nextBestAction.label,
    reason: risk.status !== 'none' ? risk.reason : analysis.nextBestAction.reason,
    isRisk: risk.status !== 'none',
  };
}
