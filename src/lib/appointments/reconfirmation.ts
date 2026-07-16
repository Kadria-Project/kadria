import 'server-only'

import { Resend } from 'resend'
import { getArtisanConfig, TABLES } from '@/src/lib/airtable'
import { getClientPortalUrl } from '@/src/lib/client-portal'
import { renderBaseEmail, renderBaseEmailText } from '@/src/lib/email/templates/base-email'
import { supabaseAdmin } from '@/src/lib/supabase/server'

export type AppointmentSnapshot = { start: string | null; end: string | null; assignedUserId: string | null }

function normalizeInstant(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.trim() || null : date.toISOString()
}

function normalizeAssignee(value: string | null) {
  return value?.trim() || null
}

export function detectSubstantiveAppointmentChange(before: AppointmentSnapshot, after: AppointmentSnapshot) {
  const startChanged = normalizeInstant(before.start) !== normalizeInstant(after.start)
  const endChanged = normalizeInstant(before.end) !== normalizeInstant(after.end)
  const assigneeChanged = normalizeAssignee(before.assignedUserId) !== normalizeAssignee(after.assignedUserId)
  return { startChanged, endChanged, assigneeChanged, substantiveChange: startChanged || endChanged || assigneeChanged }
}

export function buildAppointmentReconfirmationRequestId(appointmentId: string, confirmationVersion: number) {
  return `reconfirmation:${appointmentId}:${confirmationVersion}`
}

export async function recordAppointmentLifecycleActivity(input: { projectId: string | null; action: string; description: string }) {
  if (!input.projectId) return { recorded: false }
  const description = input.description.trim().replace(/\s+/g, ' ').slice(0, 1000)
  if (!description) return { recorded: false }
  const { error } = await supabaseAdmin.from(TABLES.activity).insert({ project_id: input.projectId, action: input.action, description, created_at: new Date().toISOString() })
  if (error) throw error
  return { recorded: true }
}

function validEmail(value: string | null) { return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) }

export async function sendAppointmentReconfirmationEmail(input: { appointmentId: string; projectId: string | null; artisanId: string; clientEmail: string | null; clientName: string | null; title: string | null; start: string | null; reason?: 'rescheduling' | 'modification' }) {
  if (!input.projectId || !validEmail(input.clientEmail)) return { sent: false, errorCode: 'CLIENT_EMAIL_UNAVAILABLE' }
  if (!process.env.RESEND_API_KEY) return { sent: false, errorCode: 'RESEND_NOT_CONFIGURED' }
  try {
    const portalUrl = await getClientPortalUrl(input.projectId, input.artisanId)
    if (!portalUrl) return { sent: false, errorCode: 'CLIENT_PORTAL_UNAVAILABLE' }
    const config = await getArtisanConfig(input.artisanId)
    const companyName = config?.companyName || 'Kadria'
    const date = input.start ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(input.start)) : 'à préciser'
    const isNewProposal = input.reason === 'rescheduling'
    const payload = isNewProposal
      ? { preheader: 'Votre artisan vous propose un nouveau créneau', title: 'Nouvelle proposition de rendez-vous', intro: `Bonjour ${input.clientName || ''}, votre artisan vous propose un nouveau créneau${input.title ? ` pour ${input.title}` : ''}. Nouvelle date : ${date}. Merci de confirmer, demander un autre changement ou refuser depuis votre espace client.`, ctaLabel: 'Confirmer ou répondre', ctaUrl: portalUrl, secondaryText: portalUrl, artisanName: companyName }
      : { preheader: 'Nouvelle confirmation requise pour votre rendez-vous', title: 'Nouvelle confirmation requise pour votre rendez-vous', intro: `Bonjour ${input.clientName || ''}, votre rendez-vous${input.title ? ` (${input.title})` : ''} a été modifié. Nouvelle date : ${date}.`, ctaLabel: 'Confirmer ou répondre', ctaUrl: portalUrl, secondaryText: portalUrl, artisanName: companyName }
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.RESEND_FROM_EMAIL || 'Kadria <devis@kadria.fr>', to: input.clientEmail!, subject: isNewProposal ? 'Nouvelle proposition de rendez-vous' : 'Nouvelle confirmation requise pour votre rendez-vous', html: renderBaseEmail(payload), text: renderBaseEmailText(payload) })
    if (result.error || !result.data?.id) return { sent: false, errorCode: 'EMAIL_SEND_FAILED' }
    return { sent: true, emailId: result.data.id }
  } catch {
    return { sent: false, errorCode: 'EMAIL_SEND_FAILED' }
  }
}
