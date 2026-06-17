export const PLAN_KEYS = ['essentiel', 'performance', 'entreprise'] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export const FEATURE_DEFINITIONS = {
  assistantWeb: {
    label: 'Assistant web',
    description: 'Assistant chat web 24h/24.',
    requiredPlan: 'essentiel',
  },
  aiQualification: {
    label: 'Qualification automatique',
    description: 'Qualification IA des demandes entrantes.',
    requiredPlan: 'essentiel',
  },
  aiScore: {
    label: 'Score IA',
    description: 'Score de qualification du dossier.',
    requiredPlan: 'essentiel',
  },
  aiSummary: {
    label: 'Resume IA',
    description: 'Resume exploitable du besoin client.',
    requiredPlan: 'essentiel',
  },
  tradeAdaptation: {
    label: 'Adaptation metier',
    description: 'Questions adaptees au metier de l artisan.',
    requiredPlan: 'essentiel',
  },
  listView: {
    label: 'Vue liste',
    description: 'Vue liste des dossiers commerciaux.',
    requiredPlan: 'essentiel',
  },
  simpleFilters: {
    label: 'Filtres simples',
    description: 'Recherche et filtres essentiels.',
    requiredPlan: 'essentiel',
  },
  projectSheets: {
    label: 'Fiches dossiers',
    description: 'Consultation des fiches dossiers.',
    requiredPlan: 'essentiel',
  },
  history: {
    label: 'Historique',
    description: 'Historique des echanges et activites.',
    requiredPlan: 'essentiel',
  },
  internalNotes: {
    label: 'Notes internes',
    description: 'Notes internes sur les dossiers.',
    requiredPlan: 'essentiel',
  },
  manualFollowups: {
    label: 'Relances manuelles',
    description: 'Suivi manuel des relances.',
    requiredPlan: 'essentiel',
  },
  csvExport: {
    label: 'Export CSV',
    description: 'Export CSV des dossiers.',
    requiredPlan: 'essentiel',
  },
  essentialKpis: {
    label: 'KPI essentiels',
    description: 'Indicateurs commerciaux de base.',
    requiredPlan: 'essentiel',
  },
  unlimitedProjects: {
    label: 'Dossiers illimites',
    description: 'Depassement de la limite de 50 dossiers par mois.',
    requiredPlan: 'performance',
  },
  kanbanView: {
    label: 'Vue Kanban',
    description: 'Vue Kanban du CRM commercial.',
    requiredPlan: 'performance',
  },
  advancedFilters: {
    label: 'Filtres avances',
    description: 'Filtres par budget, score, periode et source.',
    requiredPlan: 'performance',
  },
  advancedKpis: {
    label: 'KPI avances',
    description: 'Indicateurs avances et analyse commerciale enrichie.',
    requiredPlan: 'performance',
  },
  kpiTrends: {
    label: 'Tendances KPI',
    description: 'Evolution et tendances des indicateurs.',
    requiredPlan: 'performance',
  },
  commercialPipeline: {
    label: 'Pipeline commercial',
    description: 'Pilotage du pipeline commercial.',
    requiredPlan: 'performance',
  },
  geoProjects: {
    label: 'Chantiers geolocalises',
    description: 'Visualisation geographique des dossiers.',
    requiredPlan: 'performance',
  },
  topAiOpportunities: {
    label: 'Top opportunites IA',
    description: 'Classement IA des opportunites prioritaires.',
    requiredPlan: 'performance',
  },
  calendar: {
    label: 'Calendrier et rappels',
    description: 'Calendrier commercial, rappels et rendez-vous.',
    requiredPlan: 'performance',
  },
  quoteGeneration: {
    label: 'Generation de devis',
    description: 'Creation, generation PDF et envoi des devis.',
    requiredPlan: 'performance',
  },
  pdfExports: {
    label: 'Export PDF des dossiers',
    description: 'Export PDF des dossiers commerciaux.',
    requiredPlan: 'performance',
  },
  monthlyPdfReport: {
    label: 'Rapport mensuel PDF',
    description: 'Synthese mensuelle exportable en PDF.',
    requiredPlan: 'performance',
  },
  automaticFollowups: {
    label: 'Relances automatiques',
    description: 'Automatisation des relances commerciales.',
    requiredPlan: 'performance',
  },
  voiceAssistant: {
    label: 'Assistant vocal',
    description: 'Qualification par assistant vocal.',
    requiredPlan: 'performance',
  },
  prioritySupport: {
    label: 'Support prioritaire',
    description: 'Accompagnement prioritaire.',
    requiredPlan: 'performance',
  },
  pricingCatalog: {
    label: 'Bibliotheque de prestations',
    description: 'Catalogue reutilisable de prestations pour accelerer les devis.',
    requiredPlan: 'performance',
  },
  teamWorkspace: {
    label: 'Fonctionnalites equipe',
    description: 'Usage avance pour structures multi-collaborateurs.',
    requiredPlan: 'entreprise',
  },
  whiteLabel: {
    label: 'Marque blanche',
    description: 'Personnalisation avancee de la marque.',
    requiredPlan: 'entreprise',
  },
  apiAccess: {
    label: 'Acces API',
    description: 'Acces API pour integrations avancees.',
    requiredPlan: 'entreprise',
  },
  accountManager: {
    label: 'Account manager dedie',
    description: 'Accompagnement dedie pour reseaux et agences.',
    requiredPlan: 'entreprise',
  },
} as const satisfies Record<string, {
  label: string;
  description: string;
  requiredPlan: PlanKey;
}>;

