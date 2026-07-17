'use client'

import { MessageCircle, Sparkles } from 'lucide-react'
import type { ClientActionItem, ClientActionsSummary } from '@/src/lib/clients/clients-action-types'
import { CLIENT_ACTION_CONFIG } from '@/src/lib/clients/clients-action-config'

/**
 * Lightweight, deterministic "Kadria Collaborateur" context block for the
 * Clients page. It reuses the same server-derived action data as the action
 * center — no extra fetch, no LLM call, no invented intelligence.
 *
 * Integration note (§12 of the Lot 9.5 brief): the existing
 * `KadriaCollaboratorPanel` (src/components/workspace/KadriaCollaboratorPanel.tsx)
 * keys its "Aujourd'hui" summary off a static per-mode config object
 * (`collaboratorContexts`) rather than page-supplied data, and its `clients`
 * mode currently renders a placeholder string. Wiring this block's summary
 * into that panel would mean giving `collaboratorContexts.clients` a dynamic
 * summary prop threaded through `WorkspaceNavigationContext`, which touches
 * a shared, cross-page component. To avoid that risk in this lot, this
 * dedicated in-page block covers the same product intent and can be lifted
 * into `KadriaCollaboratorPanel` later once that panel accepts page-scoped
 * context.
 */
export function ClientsCollaboratorContext({
  actions,
  summary,
  loading,
}: {
  actions: ClientActionItem[]
  summary: ClientActionsSummary | null
  loading: boolean
}) {
  if (loading || !summary) return null

  const parts: string[] = []
  if (summary.callbacks > 0) parts.push(`${summary.callbacks} client${summary.callbacks > 1 ? 's' : ''} à rappeler`)
  if (summary.quotesWaiting > 0) parts.push(`${summary.quotesWaiting} devis sans réponse`)
  if (summary.appointmentChanges > 0) parts.push(`${summary.appointmentChanges} modification${summary.appointmentChanges > 1 ? 's' : ''} de rendez-vous`)
  if (summary.appointmentsToConfirm > 0) parts.push(`${summary.appointmentsToConfirm} rendez-vous à confirmer`)
  if (summary.contactsToReconcile > 0) parts.push(`${summary.contactsToReconcile} contact${summary.contactsToReconcile > 1 ? 's' : ''} à rapprocher`)

  const synthesis = parts.length > 0 ? `Aujourd’hui : ${parts.join(', ')}.` : 'Aujourd’hui, aucun client ne nécessite d’action immédiate.'
  const first = actions[0]
  const recommendation = first
    ? `Commencez par ${first.clientName} : ${CLIENT_ACTION_CONFIG[first.reason].label.toLowerCase()}.`
    : 'Votre portefeuille client est à jour.'

  return (
    <section aria-label="Contexte Kadria Collaborateur — Clients" className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><MessageCircle className="size-4" /> Aujourd’hui</div>
      <p className="mt-2 text-sm leading-6 text-emerald-950/80">{synthesis}</p>
      <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-emerald-950/80">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-700" />
        <span>{recommendation}</span>
      </div>
    </section>
  )
}
