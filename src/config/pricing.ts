// Source de vérité unique pour les prix affichés (page tarifs, accueil, add-on).
// Les plans Agence restent "sur devis" et ne sont pas concernés par les
// réductions annuelles automatiques ci-dessous.

export type BillingModeKey = 'monthly' | 'annualOneShot';

export const BILLING_MODES: Record<BillingModeKey, {
  label: string;
  shortLabel: string;
  discount: number;
  commitmentMonths: number;
}> = {
  monthly: {
    label: 'Sans engagement — Facturation mensuelle',
    shortLabel: 'Mensuel',
    discount: 0,
    commitmentMonths: 0,
  },
  annualOneShot: {
    label: '15 % d’économie — Engagement 12 mois',
    shortLabel: 'Annuel',
    discount: 0.15,
    commitmentMonths: 12,
  },
};

export type PricingPlanKey = 'essentiel' | 'performance';

export const PLAN_BASE_MONTHLY_PRICE: Record<PricingPlanKey, number> = {
  essentiel: 149,
  performance: 249,
};

const roundEuro = (value: number) => Math.round(value);

export function getMonthlyPriceForMode(plan: PricingPlanKey, mode: BillingModeKey): number {
  const base = PLAN_BASE_MONTHLY_PRICE[plan];
  const discount = BILLING_MODES[mode].discount;

  return roundEuro(base * (1 - discount));
}

export function getAnnualOneShotPrice(plan: PricingPlanKey, mode: BillingModeKey): number {
  const base = PLAN_BASE_MONTHLY_PRICE[plan];
  const discount = BILLING_MODES[mode].discount;

  return roundEuro(base * 12 * (1 - discount));
}

/**
 * Prix annuel plein tarif avant remise (ex: 1 788 € pour Essentiel),
 * utilisé pour l'affichage barré aux côtés du prix annuel remisé.
 */
export function getAnnualFullPrice(plan: PricingPlanKey): number {
  const base = PLAN_BASE_MONTHLY_PRICE[plan];
  return roundEuro(base * 12);
}

export const formatEuro = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Phrase d'affichage présentant l'équivalent annuel remisé du plan,
 * affichée sous le prix mensuel pour mettre en avant l'économie.
 * Ex: "1 519,80 €/an • 15 % d'économie"
 */
export function getAnnualPitchLabel(plan: PricingPlanKey): string {
  const monthly = PLAN_BASE_MONTHLY_PRICE[plan];
  const annual = monthly * 12 * (1 - BILLING_MODES.annualOneShot.discount);

  return `${formatEuro(annual)} €/an • 15 % d’économie`;
}

export const WEBSITE_ADDON = {
  availableForPlans: ['essentiel', 'performance'] as PricingPlanKey[],
  headline: 'Site vitrine connecté à Kadria',
  positioning:
    'Un mini-site vitrine connecté à Kadria pour rassurer vos prospects et transformer votre présence en ligne en demandes qualifiées.',
  oneShot: {
    price: 300,
    label: '+300 € HT une fois',
    description: 'Disponible en option sur Essentiel et Performance — inclus dans Agence.',
    commitmentMonths: 0,
  },
  features: [
    'Mini-site vitrine 3 pages',
    'Intégration du widget/assistant Kadria',
    "Formulaire ou point d'entrée vers Kadria",
    "Accompagnement domaine/hébergement",
    'Maintenance incluse',
    '2 modifications par mois',
    'Local SEO et contenu de base',
  ],
  smallPrintNote:
    "Photos, nom de domaine et hébergement à la charge de l'artisan si nécessaire, avec accompagnement Kadria.",
  checkoutMention: 'Vous pourrez ajouter le site vitrine au moment du paiement.',
  agencyNote: 'Inclus dans Agence (logique sur mesure).',
};
