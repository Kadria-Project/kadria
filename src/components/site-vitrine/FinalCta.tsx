import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Reveal } from './motion'

/** CTA final sur fond nuit, centré, récapitulant le bénéfice de la demande en ligne. */
export function FinalCta({ config }: { config: SiteVitrineConfig }) {
  const { finalCta } = config

  return (
    <section aria-label="Décrire votre projet" style={{ background: 'var(--sv-night)', borderTop: '1px solid var(--sv-line-dark)' }}>
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <Reveal>
          <h2
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            style={{ color: '#f6f5f1', fontFamily: 'var(--font-sv-display)' }}
          >
            {finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'rgba(246,245,241,0.75)' }}>
            {finalCta.text}
          </p>
          <a
            href="#projet"
            className="mt-8 inline-flex min-h-13 items-center justify-center rounded-md px-8 py-3.5 text-base font-semibold text-white"
            style={{ background: 'var(--sv-accent)' }}
          >
            {finalCta.cta}
          </a>
          <ul className="mt-6 flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center sm:gap-6" style={{ color: 'rgba(246,245,241,0.6)' }}>
            {finalCta.bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-4" style={{ background: 'var(--sv-accent)' }} />
                {bullet}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
