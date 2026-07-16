import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'

export function SiteFooter({ config }: { config: SiteVitrineConfig }) {
  const { identity, footer, prestations, zone } = config
  const leadPrestations = prestations.items.filter((p) => p.emphasis === 'lead')

  return (
    <footer style={{ background: 'var(--sv-night)', borderTop: '2px solid var(--sv-accent)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight" style={{ color: '#f6f5f1', fontFamily: 'var(--font-sv-display)' }}>
              {identity.wordmark[0]}
              <span aria-hidden="true" style={{ color: 'var(--sv-accent)' }}>
                ⌁
              </span>
              {identity.wordmark[1]}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(246,245,241,0.65)' }}>
              {identity.tagline}
            </p>
            <address className="mt-4 space-y-1 text-sm not-italic" style={{ color: 'rgba(246,245,241,0.65)' }}>
              <p>{identity.address}</p>
              <p className="tabular-nums">
                {identity.phoneDisplay}
                <span className="block text-xs" style={{ color: 'rgba(246,245,241,0.45)' }}>
                  {identity.phoneNote}
                </span>
              </p>
              <p>{identity.email}</p>
            </address>
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}>
              Prestations
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {leadPrestations.map((p) => (
                <li key={p.id}>
                  <a href="#prestations" className="hover:underline" style={{ color: 'rgba(246,245,241,0.75)' }}>
                    {p.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#prestations" className="hover:underline" style={{ color: 'rgba(246,245,241,0.55)' }}>
                  Toutes les prestations
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}>
              Zone d’intervention
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(246,245,241,0.75)' }}>
              {zone.center} et communes environnantes —{' '}
              <a href="#zone" className="underline underline-offset-2" style={{ color: 'rgba(246,245,241,0.75)' }}>
                voir le détail
              </a>
            </p>
            <h2 className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}>
              Horaires
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm" style={{ color: 'rgba(246,245,241,0.75)' }}>
              {footer.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4">
                  <dt>{h.days}</dt>
                  <dd className="tabular-nums" style={{ color: 'rgba(246,245,241,0.6)' }}>
                    {h.hours}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(246,245,241,0.5)', fontFamily: 'var(--font-geist-mono), monospace' }}>
              Mentions
            </h2>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'rgba(246,245,241,0.55)' }}>
              {footer.legalNote}
            </p>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: 'rgba(246,245,241,0.55)' }}>
              {footer.privacyNote}
            </p>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid var(--sv-line-dark)', color: 'rgba(246,245,241,0.5)' }}
        >
          <p>
            © {new Date().getFullYear()} {identity.name} — entreprise fictive de démonstration.
          </p>
          <p>
            <a href="https://kadria.fr" className="underline underline-offset-2" style={{ color: 'rgba(246,245,241,0.6)' }}>
              {footer.demoCredit}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
