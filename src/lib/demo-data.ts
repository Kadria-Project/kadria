'use client';

export interface DemoPhoto {
  url: string;
  thumbnailUrl: string;
}

export interface DemoQuoteState {
  status: 'draft' | 'sent' | 'opened' | 'accepted' | 'declined' | 'none';
  amount: number | null;
  sentAt?: string | null;
  openedAt?: string | null;
  openedCount?: number;
  validUntil?: string | null;
  declineReason?: string | null;
}

export interface DemoFollowUpState {
  status: 'today' | 'late' | 'planned' | 'done' | 'none';
  date: string | null;
  channel: 'phone' | 'email';
  reason: string;
}

export interface DemoActivityItem {
  id: string;
  label: string;
  date: string;
  kind: 'project' | 'quote' | 'followup' | 'decision';
}

export interface DemoQuoteBuilderLine {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPriceHt: number;
  vatRate: number;
  enabled?: boolean;
}

export interface DemoQuoteBuilder {
  quoteNumber: string;
  clientName: string;
  projectTitle: string;
  siteAddress: string;
  validityDays: number;
  defaultVat: number;
  depositPercent: number;
  paymentTerms: string;
  clientNote: string;
  lines: DemoQuoteBuilderLine[];
}

// Statut acompte interne cote artisan (memes valeurs que src/lib/deposit.ts
// DepositStatus) : not_requested/recommended/requested/paid/cancelled.
export type DemoDepositStatus = 'not_requested' | 'recommended' | 'requested' | 'paid' | 'cancelled';

export interface DemoProject {
  id: string;
  projectNumber: string;
  clientFirstName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  siteAddress: string;
  city: string;
  postalCode: string;
  trade: string;
  projectType: string;
  budget: string;
  desiredTimeline: string;
  maturity: string;
  aiSummary: string;
  tradeAnswers?: unknown[];
  // Rendez-vous (visite technique) eventuellement planifie pour ce dossier.
  // Reprend la forme attendue par action-engine.ts (appointment.start) afin
  // de permettre a computeNextAction() de distinguer RDV absent / planifie /
  // passe, sans dupliquer cette logique localement.
  appointment?: { start: string } | null;
  completenessScore: number;
  status: string;
  source: string;
  devisAmount: number | null;
  photos: DemoPhoto[];
  createdAt: string;
  updatedAt?: string;
  lastInteractionAt?: string;
  quoteSentAt?: string | null;
  acceptedAt?: string | null;
  opensCount?: number;
  callbackDate: string | null;
  notes: string;
  quote?: DemoQuoteState;
  followUp?: DemoFollowUpState;
  activity?: DemoActivityItem[];
  quoteBuilder?: DemoQuoteBuilder;
  // Acompte par dossier — memes champs que ceux lus par project-lifecycle.ts
  // (depositStatus/depositAmount/depositPaymentUrl/depositPaidAt) et par
  // src/lib/deposit.ts (normalizeDepositStatus / normalizePublicDepositStatus).
  // Jamais de vrai lien Stripe : depositPaymentUrl est un identifiant factice
  // uniquement utilise pour driver l'affichage ("lien envoye" / non envoye),
  // le bouton de paiement demo affiche systematiquement un toast simule.
  depositStatus?: DemoDepositStatus;
  depositAmount?: number | null;
  depositPaymentUrl?: string | null;
  depositRequestedAt?: string | null;
  depositPaidAt?: string | null;
  responsibleUserId?: string | null;
  responsibleAssignedAt?: string | null;
  responsibleUser?: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string;
    jobTitle: string | null;
    status: string;
    displayName: string;
  } | null;
}

export interface DemoClientEvent {
  id: string;
  type: 'client_message' | 'artisan_reply' | 'client_info_updated' | 'quote_sent' | 'quote_accepted' | 'quote_declined';
  title: string;
  message: string | null;
  source: 'client' | 'artisan' | 'system';
  createdAt: string;
}

// ── 10 dossiers demo (refonte complete) ─────────────────────────────────
// demo_101 Camille Durand      - Plomberie          - Nouveau
// demo_102 Laurent Martin      - Salle de bain       - Qualifié
// demo_103 Sophie Lefèvre      - Électricité         - Devis envoyé
// demo_104 Nicolas Dupont      - Chauffage           - Devis accepté
// demo_105 Marion Petit        - Terrasse            - Acompte demandé
// demo_106 Thomas Bernard      - Menuiserie          - Acompte payé
// demo_107 Claire Moreau       - Peinture            - En cours
// demo_108 Julien Rousseau     - Isolation           - Réalisation du projet
// demo_109 Élodie Garnier      - Portail             - Perdu
// demo_110 Marc Dubois         - Plomberie           - Gagné

export const DEMO_CLIENT_EVENTS: Record<string, DemoClientEvent[]> = {
  demo_101: [
    {
      id: 'demo_101_evt_1',
      type: 'client_message',
      title: 'Message client',
      message: "Bonjour, l'eau coule en continu sous l'évier, j'ai posé une bassine en attendant. C'est possible de passer aujourd'hui ou demain matin ?",
      source: 'client',
      createdAt: '2026-07-03T19:20:00.000Z',
    },
  ],
  demo_102: [
    {
      id: 'demo_102_evt_1',
      type: 'client_info_updated',
      title: 'Informations complétées',
      message: 'Le client a précisé la marque de robinetterie souhaitée et confirmé le budget disponible.',
      source: 'client',
      createdAt: '2026-06-30T18:40:00.000Z',
    },
    {
      id: 'demo_102_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: 'Nous sommes disponibles tous les jours en fin d’après-midi pour la visite technique.',
      source: 'client',
      createdAt: '2026-07-01T08:15:00.000Z',
    },
  ],
  demo_103: [
    { id: 'demo_103_evt_1', type: 'quote_sent', title: 'Devis envoyé au client', message: null, source: 'system', createdAt: '2026-06-29T17:30:00.000Z' },
    {
      id: 'demo_103_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: "J'ai bien reçu le devis, je le regarde ce week-end avec mon mari et je reviens vers vous lundi.",
      source: 'client',
      createdAt: '2026-06-30T20:05:00.000Z',
    },
  ],
  demo_104: [
    { id: 'demo_104_evt_1', type: 'quote_sent', title: 'Devis envoyé au client', message: null, source: 'system', createdAt: '2026-06-25T16:10:00.000Z' },
    { id: 'demo_104_evt_2', type: 'quote_accepted', title: 'Devis accepté par le client', message: null, source: 'system', createdAt: '2026-06-27T09:45:00.000Z' },
    {
      id: 'demo_104_evt_3',
      type: 'client_message',
      title: 'Message client',
      message: 'C’est validé de notre côté, vous pouvez nous dire comment se passe le règlement de l’acompte ?',
      source: 'client',
      createdAt: '2026-06-27T09:50:00.000Z',
    },
  ],
  demo_105: [
    { id: 'demo_105_evt_1', type: 'quote_accepted', title: 'Devis accepté par le client', message: null, source: 'system', createdAt: '2026-06-24T11:00:00.000Z' },
    {
      id: 'demo_105_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: 'Bonjour, je n’ai pas encore réussi à régler l’acompte en ligne, je vais le faire ce week-end.',
      source: 'client',
      createdAt: '2026-07-02T18:30:00.000Z',
    },
  ],
  demo_106: [
    { id: 'demo_106_evt_1', type: 'quote_accepted', title: 'Devis accepté par le client', message: null, source: 'system', createdAt: '2026-06-18T10:20:00.000Z' },
    {
      id: 'demo_106_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: 'Acompte réglé ce matin par carte. On peut caler une date d’intervention dès que possible.',
      source: 'client',
      createdAt: '2026-06-20T09:05:00.000Z',
    },
  ],
  demo_107: [
    {
      id: 'demo_107_evt_1',
      type: 'client_message',
      title: 'Message client',
      message: 'Petite précision : le plafond du salon a une légère tache d’humidité près de la fenêtre, à vérifier lors du rendez-vous.',
      source: 'client',
      createdAt: '2026-06-29T12:15:00.000Z',
    },
    {
      id: 'demo_107_evt_2',
      type: 'artisan_reply',
      title: 'Réponse artisan',
      message: 'Merci pour l’info, je regarderai ça avec vous mercredi lors du rendez-vous technique.',
      source: 'artisan',
      createdAt: '2026-06-29T14:00:00.000Z',
    },
  ],
  demo_108: [
    {
      id: 'demo_108_evt_1',
      type: 'client_message',
      title: 'Message client',
      message: 'J’ai laissé les combles accessibles et la trappe ouverte pour l’équipe, comme convenu.',
      source: 'client',
      createdAt: '2026-07-01T07:40:00.000Z',
    },
    {
      id: 'demo_108_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: 'Tout s’est bien passé pour la première demi-journée, merci pour le nettoyage du chantier.',
      source: 'client',
      createdAt: '2026-07-03T17:50:00.000Z',
    },
  ],
  demo_109: [
    {
      id: 'demo_109_evt_1',
      type: 'quote_declined',
      title: 'Devis refusé par le client',
      message: 'Montant trop élevé par rapport au budget prévu, le client se réoriente vers un portail moins onéreux.',
      source: 'system',
      createdAt: '2026-06-22T09:30:00.000Z',
    },
  ],
  demo_110: [
    { id: 'demo_110_evt_1', type: 'quote_accepted', title: 'Devis accepté par le client', message: null, source: 'system', createdAt: '2026-06-10T09:00:00.000Z' },
    {
      id: 'demo_110_evt_2',
      type: 'client_message',
      title: 'Message client',
      message: 'Un grand merci, l’intervention s’est très bien passée et tout fonctionne parfaitement.',
      source: 'client',
      createdAt: '2026-06-12T16:20:00.000Z',
    },
  ],
};

