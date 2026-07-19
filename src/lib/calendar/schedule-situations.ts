import type { NormalizedCalendarEvent } from './normalized-event';
import type { PlanningInsights } from '@/src/components/workspace/calendar/calendar-workspace-types';

export type ScheduleSituationKind = 'confirm' | 'replan' | 'assign' | 'prepare' | 'resolve_conflict' | 'travel_margin' | 'observe';

export type ScheduleSituation = {
  id: string;
  kind: ScheduleSituationKind;
  appointmentId?: string;
  projectId?: string;
  clientName?: string;
  projectTitle?: string;
  assigneeName?: string;
  observedFacts: string[];
  understanding: string;
  importance: string;
  consequence?: string;
  recommendation?: string;
  confidence: 'high' | 'medium' | 'low';
  missingInformation?: string[];
  startAt?: string;
  endAt?: string;
  address?: string;
  primaryAction?: { label: string; actionKey: ScheduleSituationKind; target?: string };
  secondaryAction?: { label: string; actionKey: 'observe'; target?: string };
  sourceUpdatedAt?: string;
};

export type DayReadiness = {
  state: 'loading' | 'insufficient' | 'attention' | 'ready' | 'empty';
  title: string;
  detail: string;
  limitations: string[];
};

const active = (event: NormalizedCalendarEvent) => event.status !== 'cancelled' && event.confirmation?.status !== 'cancelled';
const timed = (event: NormalizedCalendarEvent) => Boolean(event.start && !Number.isNaN(new Date(event.start).getTime()));

function action(kind: ScheduleSituationKind, appointmentId: string | null, label: string) {
  return { label, actionKey: kind, target: appointmentId ? `/dashboard-v2/agenda?appointmentId=${appointmentId}` : '/dashboard-v2/agenda' };
}

function priorityFor(kind: ScheduleSituationKind) {
  return ({ resolve_conflict: 100, replan: 95, assign: 85, confirm: 80, travel_margin: 70, prepare: 60, observe: 10 } as const)[kind];
}

export function deduplicateScheduleSituations(situations: ScheduleSituation[]) {
  const best = new Map<string, ScheduleSituation>();
  for (const situation of situations) {
    const key = situation.appointmentId || situation.id;
    const current = best.get(key);
    if (!current || priorityFor(situation.kind) > priorityFor(current.kind)) best.set(key, situation);
  }
  return [...best.values()];
}

export function prioritizeScheduleSituations(situations: ScheduleSituation[]) {
  return [...situations].sort((left, right) => priorityFor(right.kind) - priorityFor(left.kind) || (left.startAt || '').localeCompare(right.startAt || '')).slice(0, 3);
}

