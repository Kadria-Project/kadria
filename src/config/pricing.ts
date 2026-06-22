// Source de vérité unique pour les prix affichés (page tarifs, accueil, add-on).
// Les plans Agence restent "sur devis" et ne sont pas concernés par les
// réductions annuelles automatiques ci-dessous.

export type BillingModeKey = 'monthly' | 'annualMonthly' | 'annualOneShot';

export const BILLING_MODES: Record<BillingModeKey, {
  label: string;
  shortLabel: string;
  discount: number;
  commitmentMonths: number;
}> = {
  monthly: {
    label: 'Mensuel — sans engagement',
    shortLabel: 'Mensuel',
    discount: 0,
    commitmentMonths: 0,
  },
  annualMonthly: {
    label: 'Payable mensuellement — engagement 12 mois — -15%',
    shortLabel: 'Annuel mensualisé',
    discount: 0.15,
    commitmentMonths: 12,
  },
  annualOneShot: {
    label: 'Paiement annuel en une fois — -15%',
    shortLabel: 'Annuel comptant',
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

export const WEBSITE_ADDON = {
  availableForPlans: ['essentiel', 'performance'] as PricingPlanKey[],
  oneShot: {
    price: 300,
    label: '300 € une fois',
    description: 'Site vitrine livré clé en main — 300 € une fois, site acquis. Abonnement Kadria facturé séparément.',
    commitmentMonths: 0,
  },
  monthly: {
    price: 50,
    commitmentMonths: 6,
    label: '50 €/mois',
    description: 'Site vitrine en mensualité — 50 €/mois avec engagement 6 mois. Abonnement Kadria facturé séparément.',
  },
  agencyNote: 'Site vitrine inclus avec l’offre Agence (logique sur mesure).',
};
