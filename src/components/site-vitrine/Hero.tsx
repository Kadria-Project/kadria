import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Reveal } from './motion'
import { SchematicVisual } from './SchematicVisual'

/**
 * Hero éditorial asymétrique : grande composition typographique à gauche,
 * colonne technique étroite à droite (spécialités + schéma), séparées par
 * un filet vertical — évoque la marge d'un plan d'exécution.
 */
export function Hero({ config }: { config: SiteVitrineConfig }) {
  const { hero, identity, isDemo } = config

  return (
    <section id="haut" aria-label="Présentation" style={{ background: 'var(--sv-paper)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        {isDemo ? (
          <p
            className="mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{
              border: '1px solid var(--sv-line)',
              color: 'var(--sv-muted)',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--sv-accent)' }} />
            Site de démonstration — entreprise fictive
          </p>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-0">
          {/* Colonne éditoriale */}
          <div className="lg:pr-12">
            <Reveal>
              <p
                className="mb-4 text-xs font-medium uppercase tracking-[0.2em]"
                style={{ color: 'var(--sv-brand)', fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                {hero.eyebrow}
              </p>
              <h1
                className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ color: 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}
              >
                {hero.title[0]}
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">{hero.title[1]}</span>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 right-0 h-[3px]"
                    style={{ background: 'var(--sv-accent)' }}
                  />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--sv-body)' }}>
                {hero.subtitle}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#projet"
                  className="inline-flex min-h-12 items-center justify-center rounded-md px-6 py-3 text-base font-semibold text-white"
                  style={{ background: 'var(--sv-accent)' }}
                >
                  {hero.primaryCta}
                </a>
                <a
                  href="#realisations"
                  className="inline-flex min-h-12 items-center justify-center rounded-md px-6 py-3 text-base font-semibold"
                  style={{ border: '1px solid var(--sv-night)', color: 'var(--sv-night)' }}
                >
                  {hero.secondaryCta}
                </a>
              </div>
              <ul className="mt-8 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6" style={{ color: 'var(--sv-body)' }}>
                {hero.reassurance.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1 w-4" style={{ background: 'var(--sv-brand)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Colonne technique */}
          <Reveal delay={0.22} className="lg:h-full">
            <div
              className="flex h-full flex-col gap-5 lg:border-l lg:pl-10"
              style={{ borderColor: 'var(--sv-line)' }}
            >
              <SchematicVisual
                variant="hero"
                label="Schéma — borne 7 kW"
                className="hidden rounded-md lg:block lg:min-h-56 lg:flex-1"
              />
              <div>
                <p
                  className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: 'var(--sv-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {hero.specialty.label}
                </p>
                <ul className="text-sm" style={{ color: 'var(--sv-ink)' }}>
                  {hero.specialty.items.map((item, i) => (
                    <li
                      key={item}
                      className="flex items-baseline gap-3 py-2.5"
                      style={{ borderTop: '1px solid var(--sv-line)' }}
                    >
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: 'var(--sv-accent)', fontFamily: 'var(--font-geist-mono), monospace' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--sv-muted)' }}>
                  {identity.city} et communes environnantes — rayon d’environ 25 km.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
