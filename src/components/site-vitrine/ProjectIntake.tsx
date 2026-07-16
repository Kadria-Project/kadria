'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { buildIntakeUrl } from '@/src/lib/site-vitrine/theme'
import { Reveal } from './motion'

/**
 * Point d'entrée vers le parcours de demande Kadria.
 *
 * Approche V1 (la plus sûre après audit) : le visiteur choisit son type de
 * besoin, puis est envoyé vers le parcours conversationnel existant
 * `/projet` en MODE DÉMO (`demoMode=true`) — le dossier y est simulé côté
 * client, aucun dossier réel n'est créé pour l'artisan fictif, et l'auth /
 * multi-tenant Kadria n'est pas contourné. Les paramètres de tracking
 * (source, trade, site, need) sont posés dans l'URL : c'est le contrat que
 * le raccordement production consommera (voir docs/SITE_VITRINE_ADDON.md).
 */
export function ProjectIntake({ config }: { config: SiteVitrineConfig }) {
  const intake = config.projectIntake

  // Les CTA de la section Prestations arrivent ici avec `?besoin=<id>` :
  // on présélectionne alors le besoin correspondant. Toute valeur inconnue
  // est ignorée, et le visiteur peut toujours corriger son choix à la main.
  const searchParams = useSearchParams()
  const rawRequested = searchParams.get('besoin')
  const requestedNeed =
    rawRequested && intake.needs.some((n) => n.id === rawRequested) ? rawRequested : null

  // État dérivé pendant le rendu (pas d'effet) : le choix manuel est mémorisé
  // avec le `?besoin=` qui l'a vu naître — un nouveau `?besoin=` re-présélectionne.
  const [manualChoice, setManualChoice] = useState<{ need: string; forRequest: string | null } | null>(null)
  const need =
    manualChoice && manualChoice.forRequest === requestedNeed
      ? manualChoice.need
      : requestedNeed ?? intake.needs[0]?.id ?? ''
  const setNeed = (id: string) => setManualChoice({ need: id, forRequest: requestedNeed })

  const intakeUrl = buildIntakeUrl(intake.formPath, intake.tracking, need ? { need } : undefined)

  return (
    <section id="projet" className="scroll-mt-20" style={{ background: 'var(--sv-paper-soft)', borderTop: '1px solid var(--sv-line)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <Reveal>
            <div>
              <p
                className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{ color: 'var(--sv-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                <span style={{ color: 'var(--sv-accent)' }}>05</span>
                <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--sv-accent)' }} />
                Votre demande
              </p>
              <h2
                className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
                style={{ color: 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}
              >
                {intake.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--sv-body)' }}>
                {intake.subtitle}
              </p>
              <ul className="mt-6 space-y-2 text-sm sm:text-base" style={{ color: 'var(--sv-body)' }}>
                {intake.collected.map((item) => (
                  <li key={item} className="flex items-baseline gap-3">
                    <span aria-hidden="true" className="h-1 w-4 shrink-0 translate-y-[-3px]" style={{ background: 'var(--sv-brand)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-md p-6 sm:p-8" style={{ background: 'var(--sv-paper)', border: '1px solid var(--sv-line)' }}>
              <fieldset>
                <legend className="text-base font-semibold" style={{ color: 'var(--sv-ink)' }}>
                  De quoi avez-vous besoin ?
                </legend>
                <div className="mt-4 flex flex-wrap gap-2">
                  {intake.needs.map((n) => {
                    const active = n.id === need
                    return (
                      <label
                        key={n.id}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2"
                        style={{
                          background: active ? 'var(--sv-night)' : 'var(--sv-paper)',
                          border: active ? '1px solid var(--sv-night)' : '1px solid var(--sv-line)',
                          color: active ? '#f6f5f1' : 'var(--sv-body)',
                          outlineColor: 'var(--sv-accent)',
                        }}
                      >
                        <input
                          type="radio"
                          name="sv-need"
                          value={n.id}
                          checked={active}
                          onChange={() => setNeed(n.id)}
                          className="sr-only"
                        />
                        {n.label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <Link
                href={intakeUrl}
                className="mt-6 flex min-h-13 w-full items-center justify-center rounded-md px-6 py-3.5 text-base font-semibold text-white"
                style={{ background: 'var(--sv-accent)' }}
              >
                Décrire mon projet
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </Link>

              <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--sv-muted)' }}>
                {intake.demoNotice}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