export interface DemoEvent {
  id: string;
  title: string;
  date: string;
  type: 'RDV' | 'Relance' | 'Rappel' | 'Intervention';
  projectId: string;
  status: string;
  notes: string;
}

export const DEMO_ARTISAN = {
  artisanId: 'Demo_artisan',
  companyName: 'Dupont Renovation',
  email: 'demo@kadria.fr',
  primaryTrade: 'Plombier',
  phone: '06 12 34 56 78',
  address: '12 rue des Artisans, 69001 Lyon',
  primaryColor: '#22c55e',
  secondaryColor: '#09090b',
  welcomeName: 'Dupont Renovation',
  welcomeMessage: "Bonjour ! Je vais vous aider a structurer votre projet de plomberie. Quel est votre besoin ?",
  websiteUrl: 'https://kadria.fr',
  theme: 'dark' as 'dark' | 'light',
  plan: 'Pro',
  hours: 'Lun-Ven 8h-18h',
  // Champs de marque blanche demo, alignes sur la forme reelle d'ArtisanConfig
  // (plan id technique distinct du libelle commercial ci-dessus) afin de
  // pouvoir reutiliser resolveDevisBranding() (src/lib/devis-branding.ts)
  // sans dupliquer la logique D1/D2/D3 dans la demo. Valeurs par defaut :
  // marque blanche INACTIVE -> branding Kadria visible par defaut en demo.
  whiteLabelPlanId: 'performance' as string,
  whiteLabelEnabled: false,
  widgetBrandName: '',
  widgetBrandLogoUrl: '',
  logoUrl: '',
  raisonSociale: '',
};

export const DEMO_SETTINGS_PROFILE = {
  companyName: 'AB Elec',
  artisanId: 'Artisan_demo',
  mainTrade: 'Electricite generale',
  secondaryTrades: ['Borne de recharge', 'Tableau electrique', 'Renovation'],
  phone: '06 12 34 56 78',
  email: 'contact@ab-elec-demo.fr',
  city: 'Rouen',
  interventionArea: 'Rouen et 30 km autour',
  address: '12 rue des Artisans, 76000 Rouen',
  plan: 'performance',
};

export const DEMO_SETTINGS_CONFIGURATION = {
  entreprise: {
    companyName: 'AB Elec',
    artisanId: 'Artisan_demo',
    mainTrade: 'Electricite generale',
    slogan: 'Electricite, depannage et renovation a Rouen',
    description:
      'AB Elec accompagne les particuliers et professionnels pour les depannages electriques, renovations, mises aux normes, tableaux electriques et bornes de recharge.',
    interventionArea: 'Rouen et 30 km autour',
    foundedYear: '2018',
    teamSize: 'Artisan independant',
    activityStatus: 'Actif',
    assistantAvatarType: 'kadria_default',
    assistantAvatarUrl: '',
  },
  profile: {
    mainTrade: 'Electricite generale',
    secondaryTrades: [
      'Depannage electrique',
      'Tableau electrique',
      'Mise aux normes',
      'Borne de recharge',
      'Renovation electrique',
      'Eclairage exterieur',
    ],
    offeredServices: [
      'Diagnostic et recherche de panne',
      'Remplacement de tableau',
      'Creation de circuits',
      'Installation de borne IRVE',
      'Mise en securite',
    ],
    clientTypes: ['Particuliers', 'Petits commerces', 'Syndics / coproprietes'],
    acceptsEmergencies: true,
    priorityRequests: [
      'Panne totale',
      'Tableau dangereux',
      'Projet avec budget confirme',
      'Demande urgente sous 7 jours',
    ],
    filteredRequests: [
      'Petits depannages hors zone',
      'Demandes sans budget ni delai',
      'Chantiers multi-lots trop vagues',
    ],
    workingDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
    workStartTime: '08:00',
    workEndTime: '18:30',
    hourlyRateHt: '58',
    diagnosticFeeHt: '45',
    defaultVatRate: '20',
    defaultMarginPercent: '25',
    preferredBrands: 'Schneider Electric, Legrand, Hager',
    avoidedBrands: 'Marques premier prix non certifiees NF',
  },
  contact: {
    contactName: 'Alexandre Bernard',
    phone: '06 12 34 56 78',
    email: 'contact@ab-elec-demo.fr',
    address: '12 rue des Artisans',
    city: 'Rouen',
    postalCode: '76000',
    website: 'https://ab-elec-demo.fr',
    callHours: 'Lun-Ven 8h30-18h30',
    preferredChannel: 'Telephone',
    contactMessage:
      'Bonjour, laissez-nous quelques details sur votre besoin et vos disponibilites. Nous vous rappelons rapidement pour qualifier votre projet.',
  },
  legal: {
    companyLegalName: 'AB Elec SASU',
    siret: '85214796300018',
    vatNumber: 'FR52852147963',
    decennialInsuranceEnabled: true,
    insurerName: 'MMA Pro Batiment',
    policyNumber: 'DEC-ROUEN-2026-1482',
    quoteMentions:
      'Devis valable 30 jours. Intervention planifiee apres validation ecrite du client et versement de l accompte si applicable.',
    paymentTerms: '40% a la commande, solde a la reception. Paiement par virement ou cheque.',
  },
  travel: {
    departureAddress: '12 rue des Artisans, 76000 Rouen',
    radiusKm: '30',
    standardFee: '39',
    vehiclePowertrain: 'Diesel utilitaire',
    estimatedConsumption: '7.2',
    travelCostEnabled: true,
    minimumIntervention: '120',
    priorityZones: ['Rouen centre', 'Bois-Guillaume', 'Mont-Saint-Aignan', 'Sotteville-les-Rouen'],
    excludedZones: ['Paris intra-muros', 'Le Havre port', 'Interventions hors Normandie'],
  },
  widget: {
    enabled: true,
    artisanId: 'Artisan_demo',
    scriptUrl: '<script src="https://kadria.fr/widget.js" data-artisan-id="Artisan_demo"></script>',
    welcomeMessage:
      "Bonjour, je suis l'assistant de AB Elec. Decrivez votre besoin, je vais preparer un dossier clair pour l'artisan.",
    responseTone: 'Professionnel',
    requestedFields: ['Type de projet', 'Description', 'Budget', 'Delai', 'Ville', 'Photos', 'Coordonnees'],
    activeChannels: ['Site web', 'Lien projet', 'Widget embarque'],
    whiteLabelEnabled: false,
    widgetBrandName: '',
    widgetBrandLogoUrl: '',
  },
  catalogue: {
    enabled: true,
    pricingMode: 'Catalogue prestations',
    services: [
      { id: 'service_001', title: 'Depannage electrique', priceLabel: 'A partir de 90 EUR', enabled: true },
      { id: 'service_002', title: 'Remplacement tableau electrique', priceLabel: 'A partir de 850 EUR', enabled: true },
      { id: 'service_003', title: 'Installation borne de recharge', priceLabel: 'A partir de 1 290 EUR', enabled: true },
      { id: 'service_004', title: 'Mise aux normes electrique', priceLabel: 'Sur devis', enabled: true },
      { id: 'service_005', title: 'Renovation electrique complete', priceLabel: 'Sur devis', enabled: false },
      { id: 'service_006', title: 'Eclairage exterieur', priceLabel: 'A partir de 350 EUR', enabled: true },
    ],
    defaultVat: '20 %',
    quoteValidityDays: '30 jours',
    depositRate: '30 %',
    paymentTerms: 'Acompte a la commande, solde a reception',
    quoteMentions:
      'Devis etabli sur la base des informations transmises. Une visite technique peut etre necessaire avant validation definitive.',
  },
  appearance: {
    primaryColor: '#22c55e',
    visualMode: 'Sombre',
    logoLabel: 'AB Elec',
    displayName: 'AB Elec',
    buttonColor: '#22c55e',
    accentColor: '#16a34a',
    toneStyle: 'Premium',
  },
  offer: {
    currentPlan: 'Performance',
    status: 'Actif',
    price: '249 EUR/mois',
    renewalDate: '15 juillet 2026',
    quotas: {
      projects: { label: 'Dossiers crees', used: 18, limitLabel: 'Illimite', tone: 'included' },
      quotes: { label: 'Devis', used: 7, limitLabel: 'Illimite', tone: 'included' },
      voiceCalls: { label: 'Appels vocaux', used: 42, limit: 150, tone: 'warning' },
      voiceMinutes: { label: 'Minutes vocales', used: 96, unit: 'min', tone: 'neutral' },
      pdfExport: { label: 'Export PDF', status: 'Inclus', tone: 'included' },
      pipeline: { label: 'Pipeline commercial', status: 'Inclus', tone: 'included' },
      priorities: { label: 'Priorites du jour', status: 'Inclus', tone: 'included' },
      followUps: { label: 'Relances', status: 'Bientot', tone: 'soon' },
    },
    features: [
      'Assistant chat web',
      'Qualification metier',
      'Score commercial',
      'Vue liste',
      'Vue Kanban / pipeline',
      'Devis illimites',
      'Assistant vocal avec quota',
      'Export PDF',
      'Opportunites prioritaires',
      'Dashboard mobile',
      'Parametres metier',
      'Catalogue prestations',
      'Apparence widget',
    ],
    planComparison: [
      { name: 'Essentiel', summary: 'Pour demarrer', highlight: false },
      { name: 'Performance', summary: 'Plan actuel / recommande', highlight: true },
      { name: 'Agence', summary: 'Pour equipes et reseaux', highlight: false },
    ],
    siteAddon: {
      title: 'Site vitrine cle en main',
      monthlyPrice: '+50 EUR/mois avec engagement 6 mois',
      oneShotPrice: 'ou 300 EUR une fois',
      availability: 'Disponible avec Essentiel et Performance',
    },
  },
} as const;

