import { confirmationStatusLabel } from '@/src/lib/appointment-confirmation';

type Confirmation = {
  status: string | null | undefined;
  source: string | null | undefined;
};

export type AppointmentStatusPresentation = {
  label: string;
  description: string;
  cardClassName: string;
  badgeClassName: string;
  attentionLevel: 'neutral' | 'success' | 'warning' | 'action' | 'danger';
};

export function getAppointmentStatusPresentation(confirmation: Confirmation | null | undefined): AppointmentStatusPresentation {
  if (confirmation?.status === 'confirmed') {
    return { label: 'Confirmé', description: 'Rendez-vous validé.', cardClassName: 'border-emerald-300 bg-emerald-50 text-emerald-950', badgeClassName: 'bg-emerald-100 text-emerald-800', attentionLevel: 'success' };
  }
  if (confirmation?.status === 'pending') {
    return { label: 'À confirmer', description: 'Confirmation attendue.', cardClassName: 'border-amber-300 bg-amber-50 text-amber-950', badgeClassName: 'bg-amber-100 text-amber-800', attentionLevel: 'warning' };
  }
  if (confirmation?.status === 'change_requested') {
    return { label: 'Changement demandé', description: 'Une action de votre part est nécessaire.', cardClassName: 'border-orange-300 bg-orange-50 text-orange-950', badgeClassName: 'bg-orange-100 text-orange-800', attentionLevel: 'action' };
  }
  if (confirmation?.status === 'cancelled') {
    const label = confirmationStatusLabel(confirmation.status, confirmation.source);
    return { label, description: 'Ce rendez-vous est annulé.', cardClassName: 'border-rose-300 bg-rose-50 text-rose-950', badgeClassName: 'bg-rose-100 text-rose-800', attentionLevel: 'danger' };
  }
  return { label: 'À vérifier', description: 'Statut de confirmation non défini.', cardClassName: 'border-slate-300 bg-slate-50 text-slate-900', badgeClassName: 'bg-slate-200 text-slate-700', attentionLevel: 'neutral' };
}
