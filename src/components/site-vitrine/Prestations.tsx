import Link from 'next/link'
import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'

/**
 * Prestations en deux registres éditoriaux :
 * - les 4 prestations "lead" en grandes entrées de sommaire, pleine largeur,
 *   avec exemples d'intervention ;
 * - les prestations complémentaires en liste compacte, sans cartes.
 */
export function Prestations({ config }: { config: SiteVitrineConfig }) {
  const { prestations } = config
  const leads = prestations.items.filter((p) => p.emphasis === 'lead')
  const others = prestations.items.filter((p) => p.emphasis === 'standard')

  return (
    <Section id="prestations" index="01" eyebrow="Prestations" title={prestations.title} intro={prestations.intro}>
      <div>
        {leads.map((p, i) => (
          <Reveal key={p.id} delay={Math.min(i * 0.05, 0.2)}>
            <article
              className="grid gap-4 py-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)] lg:gap-10 lg:py-10"
              style={{ borderTop: '1px solid var(--sv-line)' }}
            >
              <div className="flex items-start gap-4">
                <span
                  className="text-sm tabular-nums leading-7"
                  style={{ color: 'var(--sv-accent)', fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3
                  className="text-xl font-bold leading-snug tracking-tight sm:text-2xl"
                  style={{ color: 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}
                >
                  {p.title}
                </h3>
              </div>
              <div>
                <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--sv-body)' }}>
                  {p.description}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm" style={{ color: 'var(--sv-muted)' }}>
                  {p.examples.map((ex) => (
                    <li key={ex} className="flex items-baseline gap-2">
                      <span aria-hidden="true" style={{ color: 'var(--sv-brand)' }}>
                        —
                      </span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:text-right">
                {/* Le besoin de la prestation est reporté dans l'URL (`?besoin=`) :
                    la section « Votre demande » le présélectionne à l'arrivée. */}
                <Link
                  href={`?besoin=${encodeURIComponent(p.id)}#projet`}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
                  style={{ color: 'var(--sv-brand)' }}
                >
                  {p.ctaLabel}
                  <span aria-hidden="true" style={{ color: 'var(--sv-accent)' }}>
                    →
                  </span>
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-6 rounded-md px-5 py-6 sm:px-7" style={{ background: 'var(--sv-paper-soft)', border: '1px solid var(--sv-line)' }}>
          <h3
            className="text-[11px] font-medium uppercase tracking-[0.18em]"
            style={{ color: 'var(--sv-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}
          >
            Également au catalogue
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {others.map((p) => (
              <div key={p.id}>
                <h4 className="text-base font-semibold" style={{ color: 'var(--sv-ink)' }}>
                  {p.title}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--sv-body)' }}>
                  {p.description}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--sv-muted)' }}>
                  Ex. : {p.examples.join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
