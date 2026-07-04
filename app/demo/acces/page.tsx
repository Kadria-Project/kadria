'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type DemoAccessForm = {
  firstName: string
  lastName: string
  companyName: string
  trade: string
  email: string
  phone: string
  website: string
  monthlyRequestsVolume: string
  currentTool: string
  mainNeed: string
  objective: string
  message: string
  consentContact: boolean
}

const INITIAL_FORM: DemoAccessForm = {
  firstName: '',
  lastName: '',
  companyName: '',
  trade: '',
  email: '',
  phone: '',
  website: '',
  monthlyRequestsVolume: '',
  currentTool: '',
  mainNeed: '',
  objective: '',
  message: '',
  consentContact: false,
}

const VOLUME_OPTIONS = [
  'Moins de 10 demandes / mois',
  '10 a 30 demandes / mois',
  '30 a 80 demandes / mois',
  'Plus de 80 demandes / mois',
]

const OBJECTIVE_OPTIONS = [
  'tester seul',
  'presentation commerciale',
  'partenariat',
  'incubateur / investissement',
  'autre',
]

const MAIN_NEED_OPTIONS = [
  'Mieux qualifier les prospects',
  'Ne plus perdre de demandes',
  'Structurer les devis et relances',
  'Piloter le pipeline commercial',
  'Comparer Kadria a mon outil actuel',
]

export default function DemoAccessPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [verifyingToken, setVerifyingToken] = useState(false)

  function update<K extends keyof DemoAccessForm>(key: K, value: DemoAccessForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/demo-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Erreur lors de l'envoi de la demande")
      }

      setSubmitted(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token') || ''
    setReason(params.get('reason') || '')

    if (!token) {
      setVerifyingToken(false)
      return
    }

    setVerifyingToken(true)
    window.location.replace(`/api/demo-access/verify?token=${encodeURIComponent(token)}`)
  }, [])

  const inputClassName = 'w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500'

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/demo" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Retour a la page demo
          </Link>
          <span className="rounded-full border border-green-500/20 bg-green-500/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
            Prevente
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">
              Demande d'acces
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Voyons si la demo Kadria correspond a votre contexte.
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-400 sm:text-base">
              Renseignez votre activite, votre volume de demandes et votre objectif. Nous analysons
              chaque demande avant d'ouvrir un acces a la demo 1:1.
            </p>

            <div className="mt-8 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              {[
                "Aucun acces demo n'est accorde automatiquement apres soumission.",
                "Aucun compte plateforme ni session utilisateur n'est cree dans ce parcours.",
                'La demonstration peut etre adaptee a votre metier, votre outil actuel et votre besoin principal.',
              ].map((item) => (
                <div key={item} className="flex gap-3 text-sm text-zinc-300">
                  <span className="mt-0.5 text-green-500">-</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 sm:p-8">
            {verifyingToken ? (
              <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/[0.08] p-4 text-sm leading-7 text-zinc-200">
                Verification de votre acces demo en cours...
              </div>
            ) : reason ? (
              <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/[0.08] p-4 text-sm leading-7 text-zinc-200">
                {reason === 'demo_access_required'
                  ? 'La demonstration complete est accessible sur demande.'
                  : reason === 'demo_access_expired'
                    ? "Votre acces demo a expire. La demonstration complete est accessible sur demande."
                    : reason === 'demo_access_revoked'
                      ? "Cet acces demo a ete revoque. La demonstration complete est accessible sur demande."
                      : "Ce lien demo n'est pas valide. La demonstration complete est accessible sur demande."}
              </div>
            ) : null}

            {!submitted && !verifyingToken ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Demander un acces demo</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Les champs marques comme essentiels nous permettent de qualifier la demande correctement.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Prenom">
                    <input className={inputClassName} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
                  </Field>
                  <Field label="Nom">
                    <input className={inputClassName} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
                  </Field>
                  <Field label="Entreprise">
                    <input className={inputClassName} value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
                  </Field>
                  <Field label="Metier">
                    <input className={inputClassName} value={form.trade} onChange={(e) => update('trade', e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input className={inputClassName} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </Field>
                  <Field label="Telephone">
                    <input className={inputClassName} type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </Field>
                  <Field className="sm:col-span-2" label="Site web (optionnel)">
                    <input className={inputClassName} value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
                  </Field>
                  <Field label="Volume de demandes mensuel">
                    <select className={inputClassName} value={form.monthlyRequestsVolume} onChange={(e) => update('monthlyRequestsVolume', e.target.value)}>
                      <option value="">Selectionnez</option>
                      {VOLUME_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Outil actuel">
                    <input className={inputClassName} value={form.currentTool} onChange={(e) => update('currentTool', e.target.value)} placeholder="CRM, tableur, aucun..." />
                  </Field>
                  <Field label="Besoin principal">
                    <select className={inputClassName} value={form.mainNeed} onChange={(e) => update('mainNeed', e.target.value)}>
                      <option value="">Selectionnez</option>
                      {MAIN_NEED_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Objectif">
                    <select className={inputClassName} value={form.objective} onChange={(e) => update('objective', e.target.value)}>
                      <option value="">Selectionnez</option>
                      {OBJECTIVE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field className="sm:col-span-2" label="Message libre">
                    <textarea
                      className={`${inputClassName} min-h-32 resize-y`}
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                      placeholder="Precisez votre contexte, vos enjeux ou le type de demonstration souhaite."
                    />
                  </Field>
                </div>

                <label className="mt-6 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.consentContact}
                    onChange={(e) => update('consentContact', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-green-500 focus:ring-green-500"
                  />
                  <span>
                    J'accepte d'etre recontacte par Kadria au sujet de cette demande de demonstration.
                  </span>
                </label>

                {error ? (
                  <p className="mt-4 text-sm text-red-400">{error}</p>
                ) : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-zinc-500">
                    Votre demande sera enregistree avec le statut <span className="font-semibold text-zinc-300">pending</span>.
                  </p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-green-400 disabled:cursor-default disabled:bg-zinc-700 disabled:text-zinc-300"
                  >
                    {submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
                  </button>
                </div>
              </>
            ) : !verifyingToken ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/[0.08] text-2xl text-green-500">
                  OK
                </div>
                <h2 className="mt-6 text-2xl font-semibold">Demande envoyee</h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
                  Votre demande a bien ete envoyee. Nous revenons vers vous rapidement.
                </p>
                <Link
                  href="/demo"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Revenir a la page demo
                </Link>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-green-500/20 bg-green-500/[0.08] text-2xl text-green-500">
                  ...
                </div>
                <h2 className="mt-6 text-2xl font-semibold">Verification de l'acces demo</h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
                  Nous validons votre lien securise avant d'ouvrir la demonstration complete.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        select {
          appearance: none;
        }
      `}</style>
    </main>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  )
}
