import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'

/**
 * FAQ accessible sans JavaScript : <details>/<summary> natifs, stylés.
 * Clavier et lecteurs d'écran fonctionnent d'office.
 */
export function Faq({ config }: { config: SiteVitrineConfig }) {
  const { faq } = config

  return (
    <Section id="faq" index="08" eyebrow="FAQ" title={faq.title} intro={faq.intro} tone="soft">
      <Reveal>
        <div className="mx-auto max-w-3xl">
          {faq.items.map((item) => (
            <details
              key={item.question}
              className="group"
              style={{ borderTop: '1px solid var(--sv-line)' }}
            >
              <summary
                className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden"
                style={{ color: 'var(--sv-ink)' }}
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45"
                  style={{ color: 'var(--sv-accent)' }}
                >
                  +
                </span>
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--sv-body)' }}>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
