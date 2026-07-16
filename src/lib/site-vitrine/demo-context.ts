import type { SiteVitrineConfig } from './types'
import { adElectricite } from './configs/ad-electricite'

/**
 * Lecture — côté parcours de DÉMONSTRATION uniquement — des paramètres de
 * tracking posés par les sites vitrines (`source`, `site`, `trade`, `need`).
 *
 * Contrat V1 (voir docs/SITE_VITRINE_ADDON.md) :
 * - ne s'applique QUE si `demoMode=true` ET `source=site_vitrine_demo` ;
 * - sert uniquement à précontextualiser l'accueil du parcours `/projet`
 *   (nom du site d'origine, besoin annoncé) — aucun dossier réel n'est créé,
 *   aucun tenant n'est résolu, rien n'est persisté ;
 * - toute valeur inconnue (site absent du registre, besoin non listé,
 *   paramètre malformé) est silencieusement ignorée : le parcours retombe
 *   sur son accueil générique.
 *
 * Le raccordement production (résolution d'un vrai artisan à partir de
 * `site`/`trade`, attribution du lead) reste un chantier futur documenté,
 * volontairement hors de ce module.
 */

/** Registre des sites vitrines connus du démonstrateur. */
const DEMO_SITES: Record<string, SiteVitrineConfig> = {
  [adElectricite.slug]: adElectricite,
}

export const SITE_VITRINE_DEMO_SOURCE = 'site_vitrine_demo'

export type SiteVitrineDemoContext = {
  /** Nom commercial du site d'origine (ex. « AD Électricité »). */
  siteName: string
  /** Couleur de marque du site d'origine, pour teinter le parcours. */
  brandColor: string
  /** Libellé du besoin choisi sur le site vitrine, si reconnu. */
  needLabel: string | null
  /** Message d'accueil précontextualisé pour l'assistant. */
  welcomeMessage: string
}

export function getSiteVitrineDemoContext(params: {
  source: string | null
  site: string | null
  need: string | null
}): SiteVitrineDemoContext | null {
  if (params.source !== SITE_VITRINE_DEMO_SOURCE) return null
  const config = params.site ? DEMO_SITES[params.site] : undefined
  if (!config) return null

  const needLabel =
    config.projectIntake.needs.find((n) => n.id === params.need)?.label ?? null

  const welcomeMessage = needLabel
    ? `Vous arrivez du site ${config.identity.name}, où vous avez indiqué : « ${needLabel.toLowerCase()} ». Choisissez l'option qui s'en rapproche — ou une autre si votre besoin a changé.`
    : `Vous arrivez du site ${config.identity.name}. Choisissez l'option la plus proche de votre besoin, vous pourrez préciser ensuite.`

  return {
    siteName: config.identity.name,
    brandColor: config.theme.brand,
    needLabel,
    welcomeMessage,
  }
}
