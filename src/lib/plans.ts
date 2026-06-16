export const PLAN_KEYS = ['essentiel', 'performance', 'entreprise'] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_FEATURES = {
  leadCapture: {
    label: 'Capture et qualification des demandes',
    description: 'Widget prospect, qualification IA et suivi des opportunites.',
    requiredPlan: 'essentiel',
  },
  devis: {
    label: 'Creation et envoi des devis',
    description: 'Generation des devis et suivi des opportunites.',
    requiredPlan: 'essentiel',
  },
  calendar: {
    label: 'Calendrier et relances',
    description: 'Calendrier commercial, relances et rendez-vous centralises.',
    requiredPlan: 'performance',
  },
  pdfExports: {
    label: 'Exports PDF',
    description: 'Exports PDF des dossiers et rapports mensuels.',
    requiredPlan: 'performance',
  },
  pricingCatalog: {
    label: 'Bibliotheque de prestations',
    description: 'Catalogue reutilisable de prestations pour accelerer les devis.',
    requiredPlan: 'performance',
  },
  dashboardReports: {
    label: 'Rapports avances',
    description: 'Rapports commerciaux et indicateurs enrichis.',
    requiredPlan: 'performance',
  },
  voiceAssistant: {
    label: 'Assistant vocal',
    description: 'Qualification et traitement via assistant vocal.',
    requiredPlan: 'entreprise',
  },
  teamWorkspace: {
    label: 'Fonctionnalites equipe',
    description: 'Usage avance pour structures multi-collaborateurs.',
    requiredPlan: 'entreprise',
  },
} as const satisfies Record<string, {
  label: string;
  description: string;
  requiredPlan: PlanKey;
}>;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;

export const PLAN_DEFINITIONS: Record<PlanKey, {
  label: string;
  rank: number;
  billingKey: string;
  features: readonly PlanFeatureKey[];
}> = {
  essentiel: {
    label: 'Essentiel',
    rank: 0,
    billingKey: 'essentiel',
    features: ['leadCapture', 'devis'],
  },
  performance: {
    label: 'Performance',
    rank: 1,
    billingKey: 'performance',
    features: ['leadCapture', 'devis', 'calendar', 'pdfExports', 'pricingCatalog', 'dashboardReports'],
  },
  entreprise: {
    label: 'Entreprise',
    rank: 2,
    billingKey: 'entreprise',
    features: ['leadCapture', 'devis', 'calendar', 'pdfExports', 'pricingCatalog', 'dashboardReports', 'voiceAssistant', 'teamWorkspace'],
  },
};

export function normalizePlan(plan?: string | null): PlanKey {
  const value = String(plan || '').trim().toLowerCase();

  if (value === 'performance' || value === 'pro') return 'performance';
  if (value === 'entreprise' || value === 'agence' || value === 'agency') return 'entreprise';
  if (value === 'essentiel' || value === 'starter') return 'essentiel';

  return 'essentiel';
}

export function getPlanLabel(plan?: string | null): string {
  return PLAN_DEFINITIONS[normalizePlan(plan)].label;
}

export function getRequiredPlanForFeature(feature: PlanFeatureKey): PlanKey {
  return PLAN_FEATURES[feature].requiredPlan;
}

export function isPlanAtLeast(plan: string | null | undefined, requiredPlan: PlanKey): boolean {
  return PLAN_DEFINITIONS[normalizePlan(plan)].rank >= PLAN_DEFINITIONS[requiredPlan].rank;
}

export function hasFeature(plan: string | null | undefined, feature: PlanFeatureKey): boolean {
  return isPlanAtLeast(plan, getRequiredPlanForFeature(feature));
}
