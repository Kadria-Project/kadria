import { BadgeCheck, BriefcaseBusiness, CircleAlert, Clock3, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { CONFIRMATION_STATUS_LABELS } from '@/src/lib/appointment-confirmation'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'
import { eventLabel, formatTime } from './calendar-workspace-utils'

type Props = {
  event: NormalizedCalendarEvent | null
  onOpenProject: (event: NormalizedCalendarEvent) => void
  onConfirm?: () => void
  onEdit?: () => void
}

export default function NextAppointmentPanel({ event, onOpenProject, onConfirm, onEdit }: Props) {
  if (!event) return <section id="workspace-section-next-appointment" className="rounded-2xl border border-slate-200 bg-white p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness className="size-4 text-blue-600" />Préparation prochain rendez-vous</p><p className="mt-3 text-sm leading-6 text-slate-500">Aucun rendez-vous à préparer.</p></section>

  const confirmation = event.confirmation?.status || 'pending'
  const checks = [
    confirmation === 'pending' ? 'Le rendez-vous attend encore votre confirmation.' : null,
    !(event.address || event.location) ? 'L’adresse du rendez-vous reste à renseigner.' : null,
    !event.clientPhone ? 'Le numéro du client manque pour préparer un SMS.' : null,
  ].filter(Boolean).slice(0, 3) as string[]
  const mainAction = confirmation === 'change_requested' ? { label: 'Replanifier', action: onEdit } : confirmation === 'pending' ? { label: 'Préparer la confirmation', action: onConfirm } : !(event.address || event.location) ? { label: 'Ajouter l’adresse', action: onEdit } : event.actionUrl ? { label: 'Ouvrir le dossier', action: () => onOpenProject(event) } : null

  return <section id="workspace-section-next-appointment" className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><BriefcaseBusiness className="size-4 text-blue-600" />Préparation prochain rendez-vous</p>
    <div className="mt-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><BriefcaseBusiness className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{eventLabel(event)}</p><p className="mt-0.5 truncate text-xs text-slate-500">{event.projectTitle || event.title}</p></div></div>
      <div className="mt-3 space-y-1.5 text-xs text-slate-600"><p className="flex items-center gap-2"><Clock3 className="size-3.5 text-slate-400" />{formatTime(event.start) || 'Horaire à préciser'}</p>{(event.address || event.location) && <p className="flex items-center gap-2"><MapPin className="size-3.5 text-slate-400" />{event.address || event.location}</p>}<p className="flex items-center gap-2"><BadgeCheck className="size-3.5 text-emerald-600" />{CONFIRMATION_STATUS_LABELS[confirmation as keyof typeof CONFIRMATION_STATUS_LABELS]}</p></div>
      <div className="mt-3 border-t border-slate-100 pt-3">{checks.length ? checks.map((check) => <p key={check} className="mb-1.5 flex gap-2 text-xs leading-5 text-slate-600"><CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />{check}</p>) : <p className="flex items-center gap-2 text-xs font-medium text-emerald-700"><ShieldCheck className="size-3.5" />Tout est prêt pour ce rendez-vous.</p>}</div>
      {mainAction?.action && <button type="button" onClick={mainAction.action} className="mt-4 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-400">{mainAction.label}</button>}
      {!event.clientPhone && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400"><Phone className="size-3" />SMS indisponible sans numéro client</p>}
    </div>
  </section>
}
