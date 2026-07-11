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

export default function TeamSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<TeamResponse | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  // `loadError` couvre uniquement l'echec du chargement initial de l'equipe
  // (affiche un unique bloc d'erreur avec Reessayer / Retour). `error`
  // couvre les actions ponctuelles (invite, revoke, etc.) une fois les
  // donnees deja chargees. Garder ces deux etats separes evite d'afficher
  // deux messages rouges simultanes au chargement.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
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
        throw new Error(payload.error || "Impossible de charger l'equipe.")
      }
      setData(payload)
    } catch (err) {
      setData(null)
      setLoadError(err instanceof Error ? err.message : "Impossible de charger l'equipe.")
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
    if (seats.unlimited || seats.limit === null) return `${seats.used} siege(s) utilise(s)`
    return `${seats.used} siege(s) utilise(s) sur ${seats.limit}`
  }, [data?.seats])

  const hasLoadedData = Boolean(data?.success && data?.tenant && data?.membership && data?.seats)
  const pendingInvitations = (data?.invitations || []).filter((invitation) => invitation.status === 'pending')
  const teamData = hasLoadedData ? data : null

  async function submit(path: string, method: 'POST' | 'PATCH' = 'POST', body?: Record<string, unknown>) {
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
        throw new Error(payload.error || 'Action impossible.')
      }
      return payload
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInvite() {
    try {
      const payload = await submit('/api/team/invitations', 'POST', inviteForm)
      setFeedback(payload.warning || `Invitation envoyee a ${inviteForm.email}`)
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
      setError(err instanceof Error ? err.message : "Impossible d'envoyer l'invitation.")
    }
  }

  async function handleResend(id: string) {
    try {
      await submit(`/api/team/invitations/${id}/resend`)
      setFeedback('Invitation renvoyee.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de relancer l'invitation.")
    }
  }

  async function handleRevoke(id: string) {
    try {
      await submit(`/api/team/invitations/${id}/revoke`)
      setFeedback('Invitation revoquee.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de revoquer l'invitation.")
    }
  }

  async function handleMemberAction(id: string, action: 'suspend' | 'reactivate' | 'remove') {
    try {
      await submit(`/api/team/members/${id}/${action}`)
      setFeedback(
        action === 'suspend'
          ? 'Membre suspendu.'
          : action === 'reactivate'
            ? 'Membre reactive.'
            : 'Membre retire.',
      )
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    }
  }

  async function handleRoleChange(memberId: string, role: string, jobTitle: string | null) {
    try {
      await submit(`/api/team/members/${memberId}`, 'PATCH', { role, jobTitle })
      setFeedback('Membre mis a jour.')
      await loadTeam()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre a jour le membre.')
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 xl:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            onClick={() => router.push('/parametres')}
            className="shrink-0 text-sm text-[var(--text-2)]"
          >
            ← Retour
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
                {teamData.tenant?.name} · role connecte : {TEAM_ROLE_LABELS[teamData.membership!.role]}
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
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Metric label="Membres actifs" value={String(teamData.seats!.activeMembers)} />
                  <Metric label="Invitations en attente" value={String(teamData.seats!.pendingInvitations)} />
                  <Metric label="Sieges utilises" value={seatLabel} />
                  <Metric
                    label="Limite"
                    value={teamData.seats!.unlimited ? 'Illimite' : (teamData.seats!.limit ? String(teamData.seats!.limit) : 'Non definie')}
                  />
                </div>
              </>
            ) : !loading && loadError ? (
              <div className="mt-5 rounded-[18px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                <p className="m-0">
                  Impossible de charger les informations equipe pour le moment. Rechargez la page ou reconnectez-vous si le probleme persiste.
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
                    Retour aux parametres
                  </button>
                </div>
              </div>
            ) : null}

            {teamData && teamData.seats?.reached && (
              <div className="mt-5 rounded-[16px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Votre limite d&apos;utilisateurs est atteinte. Decouvrir les offres ou contactez Kadria pour debloquer plus de sieges.
              </div>
            )}

            {feedback && <p className="mt-4 text-sm font-medium text-[#4ade80]">{feedback}</p>}
            {teamData && error && <p className="mt-4 text-sm font-medium text-rose-300">{error}</p>}
          </section>

          {teamData && (
            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-white">Membres</h2>
              <p className="mt-1 text-sm text-zinc-400">Collaborateurs deja rattaches a votre entreprise.</p>

              <div className="mt-5 grid gap-4">
                {(teamData.members || []).map((member) => (
                  <MemberCard
                    key={member.membershipId}
                    member={member}
                    canManage={Boolean(teamData.permissions?.canManageMembers)}
                    onRoleChange={(role) => handleRoleChange(member.membershipId, role, member.jobTitle)}
                    onToggleSuspend={() => handleMemberAction(member.membershipId, member.status === 'suspended' ? 'reactivate' : 'suspend')}
                    onRemove={() => handleMemberAction(member.membershipId, 'remove')}
                  />
                ))}
              </div>
            </section>
          )}

          {teamData && (
            <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-white">Invitations en attente</h2>
              <p className="mt-1 text-sm text-zinc-400">Relancez ou annulez les invitations non encore acceptees.</p>

              <div className="mt-5 grid gap-4">
                {pendingInvitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    submitting={submitting}
                    onResend={() => handleResend(invitation.id)}
                    onRevoke={() => handleRevoke(invitation.id)}
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
