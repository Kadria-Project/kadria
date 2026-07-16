import { CalendarClock, Mail, MapPin, Phone, X } from 'lucide-react'
import { buildAppointmentBrief } from '@/src/lib/calendar/appointment-brief'
import { getAppointmentStatusPresentation } from '@/src/lib/calendar/appointment-status-presentation'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'
import { formatTime } from './calendar-workspace-utils'

type Props = {
  event: NormalizedCalendarEvent
  onClose: () => void
  onPrepare: () => void
  onManual: () => void
  onReplan: () => void
  onEdit: () => void
  onOpenProject: () => void
}

export default function AppointmentDetailsModal({ event, onClose, onPrepare, onManual, onReplan, onEdit, onOpenProject }: Props) {
  const confirmation = event.confirmation?.status || null
  const statusPresentation = getAppointmentStatusPresentation(event.confirmation)
  const preparationLines = confirmation === 'change_requested'
    ? ['Le client a demandé une modification.', 'Consultez le dossier avant de reprendre contact.']
    : confirmation === 'cancelled'
      ? ['Ce rendez-vous est annulé.', 'Aucune préparation n’est nécessaire.']
      : buildAppointmentBrief(event)
  const main = confirmation === 'change_requested'
    ? { label: 'Replanifier', action: onReplan }
    : confirmation === 'pending'
      ? { label: 'Préparer la confirmation', action: onPrepare }
      : null

  return <div className="fixed inset-0 z-[55] grid place-items-center bg-slate-950/50 p-4" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="appointment-details-title" onMouseDown={(item) => item.stopPropagation()} className="max-h-[calc(100vh-32px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-[#0E1926] p-5 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-400">Rendez-vous</p>
          <h2 id="appointment-details-title" className="mt-1 text-xl font-bold">{event.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{event.clientName || event.projectTitle || 'Rendez-vous indépendant'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="text-slate-300"><X /></button>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-slate-200">
        <p className="flex gap-2"><CalendarClock className="size-4 text-emerald-400" />{event.start ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(event.start)) : 'Date à préciser'} · {formatTime(event.start) || 'Horaire à préciser'}</p>
        {(event.address || event.location) ? <p className="flex gap-2"><MapPin className="size-4 text-emerald-400" />{event.address || event.location}</p> : null}
        {event.clientPhone ? <p className="flex gap-2"><Phone className="size-4 text-emerald-400" />{event.clientPhone}</p> : null}
        {event.clientEmail ? <p className="flex gap-2"><Mail className="size-4 text-emerald-400" />{event.clientEmail}</p> : null}
      </div>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <p className="text-sm font-bold">Confirmation client</p>
        <p className={['mt-2 inline-flex rounded-full px-2 py-1 text-sm font-semibold', statusPresentation.badgeClassName].join(' ')}>{statusPresentation.label}</p>
        {event.confirmation?.note ? <p className="mt-2 text-xs leading-5 text-slate-300">{event.confirmation.note}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {main ? <button type="button" onClick={main.action} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950">{main.label}</button> : null}
          {confirmation === 'confirmed' ? <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-300">Confirmation envoyée</span> : null}
          <button type="button" onClick={onManual} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-white">Mettre à jour le statut</button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 p-4">
        <p className="text-sm font-bold">Préparation du rendez-vous</p>
        <div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-300">{preparationLines.map((line) => <p key={line}>{line}</p>)}</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-slate-200">Modifier le rendez-vous et l’affectation</button>
        {event.projectId ? <button type="button" onClick={onOpenProject} className="text-sm font-semibold text-emerald-300">Ouvrir le dossier</button> : null}
      </div>
    </div>
  </div>
}
