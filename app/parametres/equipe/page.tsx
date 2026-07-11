'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import {
  TEAM_JOB_TITLE_SUGGESTIONS,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  type TeamMember,
  type TenantInvitation,
  type TenantRole,
} from '@/src/lib/team/types'

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

const ROLE_OPTIONS: TenantRole[] = ['admin', 'manager', 'member', 'viewer']

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
  const [inviteForm, setInviteForm] = useState({
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
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 xl:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3">
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

          {data?.permissions?.canInviteMembers && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 sm:w-auto"
            >
              Inviter un collaborateur
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 xl:px-10">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Equipe</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Invitez vos collaborateurs et gerez leurs acces a Kadria.
            </h1>

            {teamData ? (
              <>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                  {teamData.tenant?.name} · role connecte : {TEAM_ROLE_LABELS[teamData.membership!.role]}
                </p>
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
                  <div key={member.membershipId} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-white">
                          {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">{member.email}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Chip>{TEAM_ROLE_LABELS[member.role]}</Chip>
                          <Chip>{member.jobTitle || 'Fonction non renseignee'}</Chip>
                          <Chip tone={member.status === 'active' ? 'green' : member.status === 'suspended' ? 'amber' : 'red'}>
                            {member.status === 'active' ? 'Actif' : member.status === 'suspended' ? 'Suspendu' : 'Revoque'}
                          </Chip>
                        </div>
                      </div>

                      {teamData.permissions?.canManageMembers && (
                        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                          <select
                            value={member.role}
                            onChange={(event) => handleRoleChange(member.membershipId, event.target.value, member.jobTitle)}
                            className="h-11 rounded-xl border border-white/10 bg-[#101214] px-3 text-sm text-white outline-none"
                          >
                            {(['owner', 'admin', 'manager', 'member', 'viewer'] as TenantRole[]).map((role) => (
                              <option key={role} value={role}>
                                {TEAM_ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleMemberAction(member.membershipId, member.status === 'suspended' ? 'reactivate' : 'suspend')}
                            className="h-11 rounded-xl border border-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/[0.04]"
                          >
                            {member.status === 'suspended' ? 'Reactiver' : 'Suspendre'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMemberAction(member.membershipId, 'remove')}
                            className="h-11 rounded-xl border border-rose-500/20 px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
                          >
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
                  <div key={invitation.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{invitation.email}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {[invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || 'Collaborateur'} · {TEAM_ROLE_LABELS[invitation.role]} · {invitation.jobTitle || 'Fonction non renseignee'}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Envoyee par {invitation.invitedByName || 'Kadria'} · expire le {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString('fr-FR') : '—'} · relances {invitation.sendCount - 1}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleResend(invitation.id)}
                          disabled={submitting}
                          className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/[0.04] disabled:opacity-60"
                        >
                          Relancer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(invitation.id)}
                          disabled={submitting}
                          className="h-11 rounded-xl border border-rose-500/20 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          Revoquer
                        </button>
                      </div>
                    </div>
                  </div>
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

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[620px] rounded-[24px] border border-white/10 bg-[#0f1113] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Inviter un collaborateur</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Choisissez son role et sa fonction avant d&apos;envoyer l&apos;invitation.
                </p>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-sm text-zinc-400">
                Fermer
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Prenom" value={inviteForm.firstName} onChange={(value) => setInviteForm((current) => ({ ...current, firstName: value }))} />
              <Field label="Nom" value={inviteForm.lastName} onChange={(value) => setInviteForm((current) => ({ ...current, lastName: value }))} />
            </div>
            <div className="mt-4">
              <Field label="Email" value={inviteForm.email} onChange={(value) => setInviteForm((current) => ({ ...current, email: value }))} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">Fonction</span>
                <input
                  list="team-job-titles"
                  value={inviteForm.jobTitle}
                  onChange={(event) => setInviteForm((current) => ({ ...current, jobTitle: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none"
                />
                <datalist id="team-job-titles">
                  {TEAM_JOB_TITLE_SUGGESTIONS.map((jobTitle) => (
                    <option key={jobTitle} value={jobTitle} />
                  ))}
                </datalist>
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">Role</span>
                <select
                  value={inviteForm.role}
                  onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as TenantRole }))}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {TEAM_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
              <p className="font-semibold text-white">{TEAM_ROLE_LABELS[inviteForm.role]}</p>
              <p className="mt-2">{TEAM_ROLE_DESCRIPTIONS[inviteForm.role as Exclude<TenantRole, 'owner'>]}</p>
            </div>
            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">Message facultatif</span>
                <textarea
                  value={inviteForm.message}
                  onChange={(event) => setInviteForm((current) => ({ ...current, message: event.target.value }))}
                  className="min-h-[110px] w-full rounded-xl border border-white/10 bg-[#101214] px-4 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setInviteOpen(false)} className="h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={submitting}
                className="h-11 rounded-xl bg-[#22c55e] px-4 text-sm font-semibold text-black disabled:opacity-60"
              >
                {submitting ? 'Envoi...' : "Envoyer l'invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'green' | 'amber' | 'red'
}) {
  const toneClass =
    tone === 'green'
      ? 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#4ade80]'
      : tone === 'amber'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        : tone === 'red'
          ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
          : 'border-white/10 bg-white/[0.04] text-zinc-200'
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none"
      />
    </label>
  )
}
