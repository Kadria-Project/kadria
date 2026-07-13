'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { InviteDrawer, type InviteFormState } from '@/src/components/team/InviteDrawer'
import { MemberCard } from '@/src/components/team/MemberCard'
import { InvitationCard } from '@/src/components/team/InvitationCard'
import { TEAM_ROLE_LABELS, type TeamMember, type TenantInvitation, type TenantRole } from '@/src/lib/team/types'

type TeamResponse = {
  success: boolean
  tenant?: { name: string }
  membership?: { role: TenantRole }
  members?: TeamMember[]
  invitations?: TenantInvitation[]
  seats?: {
    used: number
    activeMembers: number
    pendingInvitations: number
    limit: number | null
    unlimited: boolean
    reached: boolean
  }
  permissions?: { canManageMembers: boolean; canInviteMembers: boolean }
  error?: string
}

type ConfirmActionState =
  | {
      kind: 'member-action'
      memberId: string
      action: 'suspend' | 'reactivate' | 'remove'
      title: string
      description: string
      confirmLabel: string
      tone?: 'default' | 'danger'
    }
  | {
      kind: 'role-change'
      memberId: string
      role: string
      jobTitle: string | null
      title: string
      description: string
      confirmLabel: string
      tone?: 'default' | 'danger'
    }
  | {
      kind: 'invitation-action'
      invitationId: string
      action: 'resend' | 'revoke'
      title: string
      description: string
      confirmLabel: string
      tone?: 'default' | 'danger'
    }

function humanizeTeamError(message: string | undefined, fallback: string) {
  if (!message) return fallback

  const normalized = message.trim().toLowerCase()

  if (
    normalized.includes('forbidden') ||
    normalized.includes('unauthorized') ||
    normalized.includes("permission")
  ) {
    return "Vous n'avez pas acces a cette action."
  }

  if (
    normalized.includes('invite_already_exists') ||
    normalized.includes('invitation already exists') ||
    normalized.includes('invitation pending') ||
    normalized.includes('already pending')
  ) {
    return 'Une invitation est deja en attente pour cette adresse.'
  }

  if (
    normalized.includes('already member') ||
    normalized.includes('already part of the team') ||
    normalized.includes('already belongs')
  ) {
    return 'Cette personne fait deja partie de l equipe.'
  }

  if (normalized.includes('[object object]')) {
    return fallback
  }

  return message
}

