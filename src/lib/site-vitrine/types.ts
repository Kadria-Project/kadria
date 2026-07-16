/**
 * Site vitrine artisan — configuration fortement typée.
 *
 * Un site vitrine = une `SiteVitrineConfig`. Le démonstrateur AD Électricité
 * vit dans `configs/ad-electricite.ts`. Pour décliner un autre métier
 * (plombier, paysagiste, menuisier…), on crée une nouvelle config sans
 * toucher aux composants de `src/components/site-vitrine/`.
 *
 * Volontairement PAS de plateforme multi-sites ici : pas de résolution par
 * sous-domaine, pas de stockage en base. La config est du code TypeScript,
 * versionnée, ce qui suffit pour la V1 démonstrateur. Le passage à une
 * config pilotée depuis Kadria est documenté dans docs/SITE_VITRINE_ADDON.md.
 */

/** Palette et matières du site. Valeurs hex explicites, injectées en
 *  variables CSS scopées `--sv-*` sur le wrapper du site (jamais les
 *  variables du dashboard Kadria). */
export type SiteTheme = {
  /** Fond de page principal (clair). */
  paper: string
  /** Fond alternatif pour sections contrastées claires. */
  paperSoft: string
  /** Couleur d'encre principale (titres, textes forts). */
  ink: string
  /** Texte courant. */
  body: string
  /** Texte secondaire / légendes. */
  muted: string
  /** Couleur de marque profonde (fonds sombres, header, footer). */
  night: string
  /** Variante plus claire de la marque (liens, filets, tags). */
  brand: string
  /** Accent chaud, utilisé avec parcimonie (CTA, soulignés). */
  accent: string
  /** Accent chaud au survol / état actif. */
  accentStrong: string
  /** Filets / séparations sur fond clair. */
  line: string
  /** Filets / séparations sur fond sombre. */
  lineOnDark: string
}

export type NavLink = { label: string; href: string }

export type Prestation = {
  id: string
  title: string
  /** Poids éditorial : les prestations "lead" ont un traitement large. */
  emphasis: 'lead' | 'standard'
  description: string
  examples: string[]
  ctaLabel: string
}

export type CaseStudyStep = { title: string; detail: string }

export type CaseStudy = {
  eyebrow: string
  title: string
  location: string
  context: string
  steps: CaseStudyStep[]
  duration: string
  budget: string
  budgetNote: string
}

export type Realisation = {
  id: string
  title: string
  category: string
  location: string
  context: string
  description: string
  /** Motif du placeholder éditorial en attendant les vraies photos. */
  visual: 'tableau' | 'eclairage-int' | 'eclairage-ext' | 'borne' | 'normes' | 'renovation'
}

export type MethodStep = { title: string; detail: string }

export type Review = {
  author: string
  location: string
  project: string
  text: string
}

export type FaqItem = { question: string; answer: string }

export type ZoneGroup = { label: string; communes: string[] }

export type OpeningHours = { days: string; hours: string }

export type ProjectIntakeNeed = { id: string; label: string }

export type ProjectIntake = {
  title: string
  subtitle: string
  needs: ProjectIntakeNeed[]
  collected: string[]
  /** Route du parcours Kadria (mode démo). */
  formPath: string
  /** Paramètres de tracking ajoutés à l'URL du parcours. */
  tracking: Record<string, string>
  demoNotice: string
}

export type SectionFlags = {
  trustBand: boolean
  prestations: boolean
  caseStudy: boolean
  gallery: boolean
  method: boolean
  projectIntake: boolean
  zone: boolean
  reviews: boolean
  faq: boolean
  finalCta: boolean
}

export type SiteVitrineConfig = {
  /** Identifiant technique (tracking, futur multi-sites). */
  slug: string
  trade: string
  /** Marqueur affiché discrètement : ce site est une démonstration. */
  isDemo: boolean
  identity: {
    name: string
    /** Découpage typographique du logo texte, ex: ["AD", "Électricité"]. */
    wordmark: [string, string]
    tagline: string
    city: string
    /** Téléphone de démonstration, clairement neutralisé. */
    phoneDisplay: string
    phoneNote: string
    email: string
    address: string
  }
  theme: SiteTheme
  nav: NavLink[]
  hero: {
    eyebrow: string
    title: [string, string]
    subtitle: string
    primaryCta: string
    secondaryCta: string
    reassurance: string[]
    specialty: { label: string; items: string[] }
  }
  trust: { title: string; commitments: { title: string; detail: string }[] }
  prestations: { title: string; intro: string; items: Prestation[] }
  caseStudy: CaseStudy
  gallery: { title: string; intro: string; items: Realisation[] }
  method: { title: string; intro: string; steps: MethodStep[] }
  projectIntake: ProjectIntake
  zone: {
    title: string
    intro: string
    center: string
    groups: ZoneGroup[]
    note: string
  }
  reviews: { title: string; disclaimer: string; items: Review[] }
  faq: { title: string; intro: string; items: FaqItem[] }
  finalCta: { title: string; text: string; bullets: string[]; cta: string }
  footer: {
    hours: OpeningHours[]
    legalNote: string
    privacyNote: string
    demoCredit: string
  }
  sections: SectionFlags
}
