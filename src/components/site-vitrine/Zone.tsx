import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'

/**
 * Zone d'intervention : carte stylisée légère (cercles concentriques SVG,
 * aucune dépendance carto ni clé externe) + listes de communes par couronne.
 */
export function Zone({ config }: { config: SiteVitrineConfig }) {
  const { zone } = config

  return (
    <Section id="zone" index="06" eyebrow="Secteur" title={zone.title} intro={zone.intro} tone="soft">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal>
          <div
            className="relative mx-auto aspect-square w-full max-w-xs rounded-md lg:max-w-none"
            style={{ background: 'var(--sv-night)' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {[30, 55, 82].map((r) => (
                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(246,245,241,0.22)" strokeWidth="1" strokeDasharray={r === 82 ? '3 5' : undefined} />
              ))}
              <line x1="100" y1="12" x2="100" y2="188" stroke="rgba(246,245,241,0.08)" strokeWidth="1" />
              <line x1="12" y1="100" x2="188" y2="100" stroke="rgba(246,245,241,0.08)" strokeWidth="1" />
              <circle cx="100" cy="100" r="4" fill="var(--sv-accent)" />
              <text x="100" y="90" textAnchor="middle" fill="#f6f5f1" fontSize="11" fontWeight="600" fontFamily="var(--font-sv-display), sans-serif">
                {zone.center}
              </text>
              <text x="100" y="163" textAnchor="middle" fill="rgba(246,245,241,0.55)" fontSize="8" fontFamily="var(--font-geist-mono), monospace">
                ~ 25 km
              </text>
            </svg>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div>
            {zone.groups.map((group) => (
              <div
                key={group.label}
                className="grid gap-2 py-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] sm:gap-6"
                style={{ borderTop: '1px solid var(--sv-line)' }}
              >
                <h3
                  className="text-[11px] font-medium uppercase leading-6 tracking-[0.16em]"
                  style={{ color: 'var(--sv-brand)', fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {group.label}
                </h3>
                <ul className="flex flex-wrap gap-x-2 gap-y-1.5 text-sm font-medium" style={{ color: 'var(--sv-ink)' }}>
                  {group.communes.map((commune, i) => (
                    <li key={commune} className="flex items-center gap-2">
                      {commune}
                      {i < group.communes.length - 1 ? (
                        <span aria-hidden="true" style={{ color: 'var(--sv-line)' }}>
                          ·
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="pt-4 text-sm" style={{ color: 'var(--sv-muted)' }}>
              {zone.note}
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
