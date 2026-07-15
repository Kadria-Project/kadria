'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import {
  APPOINTMENT_QUALIFICATION_OUTCOMES,
  APPOINTMENT_QUALIFICATION_STATUSES,
  QUALIFICATION_OUTCOME_LABELS,
  QUALIFICATION_STATUS_LABELS,
  qualificationNextAction,
  type AppointmentQualificationOutcome,
  type AppointmentQualificationStatus,
} from '@/src/lib/appointment-qualification';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

type Props = {
  event: NormalizedCalendarEvent;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: { status: AppointmentQualificationStatus; outcome: AppointmentQualificationOutcome | null; note: string; nextAction: string; expectedVersion: number }) => void;
};

const fieldClassName = 'mt-2 w-full rounded-lg border border-[#3A4A59] bg-[#111F2E] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/25';

export default function AppointmentQualificationModal({ event, saving, error, onClose, onSave }: Props) {
  const current = event.qualification;
  const [status, setStatus] = useState<AppointmentQualificationStatus>(current?.status as AppointmentQualificationStatus || 'completed');
  const [outcome, setOutcome] = useState<AppointmentQualificationOutcome | ''>(current?.outcome as AppointmentQualificationOutcome || '');
  const [note, setNote] = useState(current?.note || '');
  const defaultNextAction = useMemo(() => qualificationNextAction(status, outcome || null) || '', [outcome, status]);
  const [nextAction, setNextAction] = useState(current?.nextAction || defaultNextAction);

  const updateStatus = (value: AppointmentQualificationStatus) => {
    setStatus(value);
    if (!current?.nextAction) setNextAction(qualificationNextAction(value, outcome || null) || '');
  };
  const updateOutcome = (value: AppointmentQualificationOutcome | '') => {
    setOutcome(value);
    if (!current?.nextAction) setNextAction(qualificationNextAction(status, value || null) || '');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(6,16,26,0.58)] p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="appointment-qualification-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[calc(100vh-32px)] w-full max-w-[520px] overflow-y-auto rounded-[18px] border border-[#2A3948] bg-[#0E1926] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="appointment-qualification-title" className="text-xl font-bold tracking-tight text-white">Qualifier le rendez-vous</h2><p className="mt-1 text-sm leading-5 text-[#B7C4D1]">{event.title} {event.clientName ? `· ${event.clientName}` : ''}</p></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="grid size-9 place-items-center rounded-lg text-[#B7C4D1] hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="size-5" /></button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#E7EDF4]">Statut<select value={status} onChange={(event) => updateStatus(event.target.value as AppointmentQualificationStatus)} className={fieldClassName}>{APPOINTMENT_QUALIFICATION_STATUSES.map((value) => <option key={value} value={value}>{QUALIFICATION_STATUS_LABELS[value]}</option>)}</select></label>
          {status === 'completed' ? <label className="block text-sm font-medium text-[#E7EDF4]">Résultat<select value={outcome} onChange={(event) => updateOutcome(event.target.value as AppointmentQualificationOutcome | '')} className={fieldClassName}><option value="">Choisir un résultat</option>{APPOINTMENT_QUALIFICATION_OUTCOMES.map((value) => <option key={value} value={value}>{QUALIFICATION_OUTCOME_LABELS[value]}</option>)}</select></label> : null}
          <label className="block text-sm font-medium text-[#E7EDF4]">Compte rendu rapide <span className="font-normal text-[#8291A2]">- facultatif</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ce qui a été vu ou décidé..." className={fieldClassName} /></label>
          <label className="block text-sm font-medium text-[#E7EDF4]">Prochaine décision <span className="font-normal text-[#8291A2]">- proposée par Kadria</span><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="Aucune action nécessaire" className={fieldClassName} /></label>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100"><p className="font-semibold">Ce que Kadria va mettre à jour</p><p className="mt-1 text-emerald-100/80">Le rendez-vous sera qualifié{event.projectId ? ' et le dossier recevra une seule entrée dans son historique.' : '. Aucun dossier ne sera créé.'}</p>{outcome === 'project_not_retained' ? <p className="mt-2 text-amber-200">Le passage du dossier en Perdu restera une décision distincte.</p> : null}</div>
          {error ? <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#3A4A59] px-4 py-2.5 text-sm font-semibold text-[#E7EDF4] hover:bg-white/5 disabled:opacity-60">Annuler</button><button type="button" onClick={() => onSave({ status, outcome: status === 'completed' ? outcome || null : null, note, nextAction, expectedVersion: current?.version || 0 })} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"><CheckCircle2 className="size-4" />{saving ? 'Enregistrement en cours...' : 'Enregistrer'}</button></div>
      </div>
    </div>
  );
}
