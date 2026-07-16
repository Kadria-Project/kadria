import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Reveal } from './motion'

/**
 * Bandeau d'engagements : liste éditoriale sur fond nuit, en deux colonnes
 * de définitions plutôt qu'en grille de cartes. Uniquement des engagements
 * de méthode, vérifiables par le client — aucune certification inventée.
 */
export function TrustBand({ config }: { config: SiteVitrineConfig }) {
  const { trust } = config

  return (
    <section aria-label={trust.title} style={{ background: 'var(--sv-night)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
            <h2
              className="text-lg font-bold uppercase tracking-[0.14em]"
              style={{ color: '#f6f5f1', fontFamily: 'var(--font-sv-display)' }}
            >
              {trust.title}
            </h2>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {trust.commitments.map((c) => (
                <div key={c.title} className="py-4" style={{ borderTop: '1px solid var(--sv-line-dark)' }}>
                  <dt className="flex items-baseline gap-2 text-sm font-semibold" style={{ color: '#f6f5f1' }}>
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: 'var(--sv-accent)' }} />
                    {c.title}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(246,245,241,0.7)' }}>
                    {c.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