export default function TeamSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<TeamResponse | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null)
  const [inviteForm, setInviteForm] = useState<InviteFormState>({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: 'Collaborateur',
    role: 'member' as TenantRole,
    message: '',
  })

  async function loadTeam() {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch('/api/team', { cache: 'no-store' })
      const payload = (await response.json()) as TeamResponse
      if (!response.ok || !payload.success) {
        throw new Error(humanizeTeamError(payload.error, "Impossible de charger l'equipe."))
      }
      setData(payload)
    } catch (err) {
      setData(null)
      setLoadError(err instanceof Error ? humanizeTeamError(err.message, "Impossible de charger l'equipe.") : "Impossible de charger l'equipe.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeam()
  }, [])

  const seatLabel = useMemo(() => {
    const seats = data?.seats
    if (!seats) return ''
    if (seats.unlimited || seats.limit === null) return `${seats.used} acces utilises`
    return `${seats.used} acces utilises sur ${seats.limit}`
  }, [data?.seats])

  const hasLoadedData = Boolean(data?.success && data?.tenant && data?.membership && data?.seats)
  const pendingInvitations = (data?.invitations || []).filter((invitation) => invitation.status === 'pending')
  const teamData = hasLoadedData ? data : null

  async function submit(
    path: string,
    method: 'POST' | 'PATCH' = 'POST',
    body?: Record<string, unknown>,
    fallbackError = 'Action impossible.',
  ) {
    setSubmitting(true)
    setFeedback(null)
    setError(null)
    try {
      const response = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.success) {
        throw new Error(humanizeTeamError(payload.error, fallbackError))
      }
      return payload
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInvite() {
    try {
      const payload = await submit(
        '/api/team/invitations',
        'POST',
        inviteForm,
        "L'invitation n'a pas pu etre envoyee.",
      )
      setFeedback(payload.warning || 'Invitation envoyee.')
      setInviteOpen(false)
      setInviteForm({
        firstName: '',
        lastName: '',
        email: '',
        jobTitle: 'Collaborateur',
        role: 'member',
        message: '',
      })
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? humanizeTeamError(err.message, "L'invitation n'a pas pu etre envoyee.") : "L'invitation n'a pas pu etre envoyee.")
    }
  }

  async function handleResend(id: string) {
    try {
      await submit(
        `/api/team/invitations/${id}/resend`,
        'POST',
        undefined,
        "L'invitation n'a pas pu etre envoyee.",
      )
      setFeedback('Invitation renvoyee.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? humanizeTeamError(err.message, "L'invitation n'a pas pu etre envoyee.") : "L'invitation n'a pas pu etre envoyee.")
    }
  }

  async function handleRevoke(id: string) {
    try {
      await submit(
        `/api/team/invitations/${id}/revoke`,
        'POST',
        undefined,
        "Kadria n'a pas pu modifier cette invitation.",
      )
      setFeedback('Invitation annulee.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? humanizeTeamError(err.message, "Kadria n'a pas pu modifier cette invitation.") : "Kadria n'a pas pu modifier cette invitation.")
    }
  }

  async function handleMemberAction(id: string, action: 'suspend' | 'reactivate' | 'remove') {
    try {
      await submit(
        `/api/team/members/${id}/${action}`,
        'POST',
        undefined,
        "Kadria n'a pas pu modifier cet acces.",
      )
      setFeedback(
        action === 'suspend'
          ? 'Acces suspendu.'
          : action === 'reactivate'
            ? 'Acces reactive.'
            : "Personne retiree de l'equipe.",
      )
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? humanizeTeamError(err.message, "Kadria n'a pas pu modifier cet acces.") : "Kadria n'a pas pu modifier cet acces.")
    }
  }

  async function handleRoleChange(memberId: string, role: string, jobTitle: string | null) {
    try {
      await submit(
        `/api/team/members/${memberId}`,
        'PATCH',
        { role, jobTitle },
        "Kadria n'a pas pu modifier cet acces.",
      )
      setFeedback('Role modifie.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? humanizeTeamError(err.message, "Kadria n'a pas pu modifier cet acces.") : "Kadria n'a pas pu modifier cet acces.")
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return

    const currentAction = confirmAction
    setConfirmAction(null)

    if (currentAction.kind === 'member-action') {
      await handleMemberAction(currentAction.memberId, currentAction.action)
      return
    }

    if (currentAction.kind === 'role-change') {
      await handleRoleChange(currentAction.memberId, currentAction.role, currentAction.jobTitle)
      return
    }

    if (currentAction.action === 'resend') {
      await handleResend(currentAction.invitationId)
      return
    }

    await handleRevoke(currentAction.invitationId)
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 xl:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.push('/parametres')}
            className="shrink-0 text-sm text-[var(--text-2)]"
          >
            Retour
          </button>
          <div className="min-w-0 flex-1 sm:flex-none">
            <KadriaLogo size="sm" theme="dark" noLink />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 xl:px-10">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Equipe</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Invitez vos collaborateurs et gerez leurs acces a Kadria.
            </h1>

            {teamData && (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                {teamData.tenant?.name} - Votre acces : {TEAM_ROLE_LABELS[teamData.membership!.role]}
              </p>
            )}

            {data?.permissions?.canInviteMembers && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 sm:w-auto"
              >
                Inviter un collaborateur
              </button>
            )}

            {teamData ? (
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Collaborateurs actifs" value={String(teamData.seats!.activeMembers)} />
                <Metric label="Invitations envoyees" value={String(teamData.seats!.pendingInvitations)} />
                <Metric label="Acces utilises" value={seatLabel} />
                <Metric
                  label="Limite"
                  value={teamData.seats!.unlimited ? 'Illimitee' : (teamData.seats!.limit ? String(teamData.seats!.limit) : 'Non definie')}
                />
              </div>
            ) : !loading && loadError ? (
              <div className="mt-5 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                <p className="m-0">
                  Impossible de charger l&apos;equipe pour le moment. Reessayez dans un instant.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadTeam()}
                    className="h-10 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    Reessayer
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/parametres')}
                    className="h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
                  >
                    Retour aux reglages
                  </button>
                </div>
              </div>
            ) : null}

            {teamData && teamData.seats?.reached && (
              <div className="mt-5 rounded-[16px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Votre limite d&apos;utilisateurs est atteinte. Decouvrez les offres ou contactez Kadria pour debloquer plus d&apos;acces.
              </div>
            )}

            {feedback && <p className="mt-4 text-sm font-medium text-[#4ade80]">{feedback}</p>}
            {teamData && error && <p className="mt-4 text-sm font-medium text-rose-300">{error}</p>}
          </section>

          {teamData && (
            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-white">Equipe</h2>
              <p className="mt-1 text-sm text-zinc-400">Retrouvez ici les personnes qui font deja partie de votre entreprise.</p>

              <div className="mt-5 grid gap-4">
                {(teamData.members || []).map((member) => (
                  <MemberCard
                    key={member.membershipId}
                    member={member}
                    canManage={Boolean(teamData.permissions?.canManageMembers)}
                    onRoleChange={(role) =>
                      setConfirmAction({
                        kind: 'role-change',
                        memberId: member.membershipId,
                        role,
                        jobTitle: member.jobTitle,
                        title: "Modifier le role dans l'equipe ?",
                        description: 'Ses acces seront mis a jour immediatement.',
                        confirmLabel: 'Confirmer le changement',
                      })}
                    onToggleSuspend={() =>
                      setConfirmAction(
                        member.status === 'suspended'
                          ? {
                              kind: 'member-action',
                              memberId: member.membershipId,
                              action: 'reactivate',
                              title: 'Reactiver cet acces ?',
                              description: 'Cette personne pourra se reconnecter a Kadria et reprendre son activite.',
                              confirmLabel: "Reactiver l'acces",
                            }
                          : {
                              kind: 'member-action',
                              memberId: member.membershipId,
                              action: 'suspend',
                              title: "Suspendre l'acces de cette personne ?",
                              description: "Elle ne pourra plus se connecter a Kadria tant que son acces restera suspendu.",
                              confirmLabel: "Suspendre l'acces",
                            },
                      )}
                    onRemove={() =>
                      setConfirmAction({
                        kind: 'member-action',
                        memberId: member.membershipId,
                        action: 'remove',
                        title: "Retirer cette personne de l'equipe ?",
                        description: "Elle perdra l'acces aux dossiers et au planning. Cette action doit etre clairement assumee.",
                        confirmLabel: "Retirer de l'equipe",
                        tone: 'danger',
                      })}
                  />
                ))}

                {teamData.members?.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-zinc-500">
                    <p>Aucun collaborateur pour le moment.</p>
                    {data?.permissions?.canInviteMembers && (
                      <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
                      >
                        Inviter un collaborateur
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {teamData && (
            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-white">Invitations envoyees</h2>
              <p className="mt-1 text-sm text-zinc-400">Suivez les invitations en attente et relancez-les si besoin.</p>

              <div className="mt-5 grid gap-4">
                {pendingInvitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    submitting={submitting}
                    onResend={() =>
                      setConfirmAction({
                        kind: 'invitation-action',
                        invitationId: invitation.id,
                        action: 'resend',
                        title: "Renvoyer l'invitation ?",
                        description: 'Un nouvel email sera envoye pour aider cette personne a rejoindre votre espace Kadria.',
                        confirmLabel: "Renvoyer l'invitation",
                      })}
                    onRevoke={() =>
                      setConfirmAction({
                        kind: 'invitation-action',
                        invitationId: invitation.id,
                        action: 'revoke',
                        title: "Annuler cette invitation ?",
                        description: "Cette personne ne pourra plus utiliser cette invitation pour rejoindre votre equipe.",
                        confirmLabel: "Annuler l'invitation",
                        tone: 'danger',
                      })}
                  />
                ))}

                {pendingInvitations.length === 0 && (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-zinc-500">
                    Aucune invitation en attente.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <InviteDrawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        form={inviteForm}
        onFormChange={setInviteForm}
        onSubmit={handleInvite}
        submitting={submitting}
      />

      <ConfirmActionDialog
        open={Boolean(confirmAction)}
        submitting={submitting}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Confirmer'}
        tone={confirmAction?.tone || 'default'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white sm:text-xl">{value}</p>
    </div>
  )
}

function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  submitting,
  tone,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  submitting: boolean
  tone: 'default' | 'danger'
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#111315] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.04] disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`h-11 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60 ${
              tone === 'danger'
                ? 'border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                : 'bg-[#22c55e] text-black hover:opacity-90'
            }`}
          >
            {submitting ? 'Enregistrement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
