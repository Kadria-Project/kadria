'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KadriaLogo } from '@/src/components/KadriaLogo'
import { TEAM_ROLE_LABELS } from '@/src/lib/team/types'

interface InvitationViewProps {
  token: string
  preview: {
    tenantName: string
    tenantSlug: string
    email: string
    firstName: string | null
    lastName: string | null
    role: keyof typeof TEAM_ROLE_LABELS
    jobTitle: string | null
    expiresAt: string | null
    status: 'pending' | 'accepted' | 'expired' | 'revoked'
  } | null
  session: {
    email: string
    firstName?: string
    lastName?: string
  } | null
}

export default function InvitationClient({ token, preview, session }: InvitationViewProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: preview?.firstName || '',
    lastName: preview?.lastName || '',
    email: preview?.email || '',
  })

  const isMatchingSession = useMemo(() => {
    return !!session?.email && !!preview?.email && session.email.trim().toLowerCase() === preview.email.trim().toLowerCase()
  }, [preview?.email, session?.email])

  async function post(path: string, body?: Record<string, unknown>) {
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Une erreur est survenue.')
      }
      return data
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMagicLink() {
    try {
      await post(`/api/invitations/${token}/send-magic-link`)
      setMessage(`Un lien magique a ete envoye a ${preview?.email}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’envoyer le lien magique.')
    }
  }

  async function handleCreateAccess() {
    try {
      const data = await post(`/api/invitations/${token}/create-account`, form)
      setMessage(
        data.alreadyExists
          ? `Un compte existe deja pour ${form.email}. Un lien magique vient d'etre envoye.`
          : `Votre acces est pret. Un lien magique vient d'etre envoye a ${form.email}.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de creer votre acces.')
    }
  }

  async function handleAccept() {
    try {
      await post(`/api/invitations/${token}/accept`)
      setMessage(`Bienvenue chez ${preview?.tenantName}. Votre acces Kadria est pret.`)
      setTimeout(() => router.push('/dashboard-v2'), 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’accepter l’invitation.')
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-10 text-white">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-10 flex justify-center">
          <KadriaLogo size="sm" theme="dark" noLink />
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
          {!preview ? (
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-semibold">Invitation introuvable</h1>
              <p className="text-sm text-zinc-400">Le lien d’invitation est invalide ou n’existe plus.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <span className="inline-flex rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4ade80]">
                  Invitation equipe
                </span>
                <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">
                  {preview.tenantName} vous invite a rejoindre son espace Kadria
                </h1>
                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Rejoignez l’entreprise sans creer un nouveau workspace. Votre acces sera automatiquement rattache au bon tenant.
                </p>
              </div>

              <div className="grid gap-4 rounded-[20px] border border-white/10 bg-black/20 p-5 sm:grid-cols-2">
                <Info label="Entreprise" value={preview.tenantName} />
                <Info label="Email concerne" value={preview.email} />
                <Info label="Role propose" value={TEAM_ROLE_LABELS[preview.role]} />
                <Info label="Fonction" value={preview.jobTitle || 'Non renseignee'} />
                <Info label="Invite" value={[preview.firstName, preview.lastName].filter(Boolean).join(' ') || 'Collaborateur'} />
                <Info label="Expiration" value={preview.expiresAt ? new Date(preview.expiresAt).toLocaleString('fr-FR') : 'Non renseignee'} />
              </div>

              <div className="mt-6 rounded-[18px] border border-white/10 bg-[#0b0d0c] p-5">
                {preview.status === 'accepted' && (
                  <StateBlock title="Invitation deja acceptee" description="Cette invitation a deja ete utilisee. Connectez-vous pour acceder a votre espace." />
                )}
                {preview.status === 'expired' && (
                  <StateBlock title="Invitation expiree" description="Demandez a un administrateur de vous renvoyer une nouvelle invitation." />
                )}
                {preview.status === 'revoked' && (
                  <StateBlock title="Invitation revoquee" description="Cette invitation n’est plus active. Contactez votre administrateur si besoin." />
                )}

                {preview.status === 'pending' && (
                  <div className="space-y-5">
                    {session && !isMatchingSession ? (
                      <StateBlock
                        title="Mauvais compte connecte"
                        description={`Vous etes connecte avec ${session.email}, mais cette invitation concerne ${preview.email}. Deconnectez-vous puis reconnectez-vous avec la bonne adresse.`}
                      />
                    ) : session && isMatchingSession ? (
                      <div className="space-y-4">
                        <p className="text-sm text-zinc-300">
                          Vous etes connecte avec la bonne adresse. Vous pouvez maintenant rejoindre {preview.tenantName}.
                        </p>
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={submitting}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                        >
                          {submitting ? 'Validation...' : 'Acceder a Kadria'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                          <h2 className="text-base font-semibold">Deja un compte Kadria ?</h2>
                          <p className="mt-2 text-sm text-zinc-400">
                            Recevez un lien magique securise sur l’adresse invitee, puis revenez ici pour rejoindre l’entreprise.
                          </p>
                          <button
                            type="button"
                            onClick={handleMagicLink}
                            disabled={submitting}
                            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.04] disabled:opacity-60"
                          >
                            {submitting ? 'Envoi...' : 'Recevoir un lien magique'}
                          </button>
                        </div>

                        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-4">
                          <h2 className="text-base font-semibold">Creer mon acces</h2>
                          <p className="mt-2 text-sm text-zinc-400">
                            Kadria creera votre acces puis vous enverra un lien magique. Aucun nouveau tenant ne sera cree.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Field label="Prenom" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} />
                            <Field label="Nom" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} />
                          </div>
                          <div className="mt-3">
                            <Field label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateAccess}
                            disabled={submitting}
                            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                          >
                            {submitting ? 'Creation...' : 'Creer mon acces'}
                          </button>
                        </div>
                      </div>
                    )}

                    {message && <p className="text-sm font-medium text-[#4ade80]">{message}</p>}
                    {error && <p className="text-sm font-medium text-rose-400">{error}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function StateBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#101214] px-4 text-sm text-white outline-none transition focus:border-[#22c55e]/50"
      />
    </label>
  )
}
