'use client'

import { useState } from 'react'

export type ClientPortalAppointment = { id: string; title: string; start: string | null; end: string | null; status: 'pending' | 'confirmed' | 'change_requested' | 'cancelled'; source: string | null; note: string | null; updatedAt: string | null; version: number }
type ResponseInput = { status: 'confirmed' | 'change_requested' | 'cancelled'; note: string; requestId: string; expectedVersion: number }
type Props = { appointment: ClientPortalAppointment; onSubmit: (appointmentId: string, input: ResponseInput) => Promise<void> }

const labels = { pending: 'À confirmer', confirmed: 'Confirmé', change_requested: 'Modification demandée', cancelled: 'Annulé' }

function when(value: string | null) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)) : 'Horaire à préciser' }
function duration(start: string | null, end: string | null) { return start && end ? `${Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)} min` : null }

export default function ClientAppointmentCard({ appointment, onSubmit }: Props) {
  const [action, setAction] = useState<ResponseInput['status'] | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => { if (!action || saving) return; setSaving(true); try { await onSubmit(appointment.id, { status: action, note, requestId: crypto.randomUUID(), expectedVersion: appointment.version }); setAction(null); setNote('') } finally { setSaving(false) } }
  const statusLabel = appointment.status === 'cancelled' && appointment.source === 'client' ? 'Refusé' : appointment.status === 'cancelled' && appointment.source === 'artisan' ? 'Annulé par l’artisan' : labels[appointment.status]
  const canConfirm = appointment.status === 'pending'
  const canRequestChange = appointment.status === 'pending' || appointment.status === 'confirmed'
  const canCancel = appointment.status !== 'cancelled'

  return <section style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 20 }} aria-live="polite">
    <h3 style={{ fontSize: 15, margin: '0 0 12px' }}>Votre rendez-vous</h3>
    <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 999, background: appointment.status === 'confirmed' ? '#dcfce7' : appointment.status === 'cancelled' ? '#fee2e2' : '#fef3c7', fontSize: 12, fontWeight: 700 }}>{statusLabel}</span>
    <p style={{ margin: '14px 0 4px', fontWeight: 700 }}>{appointment.title}</p><p style={{ margin: 0, color: '#4b5563', fontSize: 14 }}>{when(appointment.start)}{duration(appointment.start, appointment.end) ? ` · ${duration(appointment.start, appointment.end)}` : ''}</p>
    {appointment.note && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{appointment.note}</p>}
    {appointment.status === 'confirmed' && <p style={{ color: '#15803d', fontSize: 13, fontWeight: 600 }}>Votre rendez-vous est confirmé.</p>}
    {appointment.status === 'change_requested' && <p style={{ color: '#92400e', fontSize: 13 }}>Votre demande de changement a bien été transmise à l’artisan.</p>}
    {appointment.status === 'cancelled' && <p style={{ color: '#b91c1c', fontSize: 13 }}>{appointment.source === 'client' ? 'Vous avez refusé ce rendez-vous.' : appointment.source === 'artisan' ? 'Ce rendez-vous a été annulé par l’artisan.' : 'Ce rendez-vous est annulé.'}</p>}
    {!action && (canConfirm || canRequestChange || canCancel) && <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>{canConfirm && <button type="button" onClick={() => setAction('confirmed')} style={{ border: 0, borderRadius: 8, padding: 12, background: '#16a34a', color: '#fff', fontWeight: 700 }}>Confirmer le rendez-vous</button>}{canRequestChange && <button type="button" onClick={() => setAction('change_requested')} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12, background: '#fff', fontWeight: 700 }}>Demander un changement</button>}{canCancel && <button type="button" onClick={() => setAction('cancelled')} style={{ border: 0, background: 'transparent', color: '#991b1b', padding: 6 }}>{appointment.status === 'change_requested' ? 'Refuser le rendez-vous' : 'Annuler / refuser le rendez-vous'}</button>}</div>}
    {action && <div style={{ marginTop: 18, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}><p style={{ marginTop: 0, fontWeight: 700 }}>{action === 'confirmed' ? `Confirmer ce rendez-vous le ${when(appointment.start)} ?` : action === 'change_requested' ? 'Que souhaitez-vous modifier ?' : 'Souhaitez-vous vraiment refuser ce rendez-vous ?'}</p>{action !== 'confirmed' && <textarea aria-label="Votre message" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 8, padding: 10 }} placeholder={action === 'change_requested' ? 'Ex : Je ne suis pas disponible à cette heure.' : 'Motif ou commentaire facultatif'} />}<div style={{ display: 'flex', gap: 12, marginTop: 12 }}><button type="button" disabled={saving} onClick={() => void submit()} style={{ border: 0, borderRadius: 8, padding: '10px 14px', background: '#16a34a', color: '#fff', fontWeight: 700 }}>{saving ? 'Enregistrement…' : action === 'confirmed' ? 'Oui, confirmer' : 'Envoyer ma réponse'}</button><button type="button" disabled={saving} onClick={() => setAction(null)} style={{ border: 0, background: 'transparent' }}>Annuler</button></div></div>}
  </section>
}
