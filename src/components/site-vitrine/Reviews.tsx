import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'

/**
 * Avis clients : citations éditoriales, explicitement présentées comme des
 * exemples de démonstration. Aucune référence à Google ni à une plateforme
 * d'avis. Le composant est prêt à recevoir de vrais retours clients via la
 * config (`reviews.items` + suppression du disclaimer côté config).
 */
export function Reviews({ config }: { config: SiteVitrineConfig }) {
  const { reviews } = config

  return (
    <Section index="07" eyebrow="Retours clients" title={reviews.title} intro={reviews.disclaimer}>
      <div className="grid gap-6 lg:grid-cols-3">
        {reviews.items.map((review, i) => (
          <Reveal key={review.author} delay={Math.min(i * 0.06, 0.2)} className="h-full">
            <figure
              className="flex h-full flex-col justify-between rounded-md p-6"
              style={{ background: 'var(--sv-paper-soft)', border: '1px solid var(--sv-line)' }}
            >
              <blockquote className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--sv-ink)' }}>
                <span aria-hidden="true" className="mb-3 block h-[3px] w-8" style={{ background: 'var(--sv-accent)' }} />
                {review.text}
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold" style={{ color: 'var(--sv-night)' }}>
                  {review.author}
                </span>
                <span style={{ color: 'var(--sv-muted)' }}>
                  {' — '}
                  {review.location} · {review.project}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