export const DEMO_PROJECTS: DemoProject[] = [
  // 1. Nouveau — Camille Durand — Fuite sous évier
  {
    id: 'demo_101',
    projectNumber: 'DEV-2026-101',
    clientFirstName: 'Camille',
    clientName: 'Durand',
    clientPhone: '06 14 27 38 92',
    clientEmail: 'camille.durand@email.fr',
    siteAddress: '5 rue Jeanne d’Arc',
    city: 'Rouen',
    postalCode: '76000',
    trade: 'Plomberie',
    projectType: 'Fuite sous évier cuisine',
    budget: 'Non renseigné',
    desiredTimeline: 'Urgent, sous 48h',
    maturity: 'Urgent',
    aiSummary:
      "Le client signale une fuite active sous l'évier de cuisine, avec de l'eau qui s'accumule malgré une bassine posée en attendant. Le besoin est clair et urgent, mais le budget n'est pas encore confirmé. Priorité : rappeler rapidement pour qualifier l'ampleur de la fuite et proposer un créneau d'intervention.",
    completenessScore: 58,
    status: 'Nouveau',
    source: 'chat-widget',
    devisAmount: null,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=200&auto=format&fit=crop',
      },
      {
        url: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-07-03T19:20:00.000Z',
    callbackDate: '2026-07-04T09:00:00.000Z',
    notes: 'Fuite active sous l’évier, client a posé une bassine en attendant. À rappeler en priorité pour qualifier et planifier.',
    quote: {
      status: 'none',
      amount: null,
      validUntil: null,
      openedCount: 0,
    },
    followUp: {
      status: 'today',
      date: '2026-07-04T09:00:00.000Z',
      channel: 'phone',
      reason: 'Qualifier l’urgence de la fuite et proposer un créneau rapide',
    },
    activity: [
      { id: 'demo_101_received', label: 'Dossier créé via le widget Kadria', date: '2026-07-03T19:20:00.000Z', kind: 'project' },
      { id: 'demo_101_photos', label: 'Photos ajoutées par le client', date: '2026-07-03T19:22:00.000Z', kind: 'project' },
      { id: 'demo_101_message', label: 'Message client reçu', date: '2026-07-03T19:20:00.000Z', kind: 'followup' },
    ],
  },
  // 2. Qualifié — Laurent Martin — Salle de bain complète
  {
    id: 'demo_102',
    projectNumber: 'DEV-2026-102',
    clientFirstName: 'Laurent',
    clientName: 'Martin',
    clientPhone: '06 45 12 78 34',
    clientEmail: 'laurent.martin@email.fr',
    siteAddress: '18 rue de Crosne',
    city: 'Bois-Guillaume',
    postalCode: '76230',
    trade: 'Rénovation salle de bain',
    projectType: 'Rénovation complète douche italienne et meuble vasque',
    budget: '9 000 - 13 000 EUR',
    desiredTimeline: 'Sous 2 mois',
    maturity: 'Pret a demarrer',
    aiSummary:
      "Rénovation complète d'une salle de bain de 6m2 avec création d'une douche italienne et remplacement du meuble vasque. Le client a donné toutes les informations attendues (budget, délai, contraintes d'accès) et souhaite démarrer sous deux mois. Dossier bien qualifié : priorité à la préparation d'un devis détaillé.",
    appointment: { start: '2026-07-08T10:00:00.000Z' },
    completenessScore: 92,
    source: 'assistant-web',
    status: 'Qualifié',
    devisAmount: null,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=200&auto=format&fit=crop',
      },
      {
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=200&auto=format&fit=crop',
      },
      {
        url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-06-29T10:15:00.000Z',
    updatedAt: '2026-07-01T08:15:00.000Z',
    lastInteractionAt: '2026-07-01T08:15:00.000Z',
    callbackDate: null,
    notes: 'Dossier très complet. Visite technique confirmée le 08/07, préparer le devis dans la foulée.',
    quote: {
      status: 'none',
      amount: null,
      validUntil: null,
      openedCount: 0,
    },
    followUp: {
      status: 'planned',
      date: '2026-07-08T10:00:00.000Z',
      channel: 'phone',
      reason: 'Visite technique avant préparation du devis',
    },
    activity: [
      { id: 'demo_102_received', label: 'Dossier créé via l’assistant web', date: '2026-06-29T10:15:00.000Z', kind: 'project' },
      { id: 'demo_102_qualified', label: 'Qualification complétée', date: '2026-06-30T09:00:00.000Z', kind: 'project' },
      { id: 'demo_102_photos', label: 'Photos ajoutées', date: '2026-06-30T09:05:00.000Z', kind: 'project' },
      { id: 'demo_102_info', label: 'Informations complétées par le client', date: '2026-06-30T18:40:00.000Z', kind: 'project' },
      { id: 'demo_102_rdv', label: 'Rendez-vous technique planifié', date: '2026-07-01T08:15:00.000Z', kind: 'followup' },
    ],
  },
  // 3. Devis envoyé — Sophie Lefèvre — Tableau électrique
  {
    id: 'demo_103',
    projectNumber: 'DEV-2026-103',
    clientFirstName: 'Sophie',
    clientName: 'Lefèvre',
    clientPhone: '06 78 23 45 61',
    clientEmail: 'sophie.lefevre@email.fr',
    siteAddress: '9 rue Herbière',
    city: 'Mont-Saint-Aignan',
    postalCode: '76130',
    trade: 'Électricité',
    projectType: 'Remplacement tableau électrique',
    budget: '1 200 - 1 800 EUR',
    desiredTimeline: 'Sous 2 semaines',
    maturity: 'Pret a demarrer',
    aiSummary:
      "Le client souhaite remplacer son ancien tableau électrique dans une maison individuelle. Le besoin est clair, le délai est court et le budget semble compatible avec une intervention standard. Priorité : confirmer la disponibilité et envoyer un devis rapidement.",
    appointment: { start: '2026-06-27T09:30:00.000Z' },
    completenessScore: 90,
    status: 'Devis envoyé',
    source: 'voice',
    devisAmount: 1540,
    photos: [],
    createdAt: '2026-06-26T14:00:00.000Z',
    updatedAt: '2026-06-30T20:05:00.000Z',
    lastInteractionAt: '2026-06-30T20:05:00.000Z',
    callbackDate: '2026-07-04T10:00:00.000Z',
    notes: 'Devis consulté par le client le 29/06 et le 30/06. Relance à faire aujourd’hui si pas de retour.',
    quote: {
      status: 'opened',
      amount: 1540,
      sentAt: '2026-06-29T17:30:00.000Z',
      openedAt: '2026-06-29T18:10:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-29T17:30:00.000Z',
    },
    followUp: {
      status: 'today',
      date: '2026-07-04T10:00:00.000Z',
      channel: 'phone',
      reason: 'Devis ouvert deux fois sans validation, relance recommandée aujourd’hui',
    },
    activity: [
      { id: 'demo_103_received', label: 'Dossier créé par appel vocal', date: '2026-06-26T14:00:00.000Z', kind: 'project' },
      { id: 'demo_103_visit', label: 'Visite technique réalisée', date: '2026-06-27T09:30:00.000Z', kind: 'project' },
      { id: 'demo_103_quote_generated', label: 'Devis généré', date: '2026-06-29T16:50:00.000Z', kind: 'quote' },
      { id: 'demo_103_quote_sent', label: 'Devis envoyé au client', date: '2026-06-29T17:30:00.000Z', kind: 'quote' },
      { id: 'demo_103_quote_opened', label: 'Devis consulté par le client', date: '2026-06-29T18:10:00.000Z', kind: 'quote' },
      { id: 'demo_103_message', label: 'Message client reçu', date: '2026-06-30T20:05:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-103',
      clientName: 'Sophie Lefèvre',
      projectTitle: 'Remplacement tableau électrique',
      siteAddress: '9 rue Herbière, 76130 Mont-Saint-Aignan',
      validityDays: 30,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: 'Acompte à la validation, solde à la réception des travaux.',
      clientNote: 'Le tableau est situé dans l’entrée, accessible sans déplacer de meuble. Intervention prévue en une demi-journée.',
      lines: [
        { id: 'demo_103_line_001', label: 'Dépose ancien tableau électrique', quantity: 1, unit: 'forfait', unitPriceHt: 180, vatRate: 20, enabled: true },
        { id: 'demo_103_line_002', label: 'Fourniture tableau et protections', quantity: 1, unit: 'ensemble', unitPriceHt: 720, vatRate: 20, enabled: true },
        { id: 'demo_103_line_003', label: 'Recâblage et repérage des circuits', quantity: 1, unit: 'forfait', unitPriceHt: 460, vatRate: 20, enabled: true },
        { id: 'demo_103_line_004', label: 'Essais et attestation de conformité', quantity: 1, unit: 'forfait', unitPriceHt: 180, vatRate: 20, enabled: true },
      ],
    },
  },
  // 4. Devis accepté — Nicolas Dupont — Pompe à chaleur
  {
    id: 'demo_104',
    projectNumber: 'DEV-2026-104',
    clientFirstName: 'Nicolas',
    clientName: 'Dupont',
    clientPhone: '06 33 56 90 21',
    clientEmail: 'nicolas.dupont@email.fr',
    siteAddress: '2 rue du Général Leclerc',
    city: 'Sotteville-lès-Rouen',
    postalCode: '76300',
    trade: 'Chauffage',
    projectType: 'Remplacement chaudière par pompe à chaleur',
    budget: '8 500 - 11 000 EUR',
    desiredTimeline: 'Avant l’hiver',
    maturity: 'Commande confirmee',
    aiSummary:
      "Le client souhaite remplacer sa chaudière fioul vieillissante par une pompe à chaleur air-eau avant l'hiver prochain. Le devis a été accepté rapidement après la visite technique. Le dossier est prêt à sécuriser via l'acompte avant de lancer la commande du matériel.",
    appointment: { start: '2026-06-24T14:00:00.000Z' },
    completenessScore: 95,
    status: 'Devis accepté',
    source: 'recommandation',
    devisAmount: 9680,
    photos: [],
    createdAt: '2026-06-23T09:00:00.000Z',
    updatedAt: '2026-06-27T09:50:00.000Z',
    lastInteractionAt: '2026-06-27T09:50:00.000Z',
    callbackDate: '2026-07-05T09:00:00.000Z',
    notes: 'Devis accepté, acompte à demander pour verrouiller la commande fournisseur avant l’hiver.',
    acceptedAt: '2026-06-27T09:45:00.000Z',
    depositStatus: 'recommended',
    depositAmount: 2904,
    depositPaymentUrl: null,
    depositRequestedAt: null,
    depositPaidAt: null,
    quote: {
      status: 'accepted',
      amount: 9680,
      sentAt: '2026-06-25T16:10:00.000Z',
      openedAt: '2026-06-26T08:30:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-25T16:10:00.000Z',
    },
    followUp: {
      status: 'planned',
      date: '2026-07-05T09:00:00.000Z',
      channel: 'phone',
      reason: 'Envoyer le lien d’acompte pour sécuriser la commande du matériel',
    },
    activity: [
      { id: 'demo_104_received', label: 'Dossier créé par recommandation', date: '2026-06-23T09:00:00.000Z', kind: 'project' },
      { id: 'demo_104_visit', label: 'Visite technique réalisée', date: '2026-06-24T14:00:00.000Z', kind: 'project' },
      { id: 'demo_104_quote_sent', label: 'Devis envoyé au client', date: '2026-06-25T16:10:00.000Z', kind: 'quote' },
      { id: 'demo_104_quote_accepted', label: 'Devis accepté par le client', date: '2026-06-27T09:45:00.000Z', kind: 'decision' },
      { id: 'demo_104_message', label: 'Message client reçu', date: '2026-06-27T09:50:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-104',
      clientName: 'Nicolas Dupont',
      projectTitle: 'Remplacement chaudière par pompe à chaleur',
      siteAddress: '2 rue du Général Leclerc, 76300 Sotteville-lès-Rouen',
      validityDays: 30,
      defaultVat: 10,
      depositPercent: 30,
      paymentTerms: '30% à la commande pour lancer l’approvisionnement, solde à la mise en service.',
      clientNote: 'Installation réservée sous condition de versement de l’acompte, délai fournisseur estimé à 3 semaines.',
      lines: [
        { id: 'demo_104_line_001', label: 'Dépose chaudière fioul et cuve', quantity: 1, unit: 'forfait', unitPriceHt: 620, vatRate: 10, enabled: true },
        { id: 'demo_104_line_002', label: 'Fourniture pompe à chaleur air-eau', quantity: 1, unit: 'ensemble', unitPriceHt: 6480, vatRate: 10, enabled: true },
        { id: 'demo_104_line_003', label: 'Pose, raccordements hydrauliques et mise en service', quantity: 1, unit: 'forfait', unitPriceHt: 2580, vatRate: 10, enabled: true },
      ],
    },
  },
  // 5. Acompte demandé — Marion Petit — Terrasse bois composite
  {
    id: 'demo_105',
    projectNumber: 'DEV-2026-105',
    clientFirstName: 'Marion',
    clientName: 'Petit',
    clientPhone: '06 22 84 17 60',
    clientEmail: 'marion.petit@email.fr',
    siteAddress: '11 chemin des Vergers',
    city: 'Franqueville-Saint-Pierre',
    postalCode: '76520',
    trade: 'Terrasse / aménagement extérieur',
    projectType: 'Création terrasse bois composite',
    budget: '6 000 - 8 500 EUR',
    desiredTimeline: 'Avant les beaux jours',
    maturity: 'Lance',
    aiSummary:
      "Création d'une terrasse de 28m2 en lame composite pour remplacer une dalle béton fissurée. Le devis a été accepté et l'acompte demandé pour réserver un créneau de chantier avant la belle saison. Le règlement en ligne est encore attendu.",
    appointment: { start: '2026-06-21T11:00:00.000Z' },
    completenessScore: 96,
    status: 'Acompte demandé',
    source: 'chat-widget',
    devisAmount: 7240,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop',
      },
      {
        url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-06-19T08:30:00.000Z',
    updatedAt: '2026-07-02T18:30:00.000Z',
    lastInteractionAt: '2026-07-02T18:30:00.000Z',
    callbackDate: '2026-07-06T09:00:00.000Z',
    notes: 'Acompte demandé le 24/06, client annonce un règlement ce week-end. Relancer si rien lundi.',
    acceptedAt: '2026-06-24T11:00:00.000Z',
    depositStatus: 'requested',
    depositAmount: 2172,
    depositPaymentUrl: 'demo-deposit-link-105',
    depositRequestedAt: '2026-06-24T11:30:00.000Z',
    depositPaidAt: null,
    quote: {
      status: 'accepted',
      amount: 7240,
      sentAt: '2026-06-20T15:00:00.000Z',
      openedAt: '2026-06-20T19:20:00.000Z',
      openedCount: 3,
      validUntil: '2026-07-20T15:00:00.000Z',
    },
    followUp: {
      status: 'late',
      date: '2026-07-06T09:00:00.000Z',
      channel: 'phone',
      reason: 'Acompte demandé depuis plus d’une semaine, relance recommandée',
    },
    activity: [
      { id: 'demo_105_received', label: 'Dossier créé via le widget Kadria', date: '2026-06-19T08:30:00.000Z', kind: 'project' },
      { id: 'demo_105_visit', label: 'Visite technique réalisée', date: '2026-06-21T11:00:00.000Z', kind: 'project' },
      { id: 'demo_105_quote_sent', label: 'Devis envoyé au client', date: '2026-06-20T15:00:00.000Z', kind: 'quote' },
      { id: 'demo_105_quote_accepted', label: 'Devis accepté par le client', date: '2026-06-24T11:00:00.000Z', kind: 'decision' },
      { id: 'demo_105_deposit_requested', label: 'Acompte de 2 172 € demandé', date: '2026-06-24T11:30:00.000Z', kind: 'decision' },
      { id: 'demo_105_message', label: 'Message client reçu', date: '2026-07-02T18:30:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-105',
      clientName: 'Marion Petit',
      projectTitle: 'Création terrasse bois composite',
      siteAddress: '11 chemin des Vergers, 76520 Franqueville-Saint-Pierre',
      validityDays: 30,
      defaultVat: 10,
      depositPercent: 30,
      paymentTerms: '30% à la commande, solde à la réception de la terrasse.',
      clientNote: 'Le planning de chantier est réservé après réception de l’acompte, intervention estimée sur 3 jours.',
      lines: [
        { id: 'demo_105_line_001', label: 'Dépose dalle béton existante', quantity: 1, unit: 'forfait', unitPriceHt: 780, vatRate: 10, enabled: true },
        { id: 'demo_105_line_002', label: 'Fourniture lames composite et structure', quantity: 28, unit: 'm2', unitPriceHt: 165, vatRate: 10, enabled: true },
        { id: 'demo_105_line_003', label: 'Pose et finitions', quantity: 1, unit: 'forfait', unitPriceHt: 1840, vatRate: 10, enabled: true },
      ],
    },
  },
  // 6. Acompte payé — Thomas Bernard — Menuiserie sur mesure
  {
    id: 'demo_106',
    projectNumber: 'DEV-2026-106',
    clientFirstName: 'Thomas',
    clientName: 'Bernard',
    clientPhone: '06 51 39 82 04',
    clientEmail: 'thomas.bernard@email.fr',
    siteAddress: '31 rue Ampère',
    city: 'Le Grand-Quevilly',
    postalCode: '76120',
    trade: 'Menuiserie',
    projectType: 'Dressing sur mesure',
    budget: '4 200 - 5 500 EUR',
    desiredTimeline: 'Sous 1 mois',
    maturity: 'Lance',
    aiSummary:
      "Fabrication et pose d'un dressing sur mesure dans une chambre de 9m2. Le devis a été accepté et l'acompte de 30% a été réglé en ligne par le client. Le chiffre d'affaires est sécurisé, il reste à planifier la date d'intervention avec l'atelier.",
    appointment: { start: '2026-06-16T10:00:00.000Z' },
    completenessScore: 97,
    status: 'Acompte payé',
    source: 'site-vitrine',
    devisAmount: 4860,
    photos: [],
    createdAt: '2026-06-14T09:30:00.000Z',
    updatedAt: '2026-06-20T09:05:00.000Z',
    lastInteractionAt: '2026-06-20T09:05:00.000Z',
    callbackDate: '2026-07-07T09:00:00.000Z',
    notes: 'Acompte reçu le 20/06. Planifier l’intervention avec l’atelier et confirmer une date au client.',
    acceptedAt: '2026-06-18T10:20:00.000Z',
    depositStatus: 'paid',
    depositAmount: 1458,
    depositPaymentUrl: 'demo-deposit-link-106',
    depositRequestedAt: '2026-06-18T10:45:00.000Z',
    depositPaidAt: '2026-06-20T08:50:00.000Z',
    quote: {
      status: 'accepted',
      amount: 4860,
      sentAt: '2026-06-16T17:00:00.000Z',
      openedAt: '2026-06-17T09:15:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-16T17:00:00.000Z',
    },
    followUp: {
      status: 'planned',
      date: '2026-07-07T09:00:00.000Z',
      channel: 'phone',
      reason: 'Confirmer la date d’intervention avec l’atelier menuiserie',
    },
    activity: [
      { id: 'demo_106_received', label: 'Dossier créé via le site vitrine', date: '2026-06-14T09:30:00.000Z', kind: 'project' },
      { id: 'demo_106_visit', label: 'Prise de côtes réalisée sur site', date: '2026-06-16T10:00:00.000Z', kind: 'project' },
      { id: 'demo_106_quote_sent', label: 'Devis envoyé au client', date: '2026-06-16T17:00:00.000Z', kind: 'quote' },
      { id: 'demo_106_quote_accepted', label: 'Devis accepté par le client', date: '2026-06-18T10:20:00.000Z', kind: 'decision' },
      { id: 'demo_106_deposit_requested', label: 'Acompte de 1 458 € demandé', date: '2026-06-18T10:45:00.000Z', kind: 'decision' },
      { id: 'demo_106_deposit_paid', label: 'Acompte de 1 458 € réglé', date: '2026-06-20T08:50:00.000Z', kind: 'decision' },
      { id: 'demo_106_message', label: 'Message client reçu', date: '2026-06-20T09:05:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-106',
      clientName: 'Thomas Bernard',
      projectTitle: 'Dressing sur mesure',
      siteAddress: '31 rue Ampère, 76120 Le Grand-Quevilly',
      validityDays: 30,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: '30% à la commande, solde à la pose.',
      clientNote: 'Fabrication lancée à réception de l’acompte, délai atelier estimé à 3 semaines avant pose.',
      lines: [
        { id: 'demo_106_line_001', label: 'Étude et plan 3D du dressing', quantity: 1, unit: 'forfait', unitPriceHt: 220, vatRate: 20, enabled: true },
        { id: 'demo_106_line_002', label: 'Fabrication structure et façades sur mesure', quantity: 1, unit: 'ensemble', unitPriceHt: 3180, vatRate: 20, enabled: true },
        { id: 'demo_106_line_003', label: 'Pose, réglages et finitions', quantity: 1, unit: 'forfait', unitPriceHt: 650, vatRate: 20, enabled: true },
      ],
    },
  },
  // 7. En cours — Claire Moreau — Peinture salon
  {
    id: 'demo_107',
    projectNumber: 'DEV-2026-107',
    clientFirstName: 'Claire',
    clientName: 'Moreau',
    clientPhone: '06 60 27 43 18',
    clientEmail: 'claire.moreau@email.fr',
    siteAddress: '4 place du Général de Gaulle',
    city: 'Darnétal',
    postalCode: '76160',
    trade: 'Peinture',
    projectType: 'Rafraîchissement salon et plafond',
    budget: '2 200 - 3 000 EUR',
    desiredTimeline: 'Sous 3 semaines',
    maturity: 'En cours de qualification',
    aiSummary:
      "Rafraîchissement complet d'un salon de 22m2, murs et plafond, avec une petite tache d'humidité à vérifier près de la fenêtre. Le rendez-vous technique est planifié, la discussion avec la cliente est active et constructive. Dossier en cours d'avancement avant préparation du devis.",
    appointment: { start: '2026-07-08T14:00:00.000Z' },
    completenessScore: 84,
    status: 'En cours',
    source: 'telephone',
    devisAmount: null,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-06-28T11:00:00.000Z',
    updatedAt: '2026-06-29T14:00:00.000Z',
    lastInteractionAt: '2026-06-29T14:00:00.000Z',
    callbackDate: null,
    notes: 'Rendez-vous technique le 08/07. Vérifier la tache d’humidité signalée près de la fenêtre avant de chiffrer.',
    quote: {
      status: 'none',
      amount: null,
      validUntil: null,
      openedCount: 0,
    },
    followUp: {
      status: 'planned',
      date: '2026-07-08T14:00:00.000Z',
      channel: 'phone',
      reason: 'Rendez-vous technique avant préparation du devis',
    },
    activity: [
      { id: 'demo_107_received', label: 'Dossier créé par téléphone', date: '2026-06-28T11:00:00.000Z', kind: 'project' },
      { id: 'demo_107_rdv', label: 'Rendez-vous technique planifié', date: '2026-06-28T12:00:00.000Z', kind: 'followup' },
      { id: 'demo_107_message', label: 'Message client reçu', date: '2026-06-29T12:15:00.000Z', kind: 'followup' },
      { id: 'demo_107_reply', label: 'Réponse artisan publiée', date: '2026-06-29T14:00:00.000Z', kind: 'followup' },
    ],
  },
  // 8. Réalisation du projet — Julien Rousseau — Isolation combles
  {
    id: 'demo_108',
    projectNumber: 'DEV-2026-108',
    clientFirstName: 'Julien',
    clientName: 'Rousseau',
    clientPhone: '06 84 15 62 39',
    clientEmail: 'julien.rousseau@email.fr',
    siteAddress: '7 rue du Moulin',
    city: 'Barentin',
    postalCode: '76360',
    trade: 'Isolation',
    projectType: 'Isolation des combles perdus',
    budget: '2 800 - 3 600 EUR',
    desiredTimeline: 'Dès que possible',
    maturity: 'Lance',
    aiSummary:
      "Isolation de 80m2 de combles perdus par soufflage de laine de verre. Le devis a été accepté, l'acompte réglé, et le chantier a démarré. Le client a facilité l'accès aux combles et suit l'avancement avec des retours positifs. Priorité : suivre le bon déroulement puis clôturer le dossier après la fin d'intervention.",
    appointment: { start: '2026-07-01T08:00:00.000Z' },
    completenessScore: 98,
    status: 'Réalisation du projet',
    source: 'assistant-web',
    devisAmount: 3240,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=200&auto=format&fit=crop',
      },
      {
        url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-06-15T08:00:00.000Z',
    updatedAt: '2026-07-03T17:50:00.000Z',
    lastInteractionAt: '2026-07-03T17:50:00.000Z',
    callbackDate: '2026-07-05T09:00:00.000Z',
    notes: 'Chantier démarré le 01/07. Deuxième demi-journée réalisée le 03/07, très bons retours du client.',
    acceptedAt: '2026-06-19T09:30:00.000Z',
    depositStatus: 'paid',
    depositAmount: 972,
    depositPaymentUrl: 'demo-deposit-link-108',
    depositRequestedAt: '2026-06-19T10:00:00.000Z',
    depositPaidAt: '2026-06-20T11:15:00.000Z',
    quote: {
      status: 'accepted',
      amount: 3240,
      sentAt: '2026-06-17T15:00:00.000Z',
      openedAt: '2026-06-18T08:20:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-17T15:00:00.000Z',
    },
    followUp: {
      status: 'planned',
      date: '2026-07-05T09:00:00.000Z',
      channel: 'phone',
      reason: 'Suivre l’avancement du chantier et préparer la clôture du dossier',
    },
    activity: [
      { id: 'demo_108_received', label: 'Dossier créé via l’assistant web', date: '2026-06-15T08:00:00.000Z', kind: 'project' },
      { id: 'demo_108_quote_sent', label: 'Devis envoyé au client', date: '2026-06-17T15:00:00.000Z', kind: 'quote' },
      { id: 'demo_108_quote_accepted', label: 'Devis accepté par le client', date: '2026-06-19T09:30:00.000Z', kind: 'decision' },
      { id: 'demo_108_deposit_paid', label: 'Acompte de 972 € réglé', date: '2026-06-20T11:15:00.000Z', kind: 'decision' },
      { id: 'demo_108_start', label: 'Chantier démarré', date: '2026-07-01T08:00:00.000Z', kind: 'project' },
      { id: 'demo_108_access', label: 'Complément d’accès chantier reçu du client', date: '2026-07-01T07:40:00.000Z', kind: 'followup' },
      { id: 'demo_108_progress', label: 'Retour client positif sur l’avancement', date: '2026-07-03T17:50:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-108',
      clientName: 'Julien Rousseau',
      projectTitle: 'Isolation des combles perdus',
      siteAddress: '7 rue du Moulin, 76360 Barentin',
      validityDays: 30,
      defaultVat: 10,
      depositPercent: 30,
      paymentTerms: '30% à la commande, solde à la réception des travaux.',
      clientNote: 'Isolation par soufflage, intervention réalisée en 2 demi-journées avec accès direct aux combles.',
      lines: [
        { id: 'demo_108_line_001', label: 'Fourniture laine de verre soufflée', quantity: 80, unit: 'm2', unitPriceHt: 24, vatRate: 10, enabled: true },
        { id: 'demo_108_line_002', label: 'Mise en œuvre et protection des accès', quantity: 1, unit: 'forfait', unitPriceHt: 780, vatRate: 10, enabled: true },
        { id: 'demo_108_line_003', label: 'Nettoyage et évacuation des déchets', quantity: 1, unit: 'forfait', unitPriceHt: 140, vatRate: 10, enabled: true },
      ],
    },
  },
  // 9. Perdu — Élodie Garnier — Portail motorisé
  {
    id: 'demo_109',
    projectNumber: 'DEV-2026-109',
    clientFirstName: 'Élodie',
    clientName: 'Garnier',
    clientPhone: '06 71 48 25 90',
    clientEmail: 'elodie.garnier@email.fr',
    siteAddress: '14 route de Neufchâtel',
    city: 'Isneauville',
    postalCode: '76230',
    trade: 'Portail / clôture',
    projectType: 'Motorisation portail battant',
    budget: '2 500 - 3 500 EUR',
    desiredTimeline: 'Sous 1 mois',
    maturity: 'Cloture',
    aiSummary:
      "Motorisation d'un portail battant existant. Le devis a été envoyé et discuté avec la cliente, qui l'a finalement refusé car le montant dépassait son budget prévu. Elle s'oriente vers un autre prestataire. Dossier clôturé comme perdu, aucune action commerciale supplémentaire recommandée.",
    appointment: { start: '2026-06-17T10:00:00.000Z' },
    completenessScore: 88,
    status: 'Perdu',
    source: 'chat-widget',
    devisAmount: 3980,
    photos: [],
    createdAt: '2026-06-16T09:00:00.000Z',
    updatedAt: '2026-06-22T09:30:00.000Z',
    lastInteractionAt: '2026-06-22T09:30:00.000Z',
    callbackDate: null,
    notes: 'Devis refusé : budget dépassé, la cliente se tourne vers un autre prestataire. Dossier clôturé.',
    depositStatus: 'cancelled',
    depositAmount: null,
    depositPaymentUrl: null,
    depositRequestedAt: null,
    depositPaidAt: null,
    quote: {
      status: 'declined',
      amount: 3980,
      sentAt: '2026-06-18T11:00:00.000Z',
      openedAt: '2026-06-19T18:30:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-18T11:00:00.000Z',
      declineReason: 'Montant trop élevé par rapport au budget prévu, choix d’un autre prestataire',
    },
    followUp: {
      status: 'none',
      date: null,
      channel: 'email',
      reason: 'Aucune relance supplémentaire nécessaire, dossier clôturé',
    },
    activity: [
      { id: 'demo_109_received', label: 'Dossier créé via le widget Kadria', date: '2026-06-16T09:00:00.000Z', kind: 'project' },
      { id: 'demo_109_visit', label: 'Visite technique réalisée', date: '2026-06-17T10:00:00.000Z', kind: 'project' },
      { id: 'demo_109_quote_sent', label: 'Devis envoyé au client', date: '2026-06-18T11:00:00.000Z', kind: 'quote' },
      { id: 'demo_109_quote_declined', label: 'Devis refusé par le client', date: '2026-06-22T09:30:00.000Z', kind: 'decision' },
      { id: 'demo_109_closed', label: 'Dossier clôturé comme perdu', date: '2026-06-22T09:35:00.000Z', kind: 'decision' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-109',
      clientName: 'Élodie Garnier',
      projectTitle: 'Motorisation portail battant',
      siteAddress: '14 route de Neufchâtel, 76230 Isneauville',
      validityDays: 21,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: '30% à la commande, solde à la mise en service.',
      clientNote: 'Devis incluant la fourniture du kit de motorisation et les réglages de fin de course.',
      lines: [
        { id: 'demo_109_line_001', label: 'Kit motorisation portail battant', quantity: 1, unit: 'ensemble', unitPriceHt: 2280, vatRate: 20, enabled: true },
        { id: 'demo_109_line_002', label: 'Pose, alimentation et réglages', quantity: 1, unit: 'forfait', unitPriceHt: 1100, vatRate: 20, enabled: true },
      ],
    },
  },
  // 10. Gagné — Marc Dubois — Dépannage WC suspendu
  {
    id: 'demo_110',
    projectNumber: 'DEV-2026-110',
    clientFirstName: 'Marc',
    clientName: 'Dubois',
    clientPhone: '06 19 47 63 82',
    clientEmail: 'marc.dubois@email.fr',
    siteAddress: '23 rue du Champ des Oiseaux',
    city: 'Rouen',
    postalCode: '76000',
    trade: 'Plomberie',
    projectType: 'Dépannage WC suspendu',
    budget: '400 - 600 EUR',
    desiredTimeline: 'Urgent',
    maturity: 'Cloture',
    aiSummary:
      "Réparation d'un WC suspendu désolidarisé du bâti-support. Devis accepté rapidement, intervention réalisée avec succès et client très satisfait. Dossier gagné et clôturé, une demande d'avis Google serait pertinente pour capitaliser sur ce retour positif.",
    appointment: { start: '2026-06-09T08:00:00.000Z' },
    completenessScore: 100,
    status: 'Gagné',
    source: 'voice',
    devisAmount: 480,
    photos: [],
    createdAt: '2026-06-08T18:00:00.000Z',
    updatedAt: '2026-06-12T16:20:00.000Z',
    lastInteractionAt: '2026-06-12T16:20:00.000Z',
    callbackDate: null,
    notes: 'Intervention réussie le 09/06, client très satisfait. Demander un avis Google pour capitaliser sur ce retour.',
    acceptedAt: '2026-06-10T09:00:00.000Z',
    depositStatus: 'not_requested',
    depositAmount: null,
    depositPaymentUrl: null,
    depositRequestedAt: null,
    depositPaidAt: null,
    quote: {
      status: 'accepted',
      amount: 480,
      sentAt: '2026-06-09T09:30:00.000Z',
      openedAt: '2026-06-09T12:00:00.000Z',
      openedCount: 1,
      validUntil: '2026-07-09T09:30:00.000Z',
    },
    followUp: {
      status: 'done',
      date: '2026-06-12T16:20:00.000Z',
      channel: 'email',
      reason: 'Demander un avis Google après une intervention réussie',
    },
    activity: [
      { id: 'demo_110_received', label: 'Dossier créé par appel vocal', date: '2026-06-08T18:00:00.000Z', kind: 'project' },
      { id: 'demo_110_visit', label: 'Intervention de dépannage réalisée', date: '2026-06-09T08:00:00.000Z', kind: 'project' },
      { id: 'demo_110_quote_sent', label: 'Devis envoyé au client', date: '2026-06-09T09:30:00.000Z', kind: 'quote' },
      { id: 'demo_110_quote_accepted', label: 'Devis accepté par le client', date: '2026-06-10T09:00:00.000Z', kind: 'decision' },
      { id: 'demo_110_closed', label: 'Dossier gagné et clôturé', date: '2026-06-12T16:20:00.000Z', kind: 'decision' },
      { id: 'demo_110_message', label: 'Retour client positif reçu', date: '2026-06-12T16:20:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEVIS-2026-110',
      clientName: 'Marc Dubois',
      projectTitle: 'Dépannage WC suspendu',
      siteAddress: '23 rue du Champ des Oiseaux, 76000 Rouen',
      validityDays: 15,
      defaultVat: 20,
      depositPercent: 0,
      paymentTerms: 'Paiement comptant à la fin de l’intervention.',
      clientNote: 'Intervention réalisée en urgence, remise en état du bâti-support et fixation du WC suspendu.',
      lines: [
        { id: 'demo_110_line_001', label: 'Diagnostic et dépose du WC suspendu', quantity: 1, unit: 'forfait', unitPriceHt: 120, vatRate: 20, enabled: true },
        { id: 'demo_110_line_002', label: 'Reprise fixation bâti-support', quantity: 1, unit: 'forfait', unitPriceHt: 240, vatRate: 20, enabled: true },
        { id: 'demo_110_line_003', label: 'Repose et étanchéité', quantity: 1, unit: 'forfait', unitPriceHt: 120, vatRate: 20, enabled: true },
      ],
    },
  },
];

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 'demo_evt_101',
    title: 'Rappel qualification - Camille Durand',
    date: '2026-07-04T09:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_101',
    status: 'Prevu',
    notes: 'Fuite active sous l’évier, à qualifier rapidement et proposer un créneau.',
  },
  {
    id: 'demo_evt_102',
    title: 'Visite technique - Laurent Martin',
    date: '2026-07-08T10:00:00.000Z',
    type: 'RDV',
    projectId: 'demo_102',
    status: 'Prevu',
    notes: 'Confirmer les finitions avant préparation du devis salle de bain.',
  },
  {
    id: 'demo_evt_103',
    title: 'Relance devis - Sophie Lefèvre',
    date: '2026-07-04T10:00:00.000Z',
    type: 'Relance',
    projectId: 'demo_103',
    status: 'Prevu',
    notes: 'Devis consulté deux fois sans validation, relance téléphonique recommandée.',
  },
  {
    id: 'demo_evt_104',
    title: 'Suivi acompte - Nicolas Dupont',
    date: '2026-07-05T09:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_104',
    status: 'Prevu',
    notes: 'Envoyer le lien d’acompte pour sécuriser la commande de la pompe à chaleur.',
  },
  {
    id: 'demo_evt_105',
    title: 'Relance acompte - Marion Petit',
    date: '2026-07-06T09:00:00.000Z',
    type: 'Relance',
    projectId: 'demo_105',
    status: 'En retard',
    notes: 'Acompte demandé depuis plus d’une semaine, à relancer.',
  },
  {
    id: 'demo_evt_106',
    title: 'Planification chantier - Thomas Bernard',
    date: '2026-07-07T09:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_106',
    status: 'Prevu',
    notes: 'Acompte reçu, confirmer une date d’intervention avec l’atelier.',
  },
  {
    id: 'demo_evt_107',
    title: 'RDV technique - Claire Moreau',
    date: '2026-07-08T14:00:00.000Z',
    type: 'RDV',
    projectId: 'demo_107',
    status: 'Prevu',
    notes: 'Vérifier la tache d’humidité signalée près de la fenêtre du salon.',
  },
  {
    id: 'demo_evt_108',
    title: 'Intervention chantier - Julien Rousseau',
    date: '2026-07-01T08:00:00.000Z',
    type: 'Intervention',
    projectId: 'demo_108',
    status: 'Realise',
    notes: 'Isolation des combles en cours, deuxième demi-journée le 03/07.',
  },
  {
    id: 'demo_evt_109',
    title: 'Suivi chantier - Julien Rousseau',
    date: '2026-07-05T09:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_108',
    status: 'Prevu',
    notes: 'Vérifier l’avancement et préparer la clôture du dossier.',
  },
  {
    id: 'demo_evt_110',
    title: 'Demande d’avis - Marc Dubois',
    date: '2026-06-13T09:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_110',
    status: 'Realise',
    notes: 'Intervention réussie, demander un avis Google.',
  },
];

// ── Helpers partages devis (extraits de app/demo-dashboard/projet/[id]/page.tsx
// pour etre reutilises par les nouvelles routes devis demo : detail et
// creation. Logique inchangee, simple deplacement pour eviter la duplication
// entre la fiche projet et les routes dediees. ────────────────────────────
export function buildFallbackQuoteBuilder(project: Partial<DemoProject> & { id?: string } | null | undefined): DemoQuoteBuilder {
  const clientName = [project?.clientFirstName, project?.clientName].filter(Boolean).join(' ') || 'Client demo';
  const cityLabel = [project?.postalCode, project?.city].filter(Boolean).join(' ');

  return {
    quoteNumber: project?.projectNumber?.replace('DEV-', 'DEVIS-') || `DEVIS-${project?.id || 'DEMO'}`,
    clientName,
    projectTitle: project?.projectType || project?.trade || 'Projet',
    siteAddress: [project?.siteAddress, cityLabel].filter(Boolean).join(', ') || 'Adresse chantier non renseignee',
    validityDays: 30,
    defaultVat: 20,
    depositPercent: 30,
    paymentTerms: 'Acompte a la validation, solde a la reception des travaux.',
    clientNote:
      'Ce devis est etabli sur la base des informations transmises. Une visite technique peut etre necessaire avant validation definitive.',
    lines: [
      {
        id: `fallback_${project?.id || 'demo'}_001`,
        label: project?.trade ? `Intervention ${project.trade.toLowerCase()}` : 'Prestation principale',
        quantity: 1,
        unit: 'forfait',
        unitPriceHt: Number((project as { quote?: { amount?: number | null } })?.quote?.amount || project?.devisAmount || 850),
        vatRate: 20,
        enabled: true,
      },
    ],
  };
}

export function normalizeQuoteBuilder(project: DemoProject | null | undefined): DemoQuoteBuilder {
  const fallback = buildFallbackQuoteBuilder(project);
  const builder = project?.quoteBuilder;

  return {
    ...fallback,
    ...builder,
    lines:
      builder?.lines?.length
        ? builder.lines.map((line: DemoQuoteBuilderLine) => ({
            ...line,
            enabled: line.enabled !== false,
          }))
        : fallback.lines,
  };
}

export function computeQuoteBuilderSummary(lines: DemoQuoteBuilderLine[], depositPercent: number) {
  const enabledLines = lines.filter((line) => line.enabled !== false);
  const totalHt = enabledLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPriceHt || 0), 0);
  const totalVat = enabledLines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPriceHt || 0) * (Number(line.vatRate || 0) / 100),
    0
  );
  const totalTtc = totalHt + totalVat;
  const depositAmount = totalTtc * (Number(depositPercent || 0) / 100);
  const balanceAmount = totalTtc - depositAmount;

  return {
    enabledLines,
    totalHt,
    totalVat,
    totalTtc,
    depositAmount,
    balanceAmount,
  };
}

// Statut/badge devis derive de project.quote (ou fallback sur project.status)
// — extrait de buildDemoDevisList dans la fiche projet pour etre reutilise
// par les routes devis dediees sans dupliquer la logique de derivation.
export interface DemoDevisListItem {
  id: string;
  numero: string;
  token?: string;
  amount: number;
  sent: boolean;
  statut: string;
  pdf_url: string | null;
  date_emission: string;
  date_validite: string;
  client_email: string;
  opens_count: number;
  last_opened_date: string | null;
  accepted: boolean;
  accepted_at: string | null;
  quote_sent_at?: string;
  last_follow_up_at?: string | null;
  follow_up_count?: number;
  declined?: boolean;
  declined_at?: string | null;
  decline_reason?: string | null;
  follow_up_disabled?: boolean;
}

const DEMO_STATUS_NORMALIZATION: Record<string, string> = {
  'A rappeler': 'À rappeler',
  'Qualifie': 'Qualifié',
  'Devis envoye': 'Devis envoyé',
  'Devis accepte': 'Devis accepté',
  'Acompte demande': 'Acompte demandé',
  'Acompte paye': 'Acompte payé',
  'Realisation du projet': 'Réalisation du projet',
  'Gagne': 'Gagné',
};

function normalizeDemoStatus(status?: string | null) {
  return DEMO_STATUS_NORMALIZATION[status || ''] || status || 'Nouveau';
}

export function buildDemoDevisList(project: DemoProject | null | undefined): DemoDevisListItem[] {
  if (!project) return [];
  const quote = project.quote;
  const normalizedStatus = normalizeDemoStatus(project.status);
  const shouldHaveQuote =
    quote?.status && quote.status !== 'none'
      ? true
      : normalizedStatus === 'Devis envoyé' || normalizedStatus === 'Gagné' || Number(project.devisAmount || 0) > 0;
  if (!shouldHaveQuote) return [];

  const amount = Number(quote?.amount ?? project.devisAmount ?? 0) || 8600;
  const sent = quote?.status === 'sent' || quote?.status === 'opened' || quote?.status === 'accepted' || quote?.status === 'declined';
  const accepted = quote?.status === 'accepted' || normalizedStatus === 'Gagné';
  const declined = quote?.status === 'declined' || normalizedStatus === 'Perdu';
  const quoteSentAt = quote?.sentAt || project.quoteSentAt || (sent ? project.createdAt : undefined);
  const openedCount = typeof quote?.openedCount === 'number' ? quote.openedCount : project.opensCount || 0;
  const openedAt = quote?.openedAt || (openedCount > 0 ? project.createdAt : null);
  const validUntil = quote?.validUntil || project.createdAt;

  const statut =
    quote?.status === 'draft'
      ? 'Brouillon'
      : quote?.status === 'accepted'
        ? 'Accepté'
        : quote?.status === 'declined'
          ? 'Refusé'
          : sent
            ? 'Envoyé'
            : 'Brouillon';

  return [
    {
      id: `demo-devis-${project.id}`,
      numero: project.projectNumber?.replace('DEV-', 'DEVIS-') || 'DEVIS-DEMO-001',
      token: `demo-${project.id}`,
      amount,
      sent,
      statut,
      pdf_url: null,
      date_emission: quoteSentAt || project.createdAt,
      date_validite: validUntil,
      client_email: project.clientEmail || '',
      opens_count: openedCount,
      last_opened_date: openedAt,
      accepted,
      accepted_at: accepted ? (project.followUp?.date || openedAt || quoteSentAt || project.createdAt) : null,
      quote_sent_at: quoteSentAt,
      last_follow_up_at: project.followUp?.status !== 'none' && project.followUp?.status !== 'planned' ? project.followUp?.date : null,
      follow_up_count: project.followUp?.status === 'done' ? 1 : project.followUp?.status === 'late' ? 1 : 0,
      declined,
      declined_at: declined ? (project.followUp?.date || openedAt || quoteSentAt || project.createdAt) : null,
      decline_reason: quote?.declineReason || null,
      follow_up_disabled: false,
    },
  ];
}

// Notifications artisan mockees, alignees sur la forme reelle
// (ArtisanNotification, src/lib/notifications.ts) mais tenues localement :
// jamais d'appel a /api/notifications depuis la demo (cf. DemoNotificationBell).
export interface DemoNotification {
  id: string;
  projectId: string | null;
  type:
    | 'new_project'
    | 'client_message'
    | 'client_info_updated'
    | 'quote_sent'
    | 'quote_accepted'
    | 'quote_declined'
    | 'deposit_requested'
    | 'deposit_paid'
    | 'followup_due'
    | 'appointment_due'
    | 'status_changed'
    | 'system';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  status: 'unread' | 'read';
  actionUrl: string | null;
  createdAt: string;
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'demo_notif_101',
    projectId: 'demo_101',
    type: 'new_project',
    title: 'Nouveau dossier urgent',
    message: 'Camille Durand signale une fuite active sous l’évier de cuisine, intervention à qualifier rapidement.',
    priority: 'high',
    status: 'unread',
    actionUrl: '/demo-dashboard/projet/demo_101',
    createdAt: '2026-07-03T19:20:00.000Z',
  },
  {
    id: 'demo_notif_102',
    projectId: 'demo_103',
    type: 'client_message',
    title: 'Nouveau message client',
    message: 'Sophie Lefèvre : "J\'ai bien reçu le devis, je le regarde ce week-end et je reviens vers vous lundi."',
    priority: 'high',
    status: 'unread',
    actionUrl: '/demo-dashboard/projet/demo_103',
    createdAt: '2026-06-30T20:05:00.000Z',
  },
  {
    id: 'demo_notif_103',
    projectId: 'demo_102',
    type: 'client_info_updated',
    title: 'Photos et informations ajoutées',
    message: 'Laurent Martin a complété son dossier salle de bain et ajouté des photos.',
    priority: 'medium',
    status: 'unread',
    actionUrl: '/demo-dashboard/projet/demo_102',
    createdAt: '2026-06-30T18:40:00.000Z',
  },
  {
    id: 'demo_notif_104',
    projectId: 'demo_104',
    type: 'quote_accepted',
    title: 'Devis accepté',
    message: 'Nicolas Dupont a accepté le devis pompe à chaleur. Pensez à demander l’acompte.',
    priority: 'high',
    status: 'unread',
    actionUrl: '/demo-dashboard/projet/demo_104',
    createdAt: '2026-06-27T09:45:00.000Z',
  },
  {
    id: 'demo_notif_105',
    projectId: 'demo_106',
    type: 'deposit_paid',
    title: 'Acompte encaissé',
    message: 'L’acompte du dossier de Thomas Bernard (dressing sur mesure) a été réglé en ligne.',
    priority: 'high',
    status: 'read',
    actionUrl: '/demo-dashboard/projet/demo_106',
    createdAt: '2026-06-20T08:50:00.000Z',
  },
  {
    id: 'demo_notif_106',
    projectId: 'demo_105',
    type: 'followup_due',
    title: 'Relance acompte à faire',
    message: 'L’acompte de Marion Petit (terrasse bois) est demandé depuis plus d’une semaine sans règlement.',
    priority: 'medium',
    status: 'read',
    actionUrl: '/demo-dashboard/projet/demo_105',
    createdAt: '2026-07-02T18:30:00.000Z',
  },
  {
    id: 'demo_notif_107',
    projectId: 'demo_107',
    type: 'appointment_due',
    title: 'Rendez-vous du jour',
    message: 'Rendez-vous technique prévu chez Claire Moreau pour la peinture du salon.',
    priority: 'medium',
    status: 'read',
    actionUrl: '/demo-dashboard/projet/demo_107',
    createdAt: '2026-06-29T12:15:00.000Z',
  },
  {
    id: 'demo_notif_108',
    projectId: 'demo_110',
    type: 'system',
    title: 'Avis Google à demander',
    message: 'Le dossier de Marc Dubois est gagné : c’est le bon moment pour solliciter un avis Google.',
    priority: 'low',
    status: 'read',
    actionUrl: '/demo-dashboard/projet/demo_110',
    createdAt: '2026-06-12T16:20:00.000Z',
  },
];