export type PlanFeatureKey = keyof typeof FEATURE_DEFINITIONS;

export const PLAN_FEATURES = {
  essential: [
    'assistantWeb',
    'aiQualification',
    'aiScore',
    'aiSummary',
    'tradeAdaptation',
    'listView',
    'simpleFilters',
    'projectSheets',
    'history',
    'internalNotes',
    'manualFollowups',
    'csvExport',
    'essentialKpis',
  ],
  performance: [
    'assistantWeb',
    'aiQualification',
    'aiScore',
    'aiSummary',
    'tradeAdaptation',
    'listView',
    'simpleFilters',
    'projectSheets',
    'history',
    'internalNotes',
    'manualFollowups',
    'csvExport',
    'essentialKpis',
    'unlimitedProjects',
    'kanbanView',
    'advancedFilters',
    'advancedKpis',
    'kpiTrends',
    'commercialPipeline',
    'geoProjects',
    'topAiOpportunities',
    'calendar',
    'quoteGeneration',
    'pdfExports',
    'monthlyPdfReport',
    'automaticFollowups',
    'voiceAssistant',
    'prioritySupport',
    'pricingCatalog',
  ],
  agency: [
    'assistantWeb',
    'aiQualification',
    'aiScore',
    'aiSummary',
    'tradeAdaptation',
    'listView',
    'simpleFilters',
    'projectSheets',
    'history',
    'internalNotes',
    'manualFollowups',
    'csvExport',
    'essentialKpis',
    'unlimitedProjects',
    'kanbanView',
    'advancedFilters',
    'advancedKpis',
    'kpiTrends',
    'commercialPipeline',
    'geoProjects',
    'topAiOpportunities',
    'calendar',
    'quoteGeneration',
    'pdfExports',
    'monthlyPdfReport',
    'automaticFollowups',
    'voiceAssistant',
    'prioritySupport',
    'pricingCatalog',
    'teamWorkspace',
    'whiteLabel',
    'apiAccess',
    'accountManager',
  ],
} as const satisfies Record<'essential' | 'performance' | 'agency', readonly PlanFeatureKey[]>;

export const PLAN_DEFINITIONS: Record<PlanKey, {
  label: string;
  rank: number;
  billingKey: 'essential' | 'performance' | 'agency';
  monthlyProjectLimit: number | null;
  features: readonly PlanFeatureKey[];
}> = {
  essentiel: {
    label: 'Essentiel',
    rank: 0,
    billingKey: 'essential',
    monthlyProjectLimit: 50,
    features: PLAN_FEATURES.essential,
  },
  performance: {
    label: 'Performance',
    rank: 1,
    billingKey: 'performance',
    monthlyProjectLimit: null,
    features: PLAN_FEATURES.performance,
  },
  entreprise: {
    label: 'Agence',
    rank: 2,
    billingKey: 'agency',
    monthlyProjectLimit: null,
    features: PLAN_FEATURES.agency,
  },
};

export function normalizePlan(plan?: string | null): PlanKey {
  const value = String(plan || '').trim().toLowerCase();

  if (value === 'performance' || value === 'pro') return 'performance';
  if (value === 'entreprise' || value === 'agence' || value === 'agency') return 'entreprise';
  if (value === 'essentiel' || value === 'essential' || value === 'starter') return 'essentiel';

  return 'essentiel';
}

export function getPlanLabel(plan?: string | null): string {
  return PLAN_DEFINITIONS[normalizePlan(plan)].label;
}

export function getRequiredPlanForFeature(feature: PlanFeatureKey): PlanKey {
  return FEATURE_DEFINITIONS[feature].requiredPlan;
}

export function getMonthlyProjectLimit(plan?: string | null): number | null {
  return PLAN_DEFINITIONS[normalizePlan(plan)].monthlyProjectLimit;
}

export function hasFeature(plan: string | null | undefined, feature: PlanFeatureKey): boolean {
  return PLAN_DEFINITIONS[normalizePlan(plan)].features.includes(feature);
}
