import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { Section } from './SectionShell'
import { Reveal } from './motion'
import { SchematicVisual } from './SchematicVisual'

/**
 * Étude de cas détaillée (borne 7 kW pour AD Électricité) : déroulé
 * chronologique numéroté + cartouche technique (délai, budget indicatif),
 * sur fond nuit pour marquer le temps fort de la page.
 */
export function CaseStudy({ config }: { config: SiteVitrineConfig }) {
  const cs = config.caseStudy

  return (
    <Section index="02" eyebrow={cs.eyebrow} title={cs.title} intro={cs.context} tone="night">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
        <Reveal>
          <ol>
            {cs.steps.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-[2.25rem_1fr] gap-x-4 py-5"
                style={{ borderTop: '1px solid var(--sv-line-dark)' }}
              >
                <span
                  className="text-sm tabular-nums leading-6"
                  style={{ color: 'var(--sv-accent)', fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: '#f6f5f1' }}>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(246,245,241,0.72)' }}>
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="flex h-full flex-col gap-5">
            <SchematicVisual variant="borne" label="Schéma d’implantation" className="min-h-52 rounded-md" />
            <div className="rounded-md p-5" style={{ border: '1px solid var(--sv-line-dark)' }}>
              <p className="text-sm" style={{ color: 'rgba(246,245,241,0.65)' }}>
                {cs.location}
              </p>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}
                  >
                    Délai constaté
                  </dt>
                  <dd className="mt-1 text-base font-semibold" style={{ color: '#f6f5f1' }}>
                    {cs.duration}
                  </dd>
                </div>
                <div>
                  <dt
                    className="text-[11px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}
                  >
                    Budget indicatif (démonstration)
                  </dt>
                  <dd className="mt-1 text-base font-semibold" style={{ color: '#f6f5f1' }}>
                    {cs.budget}
                  </dd>
                  <dd className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(246,245,241,0.55)' }}>
                    {cs.budgetNote}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