export function computeDemoKPIs(projects: DemoProject[]) {
  const parseBudget = (budget: string) => {
    const matches = budget.match(/\d+[\s\d]*/g);
    if (!matches) return 0;
    const values = matches
      .map((value) => parseInt(value.replace(/\s/g, ''), 10))
      .filter((value) => !Number.isNaN(value));
    return values.length ? Math.max(...values) : 0;
  };

  const amount = (project: DemoProject) => project.devisAmount ?? parseBudget(project.budget);
  const active = projects.filter((project) => normalizeDemoStatus(project.status) !== 'Perdu');
  const won = projects.filter((project) => normalizeDemoStatus(project.status) === 'Gagné');
  const quotes = projects.filter((project) => normalizeDemoStatus(project.status) === 'Devis envoyé');
  const hot = projects.filter((project) => project.completenessScore >= 90 && amount(project) >= 5000);
  const risk = projects.filter(
    (project) =>
      normalizeDemoStatus(project.status) === 'À rappeler' ||
      normalizeDemoStatus(project.status) === 'Devis envoyé' ||
      project.completenessScore < 70,
  );

  return {
    caTotal: active.reduce((sum, project) => sum + amount(project), 0),
    devisTotal: quotes.reduce((sum, project) => sum + amount(project), 0),
    gagneTotal: won.reduce((sum, project) => sum + amount(project), 0),
    panierMoyen: active.length ? Math.round(active.reduce((sum, project) => sum + amount(project), 0) / active.length) : 0,
    tauxTransfo: projects.length ? Math.round((won.length / projects.length) * 100) : 0,
    aRelancer: projects.filter((project) => normalizeDemoStatus(project.status) === 'À rappeler').length,
    prospectsChauds: hot.length,
    dossiersEnRisque: risk.length,
  };
}
