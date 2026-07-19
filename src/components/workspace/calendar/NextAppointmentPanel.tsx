import { BriefcaseBusiness, CheckCircle2, Clock3, ImageIcon, MapPin, WalletCards } from 'lucide-react'
import { buildAppointmentBrief } from '@/src/lib/calendar/appointment-brief'
import { getAppointmentStatusPresentation } from '@/src/lib/calendar/appointment-status-presentation'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'
import { durationMinutes, eventLabel, formatDuration, formatTime } from './calendar-workspace-utils'

type Props = { event: NormalizedCalendarEvent | null; onOpenProject: (event: NormalizedCalendarEvent) => void }

export default function NextAppointmentPanel({ event, onOpenProject }: Props) {
  if (!event) return <section id="workspace-section-next-appointment" className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness className="size-4 text-blue-600" />Prochaine intervention</p><p className="mt-3 text-sm leading-6 text-slate-500">Aucune intervention à venir.</p></section>

  const statusPresentation = getAppointmentStatusPresentation(event.confirmation)
  const brief = buildAppointmentBrief(event)
  const place = event.address || event.location
  const duration = durationMinutes(event)
  const preparation = [
    { ready: event.confirmation?.status === 'confirmed', label: event.confirmation?.status === 'confirmed' ? 'Client confirmé' : 'Confirmation à sécuriser' },
    { ready: Boolean(place), label: place ? 'Adresse renseignée' : 'Adresse à compléter' },
    { ready: Boolean(event.assignedUserId), label: event.assignedUserName ? `Responsable : ${event.assignedUserName}` : 'Responsable à définir' },
  ]

  return <section id="workspace-section-next-appointment" className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness className="size-4 text-blue-600" />Prochaine intervention</p><div className="mt-3"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><BriefcaseBusiness className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{eventLabel(event)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{event.projectTitle || event.title}</p><span className={['mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', statusPresentation.badgeClassName].join(' ')}>{statusPresentation.label}</span></div></div><div className="mt-3 space-y-1.5 text-xs text-slate-600"><p className="flex items-center gap-2"><Clock3 className="size-3.5 text-slate-400" />{formatTime(event.start) || 'Horaire à préciser'}{duration ? ` · ${formatDuration(duration)}` : ''}</p>{place ? <p className="flex items-center gap-2"><MapPin className="size-3.5 shrink-0 text-slate-400" /><span className="truncate">{place}</span></p> : null}</div><div className="mt-3 border-t border-slate-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Préparation</p><div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">{preparation.map((item) => <p key={item.label} className="flex items-center gap-1.5"><CheckCircle2 className={['size-3.5', item.ready ? 'text-emerald-600' : 'text-slate-400'].join(' ')} />{item.label}</p>)}</div><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Informations utiles</p><div className="mt-1.5 space-y-1.5">{brief.map((line) => <p key={line} className="text-xs leading-5 text-slate-600">{line}</p>)}</div></div>{(event.budget || event.photoCount > 0) ? <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">{event.budget ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><WalletCards className="size-3 text-slate-400" />{event.budget}</span> : null}{event.photoCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><ImageIcon className="size-3 text-slate-400" />{event.photoCount} photo{event.photoCount > 1 ? 's' : ''}</span> : null}</div> : null}{event.actionUrl ? <button type="button" onClick={() => onOpenProject(event)} className="mt-4 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400">Préparer dans le dossier</button> : null}</div></section>
}
