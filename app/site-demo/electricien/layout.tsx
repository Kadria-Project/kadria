import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'

/**
 * Layout du démonstrateur « Site vitrine artisan ».
 *
 * Typo d'affichage propre au site vitrine (Archivo — géométrique, technique,
 * distincte de l'identité Kadria), exposée en `--font-sv-display`.
 *
 * SEO : entreprise fictive ⇒ `noindex, nofollow`, aucune donnée structurée
 * LocalBusiness (voir docs/SITE_VITRINE_ADDON.md pour la stratégie des
 * futurs vrais sites clients). La page n'est pas ajoutée au sitemap.
 */

const displayFont = Archivo({
  variable: '--font-sv-display',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AD Électricité — Électricien à Reims (site de démonstration Kadria)',
  description:
    'Démonstration de site vitrine artisan conçu avec Kadria : AD Électricité, électricien fictif à Reims — dépannage, rénovation, tableau, borne de recharge.',
  alternates: { canonical: '/site-demo/electricien' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'AD Électricité — site vitrine de démonstration Kadria',
    description:
      'Exemple de site vitrine artisan connecté au parcours de demande Kadria. Entreprise fictive, données de démonstration.',
    url: 'https://kadria.fr/site-demo/electricien',
    siteName: 'Kadria',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function SiteDemoElectricienLayout({ children }: { children: React.ReactNode }) {
  return <div className={displayFont.variable}>{children}</div>
}
