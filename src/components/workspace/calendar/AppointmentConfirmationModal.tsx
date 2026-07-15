'use client'

import { useState } from 'react'
import { BadgeCheck, Mail, Send, X } from 'lucide-react'
import { APPOINTMENT_CONFIRMATION_STATUSES, CONFIRMATION_STATUS_LABELS, type AppointmentConfirmationSource, type AppointmentConfirmationStatus } from '@/src/lib/appointment-confirmation'
import type { NormalizedCalendarEvent } from '@/src/lib/calendar/normalized-event'

type ManualInput = { status: AppointmentConfirmationStatus; source: AppointmentConfirmationSource; note: string; expectedVersion: number }
type SendInput = { status: AppointmentConfirmationStatus; message: string; expectedVersion: number }
type Props = { event: NormalizedCalendarEvent; saving: boolean; error: string | null; onClose: () => void; onSave: (input: ManualInput) => void; onSend: (input: SendInput) => void }

function emailTemplate(event: NormalizedCalendarEvent, status: AppointmentConfirmationStatus) {
  const client = event.clientName ? `Bonjour ${event.clientName},` : 'Bonjour,'
  const when = event.start ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.start)) : 'à la date prévue'
  const title = event.title || 'votre rendez-vous'
  if (status === 'pending') return `${client}\n\nUn rendez-vous est prévu le ${when} pour ${title}.\n\nMerci de confirmer votre disponibilité depuis votre espace client.\n\nVous pouvez également utiliser cet espace pour nous répondre ou nous transmettre une information complémentaire.\n\nCordialement,`
  if (status === 'change_requested') return `${client}\n\nUne modification est nécessaire concernant votre rendez-vous actuellement prévu le ${when} pour ${title}.\n\nMerci de consulter votre espace client afin de prendre connaissance de la demande et de nous répondre.\n\nNous reviendrons vers vous pour valider ensemble le nouvel horaire.\n\nCordialement,`
  if (status === 'cancelled') return `${client}\n\nVotre rendez-vous prévu le ${when} pour ${title} a été annulé.\n\nVous pouvez consulter les informations associées ou nous répondre depuis votre espace client.\n\nNous restons disponibles si vous souhaitez convenir d’un nouveau rendez-vous.\n\nCordialement,`
  return `${client}\n\nVotre rendez-vous est confirmé le ${when} pour ${title}.\n\nVous pouvez consulter les informations du rendez-vous ou nous répondre depuis votre espace client.\n\nMerci de nous prévenir en cas d’empêchement.\n\nCordialement,`
}

function emailSubject(status: AppointmentConfirmationStatus) {
  if (status === 'pending') return 'Rendez-vous à confirmer avec votre artisan'
  if (status === 'change_requested') return 'Modification demandée pour votre rendez-vous'
  if (status === 'cancelled') return 'Annulation de votre rendez-vous avec votre artisan'
  return 'Confirmation de votre rendez-vous avec votre artisan'
}

export default function AppointmentConfirmationModal({ event, saving, error, onClose, onSave, onSend }: Props) {
  const current = event.confirmation
  const initialStatus = (current?.status as AppointmentConfirmationStatus) || 'pending'
  const [status, setStatus] = useState<AppointmentConfirmationStatus>(initialStatus)
  const [note, setNote] = useState(current?.note || '')
  const [message, setMessage] = useState(() => emailTemplate(event, initialStatus))
  const canSendEmail = Boolean(event.clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.clientEmail))
  const changeStatus = (next: AppointmentConfirmationStatus) => { setStatus(next); setMessage(emailTemplate(event, next)) }
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4" onMouseDown={onClose}><div role="dialog" aria-modal="true" onMouseDown={(item) => item.stopPropagation()} className="max-h-[calc(100vh-32px)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-[#0E1926] p-5 text-white shadow-2xl"><div className="flex items-start justify-between"><div><p className="flex items-center gap-2 text-sm font-bold"><BadgeCheck className="size-4 text-emerald-400" />Confirmation du rendez-vous</p><p className="mt-1 text-sm text-slate-300">{event.title}</p></div><button type="button" onClick={onClose} className="text-slate-300"><X /></button></div><label className="mt-5 block text-sm font-medium">Statut<select value={status} onChange={(item) => changeStatus(item.target.value as AppointmentConfirmationStatus)} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">{APPOINTMENT_CONFIRMATION_STATUSES.map((value) => <option key={value} value={value}>{CONFIRMATION_STATUS_LABELS[value]}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Note <span className="font-normal text-slate-400">facultative</span><textarea value={note} onChange={(item) => setNote(item.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" /></label><div className="mt-5 border-t border-slate-700 pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><Mail className="size-4 text-emerald-400" />Préparer l’email</p><p className="mt-2 text-xs text-slate-300">Destinataire : {event.clientEmail || 'email manquant'}</p><p className="mt-1 text-xs text-slate-400">Objet : {emailSubject(status)}</p><p className="mt-2 text-xs text-slate-400">Le lien sécurisé vers le portail client sera ajouté automatiquement à l’email.</p><textarea value={message} onChange={(item) => setMessage(item.target.value)} rows={7} className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm" />{!canSendEmail && <p className="mt-2 text-xs text-amber-300">Aucun email client n’est renseigné pour ce rendez-vous. Ajoutez une adresse email au dossier avant l’envoi.</p>}<button type="button" disabled={saving || !message.trim() || !canSendEmail} onClick={() => onSend({ status, message, expectedVersion: current?.version || 0 })} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Send className="size-4" />{saving ? 'Envoi en cours…' : 'Envoyer'}</button></div>{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}<div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="text-sm text-slate-300">Annuler</button><button type="button" disabled={saving} onClick={() => onSave({ status, source: 'artisan', note, expectedVersion: current?.version || 0 })} className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-bold text-white">Enregistrer sans envoi</button></div></div></div>
}
