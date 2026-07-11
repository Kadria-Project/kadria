'use client'

import { motion } from 'motion/react'
import { TEAM_ROLE_LABELS, type TenantInvitation } from '@/src/lib/team/types'

export function InvitationCard({
  invitation,
  submitting,
  onResend,
  onRevoke,
}: {
  invitation: TenantInvitation
  submitting: boolean
  onResend: () => void
  onRevoke: () => void
}) {
  const name = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || 'Collaborateur'

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="rounded-[18px] border border-white/10 bg-black/20 p-4 hover:shadow-[0_8px_24px_rgba(34,197,94,0.08)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              En attente
            </span>
            <p className="text-base font-semibold text-white">{invitation.email}</p>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {name} · {TEAM_ROLE_LABELS[invitation.role]} · {invitation.jobTitle || 'Fonction non renseignée'}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Envoyée par {invitation.invitedByName || 'Kadria'}
            {invitation.expiresAt ? ` · expire le ${new Date(invitation.expiresAt).toLocaleString('fr-FR')}` : ''}
            {' · relances '}
            {Math.max(invitation.sendCount - 1, 0)}
          </p>
          {/* "Copier le lien" n'est pas exposé ici : l'API /api/team/invitations
              ne renvoie pas de lien d'invitation exploitable côté client dans
              TenantInvitation (pas de champ token/url). Bouton non affiché pour
              éviter de promettre une fonctionnalité non connectée. */}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={submitting}
            className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.04] disabled:opacity-60"
          >
            Relancer
          </button>
          <button
            type="button"
            onClick={onRevoke}
            disabled={submitting}
            className="h-11 rounded-xl border border-rose-500/20 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            Annuler
          </button>
        </div>
      </div>
    </motion.div>
  )
}
