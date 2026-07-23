'use client';

import { AlertTriangle, CalendarClock, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';

type Props = {
  event: NormalizedCalendarEvent;
  previousStart: Date;
  previousEnd: Date;
  nextStart: Date;
  nextEnd: Date;
  previousAssigneeName: string | null;
  nextAssigneeName: string | null;
  conflictTitle: string | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (start: Date, end: Date) => void;
};

function inputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function AppointmentMoveConfirmationModal({ event, previousStart, previousEnd, nextStart, nextEnd, previousAssigneeName, nextAssigneeName, conflictTitle, saving, error, onCancel, onConfirm }: Props) {
  const [startValue, setStartValue] = useState(() => inputValue(nextStart));
  const [endValue, setEndValue] = useState(() => inputValue(nextEnd));
  const duration = previousEnd.getTime() - previousStart.getTime();
  const start = new Date(startValue);
  const end = new Date(endValue);
  const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;

  const onStartChange = (value: string) => {
    setStartValue(value);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) setEndValue(inputValue(new Date(parsed.getTime() + duration)));
  };

  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={() => !saving && onCancel()}><div role="dialog" aria-modal="true" aria-labelledby="appointment-move-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarClock className="size-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Modification du planning</p><h2 id="appointment-move-title" className="mt-1 text-lg font-bold text-slate-950">Confirmer le déplacement du rendez-vous</h2><p className="mt-1 text-sm text-slate-600">{event.title}</p></div></div><dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs font-medium text-slate-500">Client ou projet</dt><dd className="mt-1 font-semibold text-slate-900">{event.clientName || event.projectTitle || 'Non renseigné'}</dd></div><div><dt className="flex items-center gap-1 text-xs font-medium text-slate-500"><UserRound className="size-3.5" />En charge</dt><dd className="mt-1 font-semibold text-slate-900">{previousAssigneeName || 'Non affecté'}</dd></div><div><dt className="text-xs font-medium text-slate-500">Ancien horaire</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(previousStart)} – {previousEnd.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</dd></div><div><dt className="text-xs font-medium text-slate-500">Durée conservée</dt><dd className="mt-1 font-semibold text-slate-900">{Math.round(duration / 60_000)} min</dd></div></dl>{nextAssigneeName !== previousAssigneeName ? <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">Nouvelle affectation : <strong>{nextAssigneeName || 'Non affecté'}</strong></p> : null}{conflictTitle ? <p className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Conflit potentiel avec « {conflictTitle} ».</p> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Nouveau début<input type="datetime-local" value={startValue} onChange={(event) => onStartChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><label className="block text-sm font-semibold text-slate-700">Nouvelle fin<input type="datetime-local" value={endValue} onChange={(event) => setEndValue(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label></div><p className="mt-3 text-xs text-slate-500">Le changement de date, d’heure et de durée est vérifié avant enregistrement.</p>{error ? <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500">Annuler</button><button type="button" disabled={saving || !valid} onClick={() => valid && onConfirm(start, end)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2">{saving ? 'Enregistrement…' : 'Confirmer le nouvel horaire'}</button></div></div></div>;
}
