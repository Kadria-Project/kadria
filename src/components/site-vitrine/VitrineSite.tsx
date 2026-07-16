import { Suspense } from 'react'
import type { SiteVitrineConfig } from '@/src/lib/site-vitrine/types'
import { themeToCssVars, buildIntakeUrl } from '@/src/lib/site-vitrine/theme'
import { SiteHeader } from './SiteHeader'
import { Hero } from './Hero'
import { TrustBand } from './TrustBand'
import { Prestations } from './Prestations'
import { CaseStudy } from './CaseStudy'
import { Gallery } from './Gallery'
import { Method } from './Method'
import { ProjectIntake } from './ProjectIntake'
import { Zone } from './Zone'
import { Reviews } from './Reviews'
import { Faq } from './Faq'
import { FinalCta } from './FinalCta'
import { SiteFooter } from './SiteFooter'

/**
 * Assemble un site vitrine complet à partir d'une `SiteVitrineConfig`.
 * Les sections sont activables/désactivables via `config.sections`, et le
 * thème est injecté en variables CSS `--sv-*` sur le wrapper — aucun style
 * Kadria n'est hérité (le fond sombre global est écrasé ici).
 */
export function VitrineSite({ config }: { config: SiteVitrineConfig }) {
  const s = config.sections
  // Pas de `need` : depuis le header, le visiteur n'a encore rien choisi.
  const headerCta = buildIntakeUrl(config.projectIntake.formPath, config.projectIntake.tracking)

  return (
    <div
      className="min-h-screen antialiased"
      style={{
        ...themeToCssVars(config.theme),
        background: 'var(--sv-paper)',
        color: 'var(--sv-body)',
        fontFamily: 'var(--font-inter), var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        style={{ background: 'var(--sv-night)' }}
      >
        Aller au contenu
      </a>
      <SiteHeader
        wordmark={config.identity.wordmark}
        tagline={config.identity.tagline}
        nav={config.nav}
        phoneDisplay={config.identity.phoneDisplay}
        phoneNote={config.identity.phoneNote}
        ctaLabel={config.hero.primaryCta}
        ctaHref={headerCta}
      />
      <main id="contenu">
        <Hero config={config} />
        {s.trustBand ? <TrustBand config={config} /> : null}
        {s.prestations ? <Prestations config={config} /> : null}
        {s.caseStudy ? <CaseStudy config={config} /> : null}
        {s.gallery ? <Gallery config={config} /> : null}
        {s.method ? <Method config={config} /> : null}
        {/* Suspense : ProjectIntake lit `?besoin=` via useSearchParams. */}
        {s.projectIntake ? (
          <Suspense fallback={null}>
            <ProjectIntake config={config} />
          </Suspense>
        ) : null}
        {s.zone ? <Zone config={config} /> : null}
        {s.reviews ? <Reviews config={config} /> : null}
        {s.faq ? <Faq config={config} /> : null}
        {s.finalCta ? <FinalCta config={config} /> : null}
      </main>
      <SiteFooter config={config} />
    </div>
  )
}
