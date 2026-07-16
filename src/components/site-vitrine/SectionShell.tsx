import type { ReactNode } from 'react'
import { Reveal } from './motion'

/** Conteneur de section avec en-tête éditorial numéroté, façon cartouche de plan. */
export function Section({
  id,
  index,
  eyebrow,
  title,
  intro,
  tone = 'paper',
  children,
}: {
  id?: string
  index: string
  eyebrow: string
  title: string
  intro?: string
  tone?: 'paper' | 'soft' | 'night'
  children: ReactNode
}) {
  const isNight = tone === 'night'
  const bg = tone === 'paper' ? 'var(--sv-paper)' : tone === 'soft' ? 'var(--sv-paper-soft)' : 'var(--sv-night)'
  const line = isNight ? 'var(--sv-line-dark)' : 'var(--sv-line)'

  return (
    <section id={id} className="scroll-mt-20" style={{ background: bg, borderTop: `1px solid ${line}` }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <div className="mb-10 max-w-2xl lg:mb-14">
            <p
              className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{
                color: isNight ? 'rgba(246,245,241,0.6)' : 'var(--sv-muted)',
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              <span style={{ color: 'var(--sv-accent)' }}>{index}</span>
              <span aria-hidden="true" className="h-px w-8" style={{ background: 'var(--sv-accent)' }} />
              {eyebrow}
            </p>
            <h2
              className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              style={{ color: isNight ? '#f6f5f1' : 'var(--sv-ink)', fontFamily: 'var(--font-sv-display)' }}
            >
              {title}
            </h2>
            {intro ? (
              <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: isNight ? 'rgba(246,245,241,0.75)' : 'var(--sv-body)' }}>
                {intro}
              </p>
            ) : null}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  )
}

/** Bouton principal (accent chaud). */
export function AccentLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-md px-6 py-3 text-base font-semibold text-white transition-colors ${className}`}
      style={{ background: 'var(--sv-accent)' }}
    >
      {children}
    </a>
  )
}