export function deriveScheduleSituations(events: NormalizedCalendarEvent[], insights: PlanningInsights | null, now = new Date()) {
  const today = events.filter((event) => active(event) && timed(event) && new Date(event.start!).toDateString() === now.toDateString());
  const byId = new Map(today.map((event) => [event.rawAppointmentId, event]));
  const situations: ScheduleSituation[] = [];

  for (const conflict of insights?.conflicts || []) {
    const event = byId.get(conflict.appointmentId);
    if (!event) continue;
    situations.push({ id: `conflict-${conflict.appointmentId}`, kind: 'resolve_conflict', appointmentId: conflict.appointmentId, projectId: event.projectId || undefined, clientName: event.clientName || undefined, projectTitle: event.projectTitle || undefined, startAt: event.start || undefined, observedFacts: [`${conflict.title} chevauche ${conflict.conflictingTitle} pour ${conflict.collaboratorName}.`], understanding: 'Les deux engagements ne peuvent pas être tenus tels qu’ils sont planifiés.', importance: 'Un client risque d’être retardé ou de ne pas être pris en charge.', consequence: 'Le planning du collaborateur reste contradictoire.', recommendation: 'Je vous recommande de réorganiser l’un des deux rendez-vous.', confidence: 'high', primaryAction: action('resolve_conflict', conflict.appointmentId, 'Résoudre le conflit') });
  }

  for (const event of today) {
    const appointmentId = event.rawAppointmentId;
    if (!appointmentId) continue;
    const base = { appointmentId, projectId: event.projectId || undefined, clientName: event.clientName || undefined, projectTitle: event.projectTitle || undefined, assigneeName: event.assignedUserName || undefined, startAt: event.start || undefined, endAt: event.end || undefined, address: event.address || event.location || undefined };
    if (event.confirmation?.status === 'change_requested') situations.push({ id: `replan-${appointmentId}`, kind: 'replan', ...base, observedFacts: ['Le client a demandé un autre créneau.'], understanding: 'Le rendez-vous actuel ne répond plus à sa disponibilité.', importance: 'Cet engagement ne peut pas être tenu tel quel.', consequence: 'Le client attend une nouvelle proposition.', recommendation: 'Je vous recommande de replanifier le rendez-vous.', confidence: 'high', primaryAction: action('replan', appointmentId, 'Replanifier le rendez-vous') });
    else if (event.confirmation?.status !== 'confirmed') situations.push({ id: `confirm-${appointmentId}`, kind: 'confirm', ...base, observedFacts: [`Le rendez-vous ${event.start ? `de ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.start))} ` : ''}n’est pas confirmé.`], understanding: 'Le déplacement reste incertain tant que le client n’a pas validé le créneau.', importance: 'Vous risquez de mobiliser du temps pour un engagement non confirmé.', consequence: 'La journée peut devoir être réorganisée au dernier moment.', recommendation: 'Je vous recommande de confirmer avec le client.', confidence: event.confirmation?.status ? 'high' : 'medium', missingInformation: event.confirmation?.status ? undefined : ['Statut de confirmation'], primaryAction: action('confirm', appointmentId, 'Confirmer avec le client') });
    if (event.isUnassigned || !event.assignedUserId) situations.push({ id: `assign-${appointmentId}`, kind: 'assign', ...base, observedFacts: ['Aucun collaborateur n’est associé à cette intervention.'], understanding: 'L’engagement ne peut pas être préparé ni attribué correctement.', importance: 'La responsabilité de l’intervention reste indéterminée.', consequence: 'Le rendez-vous risque de ne pas être pris en charge.', recommendation: 'Je vous recommande d’affecter un collaborateur.', confidence: 'high', primaryAction: action('assign', appointmentId, 'Affecter un collaborateur') });
    if (!event.address && !event.location) situations.push({ id: `prepare-${appointmentId}`, kind: 'prepare', ...base, observedFacts: ['L’adresse de l’intervention n’est pas renseignée.'], understanding: 'La préparation et la cohérence du déplacement ne peuvent pas être vérifiées.', importance: 'Le départ vers le rendez-vous reste incertain.', consequence: 'Un retard ou une recherche d’adresse est possible.', recommendation: 'Je vous recommande de préparer l’intervention.', confidence: 'high', missingInformation: ['Adresse de l’intervention'], primaryAction: action('prepare', appointmentId, 'Préparer l’intervention') });
  }

  for (const warning of insights?.travelWarnings || []) {
    const event = byId.get(warning.toAppointmentId);
    if (!event) continue;
    situations.push({ id: `travel-${warning.toAppointmentId}`, kind: 'travel_margin', appointmentId: warning.toAppointmentId, projectId: event.projectId || undefined, clientName: event.clientName || undefined, projectTitle: event.projectTitle || undefined, startAt: event.start || undefined, observedFacts: [`${warning.gapMinutes} min séparent ${warning.fromTitle} de ${warning.toTitle}, pour ${warning.distanceKm} km selon les coordonnées enregistrées.`], understanding: 'La marge semble courte entre ces deux engagements.', importance: 'Le second rendez-vous pourrait commencer en retard.', consequence: 'Le trafic réel n’est pas pris en compte dans cette estimation.', recommendation: 'Je vous recommande de réorganiser la journée ou de prévenir le client.', confidence: 'medium', primaryAction: action('travel_margin', warning.toAppointmentId, 'Réorganiser la journée') });
  }
  return prioritizeScheduleSituations(deduplicateScheduleSituations(situations));
}

export function deriveDayReadiness({ loading, error, events, situations, insightsVerified = true }: { loading: boolean; error: string | null; events: NormalizedCalendarEvent[]; situations: ScheduleSituation[]; insightsVerified?: boolean }): DayReadiness {
  if (loading) return { state: 'loading', title: 'Je termine de vérifier votre journée.', detail: 'Je vérifie vos rendez-vous, les affectations et les enchaînements.', limitations: [] };
  if (error) return { state: 'insufficient', title: 'Je ne peux pas encore confirmer que votre journée est prête.', detail: 'Une partie du planning n’a pas pu être vérifiée.', limitations: [error] };
  if (!insightsVerified) return { state: 'insufficient', title: 'Je ne peux pas encore confirmer que votre journée est prête.', detail: 'Les contrôles de cohérence du planning ne sont pas encore disponibles.', limitations: ['Conflits et enchaînements non vérifiés'] };
  const today = events.filter((event) => active(event) && timed(event) && new Date(event.start!).toDateString() === new Date().toDateString());
  if (!today.length) return { state: 'empty', title: 'Aucun engagement n’est prévu aujourd’hui.', detail: 'Je continue de surveiller les changements de planning.', limitations: [] };
  if (situations.length) return { state: 'attention', title: `${situations.length} engagement${situations.length > 1 ? 's' : ''} à sécuriser.`, detail: `${today.length} intervention${today.length > 1 ? 's' : ''} est/sont prévue(s) aujourd’hui ; je vous indique ce qui mérite une action.`, limitations: [] };
  return { state: 'ready', title: 'Votre journée est prête.', detail: 'Les rendez-vous vérifiés sont confirmés, affectés et ne présentent aucun conflit connu.', limitations: [] };
}

export function deriveNextIntervention(events: NormalizedCalendarEvent[], now = new Date()) {
  return events.filter((event) => active(event) && timed(event) && new Date(event.start!).getTime() >= now.getTime()).sort((left, right) => new Date(left.start!).getTime() - new Date(right.start!).getTime())[0] || null;
}
