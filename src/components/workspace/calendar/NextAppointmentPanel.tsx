import { BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Phone } from 'lucide-react';
import { getAppointmentStatusPresentation } from '@/src/lib/calendar/appointment-status-presentation';
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event';
import { durationMinutes, eventLabel, formatDuration, formatTime } from './calendar-workspace-utils';

type Props = { event: NormalizedCalendarEvent | null; onOpenProject: (event: NormalizedCalendarEvent) => void };

export default function NextAppointmentPanel({ event, onOpenProject }: Props) {
  if (!event) return null;
  const statusPresentation = getAppointmentStatusPresentation(event.confirmation);
  const place = event.address || event.location;
  const duration = durationMinutes(event);
  const preparation = [
    { ready: Boolean(place), label: place ? 'Adresse complète' : 'Adresse à compléter' },
    { ready: Boolean(event.clientPhone), label: event.clientPhone ? 'Téléphone disponible' : 'Téléphone non renseigné' },
    { ready: event.confirmation?.status === 'confirmed', label: event.confirmation?.status === 'confirmed' ? 'Client confirmé' : 'Confirmation à sécuriser' },
  ];

  return <section id="workspace-section-next-appointment" className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness className="size-4 text-blue-600" />Préparer la prochaine intervention</p><div className="mt-3"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><BriefcaseBusiness className="size-4" /></span><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{formatTime(event.start) || 'Horaire à préciser'} · {eventLabel(event)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{event.projectTitle || event.title}</p><span className={['mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', statusPresentation.badgeClassName].join(' ')}>{statusPresentation.label}</span></div></div><div className="mt-3 space-y-1.5 text-xs text-slate-600">{place ? <p className="flex items-center gap-2"><MapPin className="size-3.5 shrink-0 text-slate-400" /><span className="truncate">{place}</span></p> : null}{event.clientPhone ? <p className="flex items-center gap-2"><Phone className="size-3.5 shrink-0 text-slate-400" />{event.clientPhone}</p> : null}{duration ? <p className="flex items-center gap-2"><Clock3 className="size-3.5 shrink-0 text-slate-400" />Durée prévue : {formatDuration(duration)}</p> : null}</div><div className="mt-3 border-t border-slate-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Checklist</p><div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">{preparation.map((item) => <p key={item.label} className="flex items-center gap-1.5"><CheckCircle2 className={['size-3.5', item.ready ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />{item.label}</p>)}</div></div>{event.actionUrl ? <button type="button" onClick={() => onOpenProject(event)} className="mt-4 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">Ouvrir le dossier</button> : null}</div></section>;
}
