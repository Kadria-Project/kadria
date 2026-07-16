import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'
import { SchematicVisual } from './SchematicVisual'

/**
 * Galerie de réalisations : fiches chantier avec schéma éditorial en
 * attendant les photos réelles (voir docs/SITE_VITRINE_MEDIAS.md).
 * Rythme volontairement irrégulier (première fiche large) pour éviter la
 * grille uniforme.
 */
export function Gallery({ config }: { config: SiteVitrineConfig }) {
  const { gallery } = config
  const [first, ...rest] = gallery.items

  return (
    <Section id="realisations" index="03" eyebrow="Réalisations" title={gallery.title} intro={gallery.intro} tone="soft">
      <div className="grid gap-6">
        {first ? (
          <Reveal>
            <article
              className="grid overflow-hidden rounded-md sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              style={{ background: 'var(--sv-paper)', border: '1px solid var(--sv-line)' }}
            >
              <SchematicVisual variant={first.visual} className="min-h-44" />
              <div className="p-6 sm:p-8">
                <CardMeta category={first.category} location={first.location} />
                <h3 className="mt-2 text-xl font-bold tracking-tight" style={{ color: 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}>
                  {first.title}
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--sv-muted)' }}>
                  {first.context}
                </p>
                <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--sv-body)' }}>
                  {first.description}
                </p>
              </div>
            </article>
          </Reveal>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i * 0.05, 0.2)} className="h-full">
              <article
                className="flex h-full flex-col overflow-hidden rounded-md"
                style={{ background: 'var(--sv-paper)', border: '1px solid var(--sv-line)' }}
              >
                <SchematicVisual variant={item.visual} className="h-36" />
                <div className="flex flex-1 flex-col p-5">
                  <CardMeta category={item.category} location={item.location} />
                  <h3 className="mt-2 text-base font-bold" style={{ color: 'var(--sv-ink)' }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: 'var(--sv-muted)' }}>
                    {item.context}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--sv-body)' }}>
                    {item.description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

function CardMeta({ category, location }: { category: string; location: string }) {
  return (
    <p
      className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium uppercase tracking-[0.14em]"
      style={{ color: 'var(--sv-brand)', fontFamily: 'var(--font-geist-mono), monospace' }}
    >
      {category}
      <span aria-hidden="true" style={{ color: 'var(--sv-line)' }}>
        /
      </span>
      <span style={{ color: 'var(--sv-muted)' }}>{location}</span>
    </p>
  )
}
