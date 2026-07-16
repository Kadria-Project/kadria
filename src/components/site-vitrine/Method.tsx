import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'

/**
 * Méthode de travail : frise verticale en 5 étapes reliées par un trait
 * continu (façon schéma unifilaire), qui conduit au parcours de demande.
 */
export function Method({ config }: { config: SiteVitrineConfig }) {
  const { method } = config

  return (
    <Section id="methode" index="04" eyebrow="Méthode" title={method.title} intro={method.intro}>
      <div className="mx-auto max-w-3xl">
        <ol className="relative">
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-[13px] top-3 w-px"
            style={{ background: 'var(--sv-line)' }}
          />
          {method.steps.map((step, i) => (
            <Reveal key={step.title} delay={Math.min(i * 0.06, 0.25)}>
              <li className="relative grid grid-cols-[1.75rem_1fr] gap-x-5 pb-9">
                <span
                  className="z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                  style={{
                    background: i === 0 ? 'var(--sv-accent)' : 'var(--sv-paper)',
                    border: i === 0 ? '1px solid var(--sv-accent)' : '1px solid var(--sv-night)',
                    color: i === 0 ? '#ffffff' : 'var(--sv-night)',
                    fontFamily: 'var(--font-geist-mono), monospace',
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold leading-7 tracking-tight" style={{ color: 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--sv-body)' }}>
                    {step.detail}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <p className="pl-12 text-sm" style={{ color: 'var(--sv-muted)' }}>
            La première étape se fait juste en dessous — comptez 3 à 5 minutes.
          </p>
        </Reveal>
      </div>
    </Section>
  )
}
