import { updateProject as apiUpdateProject } from '@/src/lib/api';
import type {
  ActionProvider,
  ActionResult,
  BookAppointmentInput,
  CreateQuoteInput,
  UpdateQuoteInput,
  UploadFileInput,
} from './types';

/**
 * Production action provider — wraps the existing real mutations.
 * NOTE: in this lot the existing screens keep calling the real
 * fetch/Supabase/Stripe code paths directly; this implementation exists so
 * future lots can swap screens over to `actions.xxx(...)` without behavior
 * change. Calling this provider today is safe and produces the exact same
 * network calls as the current production code.
 */
export function createProductionActionProvider(): ActionProvider {
  return {
    async updateProject(id, data) {
      const result = await apiUpdateProject(id, data);
      return { ok: true, data: result };
    },
    async updateProjectStatus(id, status) {
      const result = await apiUpdateProject(id, { status, contacted: true });
      return { ok: true, data: result };
    },
    async saveProjectNote(id, note) {
      const result = await apiUpdateProject(id, { internalNotes: note });
      return { ok: true, data: result };
    },
    async saveCallback(id, date) {
      const result = await apiUpdateProject(id, { callbackDate: date });
      return { ok: true, data: result };
    },
    async createQuote(input: CreateQuoteInput) {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return { ok: false, error: 'Erreur création devis' };
      return { ok: true, data: await res.json() };
    },
    async updateQuote(input: UpdateQuoteInput) {
      const { quoteId, ...data } = input;
      const res = await fetch(`/api/devis/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: 'Erreur mise à jour devis' };
      return { ok: true, data: await res.json() };
    },
    async sendQuote(quoteId) {
      const res = await fetch(`/api/devis/${quoteId}/send`, { method: 'POST' });
      if (!res.ok) return { ok: false, error: 'Erreur envoi devis' };
      return { ok: true, data: await res.json() };
    },
    async followUpQuote(quoteId) {
      const res = await fetch(`/api/devis/${quoteId}/follow-up`, { method: 'POST' });
      if (!res.ok) return { ok: false, error: 'Erreur relance devis' };
      return { ok: true, data: await res.json() };
    },
    async exportProjectPdf(projectId) {
      const res = await fetch(`/api/projects/${projectId}/pdf`, { method: 'POST' });
      if (!res.ok) return { ok: false, error: 'Erreur export PDF' };
      return { ok: true, data: await res.json() };
    },
    async bookAppointment(input: BookAppointmentInput) {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return { ok: false, error: 'Erreur prise de rendez-vous' };
      return { ok: true, data: await res.json() };
    },
    async saveSettings(_section, data) {
      const res = await fetch('/api/artisan/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return { ok: false, error: 'Erreur sauvegarde paramètres' };
      return { ok: true, data: await res.json() };
    },
    async openBillingPortal() {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (!res.ok) return { ok: false, error: 'Erreur ouverture portail facturation' };
      return { ok: true, data: await res.json() };
    },
    async uploadFile(input: UploadFileInput) {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('kind', input.kind);
      if (input.projectId) formData.append('projectId', input.projectId);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) return { ok: false, error: 'Erreur upload' };
      return { ok: true, data: await res.json() };
    },
    showSimulatedActionToast() {
      // No-op in production — actions are real, nothing to simulate.
    },
  };
}

/**
 * Minimal surface of DemoModeContext consumed by the demo action provider.
 * Kept intentionally small/decoupled from the full context type so this
 * module never imports a React context (providers must stay framework-agnostic
 * and callable outside components).
 */
export interface DemoActionSink {
  updateProjectFields: (id: string, fields: Record<string, unknown>) => void;
  updateProjectStatus: (id: string, status: string) => void;
  updateProjectNote: (id: string, note: string) => void;
  updateProjectCallback: (id: string, date: string | null) => void;
  createEvent: (event: { title: string; date: string; type: string; projectId: string; status: string; notes: string }) => void;
  showToast?: (message: string) => void;
}

const DEFAULT_SIMULATED_MESSAGE = 'Action simulée — aucune donnée réelle modifiée.';

/**
 * Demo action provider — every method mutates local state only via the
 * provided sink (backed by DemoModeContext) and never performs a network
 * call to a real backend, Supabase, Stripe, Resend, Cloudinary or Vapi.
 */
export function createDemoActionProvider(sink: DemoActionSink): ActionProvider {
  const toast = (message = DEFAULT_SIMULATED_MESSAGE) => {
    sink.showToast?.(message);
  };

  return {
    async updateProject(id, data) {
      sink.updateProjectFields(id, data);
      return { ok: true, simulated: true };
    },
    async updateProjectStatus(id, status) {
      sink.updateProjectStatus(id, status);
      return { ok: true, simulated: true };
    },
    async saveProjectNote(id, note) {
      sink.updateProjectNote(id, note);
      return { ok: true, simulated: true };
    },
    async saveCallback(id, date) {
      sink.updateProjectCallback(id, date);
      return { ok: true, simulated: true };
    },
    async createQuote(input: CreateQuoteInput) {
      toast('Devis simulé créé — aucun devis réel n’a été généré.');
      return { ok: true, simulated: true, data: input };
    },
    async updateQuote(input: UpdateQuoteInput) {
      toast();
      return { ok: true, simulated: true, data: input };
    },
    async sendQuote() {
      toast('Envoi simulé — aucun devis réel n’a été envoyé.');
      return { ok: true, simulated: true };
    },
    async followUpQuote() {
      toast('Relance simulée — aucun email réel n’a été envoyé.');
      return { ok: true, simulated: true };
    },
    async exportProjectPdf() {
      toast('Export simulé — aucun PDF réel n’a été généré.');
      return { ok: true, simulated: true, data: { html: '' } };
    },
    async bookAppointment(input: BookAppointmentInput) {
      sink.createEvent({
        title: 'Rendez-vous (démo)',
        date: input.date,
        type: 'RDV',
        projectId: input.projectId,
        status: 'Prevu',
        notes: input.notes ?? '',
      });
      toast('Rendez-vous simulé — aucune synchronisation Google Calendar réelle.');
      return { ok: true, simulated: true };
    },
    async saveSettings() {
      toast('Paramètres simulés — aucune donnée réelle enregistrée.');
      return { ok: true, simulated: true };
    },
    async openBillingPortal() {
      toast('Action simulée — aucun portail Stripe réel n’a été ouvert.');
      return { ok: true, simulated: true };
    },
    async uploadFile() {
      toast('Upload simulé — aucun fichier réel n’a été transféré.');
      return { ok: true, simulated: true };
    },
    showSimulatedActionToast(message) {
      toast(message);
    },
  };
}
