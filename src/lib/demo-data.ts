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
  opensCount?: number;
  callbackDate: string | null;
  notes: string;
  quote?: DemoQuoteState;
  followUp?: DemoFollowUpState;
  activity?: DemoActivityItem[];
  quoteBuilder?: DemoQuoteBuilder;
}

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
  {
    id: 'demo_001',
    projectNumber: 'DEV-2026-001',
    clientFirstName: 'Marie',
    clientName: 'Leroy',
    clientPhone: '06 23 45 67 89',
    clientEmail: 'marie.leroy@email.fr',
    siteAddress: '8 rue Victor Hugo',
    city: 'Lyon 3e',
    postalCode: '69003',
    trade: 'Plomberie',
    projectType: 'Renovation salle de bain',
    budget: '8 000 - 12 000 EUR',
    desiredTimeline: 'Sous 1 mois',
    maturity: 'Pret a demarrer',
    aiSummary: "Renovation complete d'une salle de bain de 7m2. Cliente reactive, budget coherent, besoin exploitable pour transmettre un devis rapidement.",
    completenessScore: 94,
    status: 'A rappeler',
    source: 'chat-widget',
    devisAmount: null,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=900&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=200&auto=format&fit=crop',
      },
    ],
    createdAt: '2026-06-20T09:30:00.000Z',
    callbackDate: '2026-06-21T10:00:00.000Z',
    notes: 'Cliente tres reactive, visite technique a proposer rapidement.',
    quote: {
      status: 'none',
      amount: null,
      validUntil: null,
      openedCount: 0,
    },
    followUp: {
      status: 'planned',
      date: '2026-06-29T10:30:00.000Z',
      channel: 'phone',
      reason: 'Projet chaud a qualifier avant preparation du devis',
    },
    activity: [
      { id: 'demo_001_received', label: 'Demande recue via le widget', date: '2026-06-20T09:30:00.000Z', kind: 'project' },
      { id: 'demo_001_qualified', label: 'Dossier qualifie avec photos fournies', date: '2026-06-20T11:10:00.000Z', kind: 'project' },
      { id: 'demo_001_followup', label: 'Relance de qualification planifiee', date: '2026-06-29T10:30:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEV-2026-001',
      clientName: 'Marie Leroy',
      projectTitle: 'Renovation salle de bain',
      siteAddress: '8 rue Victor Hugo, 69003 Lyon 3e',
      validityDays: 30,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: 'Acompte a la validation, solde a la reception des travaux.',
      clientNote:
        'Base de devis preparee a partir des photos et des informations transmises. Une visite technique permettra de confirmer les finitions et le planning.',
      lines: [
        { id: 'demo_001_line_001', label: 'Depose des equipements existants', quantity: 1, unit: 'forfait', unitPriceHt: 420, vatRate: 20, enabled: true },
        { id: 'demo_001_line_002', label: 'Fourniture douche et receveur', quantity: 1, unit: 'ensemble', unitPriceHt: 2290, vatRate: 20, enabled: true },
        { id: 'demo_001_line_003', label: 'Meuble vasque et robinetterie', quantity: 1, unit: 'ensemble', unitPriceHt: 1380, vatRate: 20, enabled: true },
        { id: 'demo_001_line_004', label: 'Pose, raccordements et finitions', quantity: 1, unit: 'forfait', unitPriceHt: 2640, vatRate: 20, enabled: true },
      ],
    },
  },
  {
    id: 'demo_002',
    projectNumber: 'DEV-2026-002',
    clientFirstName: 'Jean-Pierre',
    clientName: 'Martin',
    clientPhone: '06 34 56 78 90',
    clientEmail: 'jp.martin@email.fr',
    siteAddress: '22 allee des Tilleuls',
    city: 'Nantes',
    postalCode: '44000',
    trade: 'Couverture',
    projectType: 'Refection toiture',
    budget: '15 000 - 20 000 EUR',
    desiredTimeline: 'Sous 2 semaines',
    maturity: 'Urgent',
    aiSummary: 'Fuite constatee sur toiture en tuiles, intervention urgente necessaire. Bonne disponibilite du client.',
    appointment: { start: '2026-07-02T09:00:00.000Z' },
    completenessScore: 95,
    status: 'Qualifie',
    source: 'voice',
    devisAmount: null,
    photos: [],
    createdAt: '2026-06-20T06:15:00.000Z',
    callbackDate: null,
    notes: 'Priorite haute avant prochaine pluie.',
    quote: {
      status: 'draft',
      amount: 16400,
      validUntil: '2026-07-20T06:15:00.000Z',
      openedCount: 0,
    },
    followUp: {
      status: 'today',
      date: '2026-06-28T16:00:00.000Z',
      channel: 'phone',
      reason: 'Valider la visite toiture avant envoi du devis',
    },
    activity: [
      { id: 'demo_002_received', label: 'Demande recue en urgence', date: '2026-06-20T06:15:00.000Z', kind: 'project' },
      { id: 'demo_002_draft', label: 'Devis prepare en brouillon', date: '2026-06-20T09:45:00.000Z', kind: 'quote' },
      { id: 'demo_002_followup', label: 'Appel de validation prevu aujourd hui', date: '2026-06-28T16:00:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEV-2026-002',
      clientName: 'Jean-Pierre Martin',
      projectTitle: 'Refection toiture',
      siteAddress: '22 allee des Tilleuls, 44000 Nantes',
      validityDays: 21,
      defaultVat: 10,
      depositPercent: 35,
      paymentTerms: '35% a la commande, solde a la fin du chantier apres controle.',
      clientNote:
        'Devis prepare a partir du diagnostic initial. Une verification sur toiture pourra ajuster la quantite de tuiles et les reprises de zinguerie.',
      lines: [
        { id: 'demo_002_line_001', label: 'Mise en securite et acces toiture', quantity: 1, unit: 'forfait', unitPriceHt: 380, vatRate: 10, enabled: true },
        { id: 'demo_002_line_002', label: 'Remplacement tuiles et ecran sous-toiture', quantity: 42, unit: 'm2', unitPriceHt: 185, vatRate: 10, enabled: true },
        { id: 'demo_002_line_003', label: 'Reprises de zinguerie', quantity: 1, unit: 'forfait', unitPriceHt: 950, vatRate: 10, enabled: true },
        { id: 'demo_002_line_004', label: 'Nettoyage et evacuation', quantity: 1, unit: 'forfait', unitPriceHt: 420, vatRate: 10, enabled: true },
      ],
    },
  },
  {
    id: 'demo_003',
    projectNumber: 'DEV-2026-003',
    clientFirstName: 'Laurent',
    clientName: 'Dubois',
    clientPhone: '06 78 90 12 34',
    clientEmail: 'laurent.dubois@email.fr',
    siteAddress: '17 avenue Foch',
    city: 'Rouen',
    postalCode: '76000',
    trade: 'Plomberie',
    projectType: 'Remplacement chauffe-eau',
    budget: '1 000 - 3 000 EUR',
    desiredTimeline: 'Sous 1 semaine',
    maturity: 'Pret a demarrer',
    aiSummary: 'Chauffe-eau en panne, besoin clair, decisionnaire identifie et attente d un devis rapide avant validation.',
    appointment: { start: '2026-06-20T14:00:00.000Z' },
    completenessScore: 88,
    status: 'Devis envoye',
    source: 'chat-widget',
    devisAmount: 1776,
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
    createdAt: '2026-06-18T14:00:00.000Z',
    callbackDate: null,
    notes: 'Devis envoye le 18/06, relance recommandee avant la fin de semaine si le client ne confirme pas.',
    quote: {
      status: 'opened',
      amount: 1776,
      sentAt: '2026-06-18T16:40:00.000Z',
      openedAt: '2026-06-19T09:20:00.000Z',
      openedCount: 2,
      validUntil: '2026-07-18T16:40:00.000Z',
    },
    followUp: {
      status: 'late',
      date: '2026-06-25T10:00:00.000Z',
      channel: 'email',
      reason: 'Devis ouvert 2 fois sans retour client',
    },
    activity: [
      { id: 'demo_003_received', label: 'Demande complete recue', date: '2026-06-18T14:00:00.000Z', kind: 'project' },
      { id: 'demo_003_qualified', label: 'Dossier qualifie par l assistant', date: '2026-06-18T14:30:00.000Z', kind: 'project' },
      { id: 'demo_003_quote_sent', label: 'Devis envoye au client', date: '2026-06-18T16:40:00.000Z', kind: 'quote' },
      { id: 'demo_003_quote_opened', label: 'Le client a ouvert le devis', date: '2026-06-19T09:20:00.000Z', kind: 'quote' },
      { id: 'demo_003_followup', label: 'Relance commerciale depassee', date: '2026-06-25T10:00:00.000Z', kind: 'followup' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEV-2026-006',
      clientName: 'Laurent Dubois',
      projectTitle: 'Remplacement chauffe-eau',
      siteAddress: '17 avenue Foch, Rouen',
      validityDays: 30,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: 'Acompte a la validation, solde a la reception des travaux.',
      clientNote:
        'Ce devis est etabli sur la base des informations transmises. Une visite technique peut etre necessaire avant validation definitive.',
      lines: [
        { id: 'demo_003_line_001', label: 'Depose ancien chauffe-eau', quantity: 1, unit: 'forfait', unitPriceHt: 180, vatRate: 20, enabled: true },
        { id: 'demo_003_line_002', label: 'Fourniture chauffe-eau 200L', quantity: 1, unit: 'unite', unitPriceHt: 790, vatRate: 20, enabled: true },
        { id: 'demo_003_line_003', label: 'Pose et raccordement', quantity: 1, unit: 'forfait', unitPriceHt: 420, vatRate: 20, enabled: true },
        { id: 'demo_003_line_004', label: 'Mise en service et controle', quantity: 1, unit: 'forfait', unitPriceHt: 90, vatRate: 20, enabled: true },
      ],
    },
  },
  {
    id: 'demo_004',
    projectNumber: 'DEV-2026-004',
    clientFirstName: 'Ahmed',
    clientName: 'Benali',
    clientPhone: '06 56 78 90 12',
    clientEmail: 'ahmed.benali@email.fr',
    siteAddress: '14 rue de la Republique',
    city: 'Paris 11e',
    postalCode: '75011',
    trade: 'Electricite',
    projectType: 'Remise aux normes tableau electrique',
    budget: '3 000 - 5 000 EUR',
    desiredTimeline: 'Des que possible',
    maturity: 'Pret a demarrer',
    aiSummary: "Tableau electrique vetuste, mise aux normes necessaire avant vente. Budget confirme, client disponible.",
    completenessScore: 91,
    status: 'Gagne',
    source: 'chat-widget',
    devisAmount: 4200,
    photos: [],
    createdAt: '2026-06-15T11:30:00.000Z',
    callbackDate: null,
    notes: 'Chantier planifie la semaine prochaine.',
    quote: {
      status: 'accepted',
      amount: 4200,
      sentAt: '2026-06-15T17:15:00.000Z',
      openedAt: '2026-06-16T08:45:00.000Z',
      openedCount: 3,
      validUntil: '2026-07-15T17:15:00.000Z',
    },
    followUp: {
      status: 'done',
      date: '2026-06-17T09:30:00.000Z',
      channel: 'phone',
      reason: 'Validation finale avant planification du chantier',
    },
    activity: [
      { id: 'demo_004_received', label: 'Demande recue avec urgence vente', date: '2026-06-15T11:30:00.000Z', kind: 'project' },
      { id: 'demo_004_quote_sent', label: 'Devis envoye et explique au telephone', date: '2026-06-15T17:15:00.000Z', kind: 'quote' },
      { id: 'demo_004_quote_opened', label: 'Devis consulte par le client', date: '2026-06-16T08:45:00.000Z', kind: 'quote' },
      { id: 'demo_004_quote_accepted', label: 'Devis accepte par le client', date: '2026-06-17T09:30:00.000Z', kind: 'decision' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEV-2026-004',
      clientName: 'Ahmed Benali',
      projectTitle: 'Remise aux normes tableau electrique',
      siteAddress: '14 rue de la Republique, 75011 Paris',
      validityDays: 30,
      defaultVat: 20,
      depositPercent: 30,
      paymentTerms: 'Acompte de 30% a la commande, solde a la livraison du chantier.',
      clientNote:
        'Le devis reprend les remarques faites lors de l echange telephonique. Une visite de confirmation pourra ajuster la longueur des gaines et accessoires.',
      lines: [
        { id: 'demo_004_line_001', label: 'Depose tableau existant', quantity: 1, unit: 'forfait', unitPriceHt: 280, vatRate: 20, enabled: true },
        { id: 'demo_004_line_002', label: 'Fourniture tableau et protections', quantity: 1, unit: 'ensemble', unitPriceHt: 1460, vatRate: 20, enabled: true },
        { id: 'demo_004_line_003', label: 'Recablage et reperage', quantity: 1, unit: 'forfait', unitPriceHt: 980, vatRate: 20, enabled: true },
        { id: 'demo_004_line_004', label: 'Essais et attestation de mise en securite', quantity: 1, unit: 'forfait', unitPriceHt: 780, vatRate: 20, enabled: true },
      ],
    },
  },
  {
    id: 'demo_005',
    projectNumber: 'DEV-2026-005',
    clientFirstName: 'Sophie',
    clientName: 'Fontaine',
    clientPhone: '06 67 89 01 23',
    clientEmail: 'sophie.fontaine@email.fr',
    siteAddress: '3 impasse des Lilas',
    city: 'Bordeaux',
    postalCode: '33000',
    trade: 'Paysagisme',
    projectType: 'Entretien jardin',
    budget: '500 - 1 000 EUR',
    desiredTimeline: 'Pas urgent',
    maturity: 'Je me renseigne',
    aiSummary: "Demande d'entretien ponctuel de jardin. Projet peu prioritaire, faible budget, peu urgent.",
    completenessScore: 62,
    status: 'Perdu',
    source: 'chat-widget',
    devisAmount: null,
    photos: [],
    createdAt: '2026-06-12T16:45:00.000Z',
    callbackDate: null,
    notes: 'La cliente a choisi un autre prestataire.',
    quote: {
      status: 'declined',
      amount: 890,
      sentAt: '2026-06-13T10:00:00.000Z',
      openedAt: '2026-06-13T18:10:00.000Z',
      openedCount: 1,
      validUntil: '2026-07-13T10:00:00.000Z',
      declineReason: 'Budget reporte et choix d un autre prestataire',
    },
    followUp: {
      status: 'none',
      date: null,
      channel: 'email',
      reason: 'Aucune relance supplementaire necessaire',
    },
    activity: [
      { id: 'demo_005_received', label: 'Demande recue pour entretien ponctuel', date: '2026-06-12T16:45:00.000Z', kind: 'project' },
      { id: 'demo_005_quote_sent', label: 'Devis simplifie envoye', date: '2026-06-13T10:00:00.000Z', kind: 'quote' },
      { id: 'demo_005_quote_declined', label: 'Devis refuse par le client', date: '2026-06-14T09:00:00.000Z', kind: 'decision' },
    ],
    quoteBuilder: {
      quoteNumber: 'DEV-2026-005',
      clientName: 'Sophie Fontaine',
      projectTitle: 'Entretien jardin',
      siteAddress: '3 impasse des Lilas, 33000 Bordeaux',
      validityDays: 15,
      defaultVat: 20,
      depositPercent: 20,
      paymentTerms: 'Paiement comptant a la fin de l intervention.',
      clientNote:
        'Estimation indicative pour un passage ponctuel. Le devis pourra etre ajuste selon le volume de dechets verts et l acces au jardin.',
      lines: [
        { id: 'demo_005_line_001', label: 'Tonte et debroussaillage', quantity: 1, unit: 'forfait', unitPriceHt: 240, vatRate: 20, enabled: true },
        { id: 'demo_005_line_002', label: 'Taille des haies', quantity: 12, unit: 'ml', unitPriceHt: 18, vatRate: 20, enabled: true },
        { id: 'demo_005_line_003', label: 'Evacuation des dechets verts', quantity: 1, unit: 'forfait', unitPriceHt: 95, vatRate: 20, enabled: true },
      ],
    },
  },
  {
    id: 'demo_006',
    projectNumber: 'DEV-2026-006',
    clientFirstName: 'Laurent',
    clientName: 'Dubois',
    clientPhone: '06 78 90 12 34',
    clientEmail: 'laurent.dubois@email.fr',
    siteAddress: '17 avenue Foch',
    city: 'Rouen',
    postalCode: '76000',
    trade: 'Plomberie',
    projectType: 'Remplacement chauffe-eau',
    budget: '1 000 - 3 000 EUR',
    desiredTimeline: 'Sous 1 semaine',
    maturity: 'Pret a demarrer',
    aiSummary: 'Chauffe-eau en panne, remplacement necessaire rapidement. Client clair sur le besoin.',
    completenessScore: 88,
    status: 'Nouveau',
    source: 'voice',
    devisAmount: null,
    photos: [],
    createdAt: '2026-06-20T12:30:00.000Z',
    callbackDate: null,
    notes: '',
  },
  {
    id: 'demo_007',
    projectNumber: 'DEV-2026-007',
    clientFirstName: 'Isabelle',
    clientName: 'Moreau',
    clientPhone: '06 89 01 23 45',
    clientEmail: 'isabelle.moreau@email.fr',
    siteAddress: '9 rue des Erables',
    city: 'Toulouse',
    postalCode: '31000',
    trade: 'Renovation globale',
    projectType: 'Renovation cuisine',
    budget: '10 000 - 15 000 EUR',
    desiredTimeline: 'Sous 1 mois',
    maturity: 'RDV non confirme',
    aiSummary: "Renovation complete d'une cuisine de 12m2. Rendez-vous propose mais jamais confirme par la cliente, dossier a relancer en urgence.",
    appointment: { start: '2026-06-19T15:00:00.000Z' },
    completenessScore: 80,
    status: 'A rappeler',
    source: 'chat-widget',
    devisAmount: null,
    photos: [],
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-05T10:00:00.000Z',
    lastInteractionAt: '2026-06-05T10:00:00.000Z',
    callbackDate: '2026-06-19T15:00:00.000Z',
    notes: 'Rendez-vous propose le 19/06 mais jamais confirme, aucune nouvelle depuis.',
  },
];

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 'demo_evt_001',
    title: 'Visite technique - Claire Petit',
    date: '2026-06-20T14:00:00.000Z',
    type: 'RDV',
    projectId: 'demo_003',
    status: 'Prevu',
    notes: 'Apporter le devis detaille.',
  },
  {
    id: 'demo_evt_002',
    title: 'Relance - Marie Leroy',
    date: '2026-06-21T10:00:00.000Z',
    type: 'Relance',
    projectId: 'demo_001',
    status: 'Prevu',
    notes: '',
  },
  {
    id: 'demo_evt_003',
    title: 'Intervention - Ahmed Benali',
    date: '2026-06-23T09:00:00.000Z',
    type: 'Intervention',
    projectId: 'demo_004',
    status: 'Prevu',
    notes: 'Prevoir materiel tableau electrique.',
  },
  {
    id: 'demo_evt_004',
    title: 'Rappel - Jean-Pierre Martin',
    date: '2026-06-19T16:00:00.000Z',
    type: 'Rappel',
    projectId: 'demo_002',
    status: 'En retard',
    notes: 'Urgence toiture.',
  },
  {
    id: 'demo_evt_005',
    title: 'RDV non confirme - Isabelle Moreau',
    date: '2026-06-19T15:00:00.000Z',
    type: 'RDV',
    projectId: 'demo_007',
    status: 'En retard',
    notes: 'Rendez-vous jamais confirme par la cliente.',
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
  const active = projects.filter((project) => project.status !== 'Perdu');
  const won = projects.filter((project) => project.status === 'Gagne');
  const quotes = projects.filter((project) => project.status === 'Devis envoye');
  const hot = projects.filter((project) => project.completenessScore >= 90 && amount(project) >= 5000);
  const risk = projects.filter(
    (project) =>
      project.status === 'A rappeler' ||
      project.status === 'Devis envoye' ||
      project.completenessScore < 70,
  );

  return {
    caTotal: active.reduce((sum, project) => sum + amount(project), 0),
    devisTotal: quotes.reduce((sum, project) => sum + amount(project), 0),
    gagneTotal: won.reduce((sum, project) => sum + amount(project), 0),
    panierMoyen: active.length ? Math.round(active.reduce((sum, project) => sum + amount(project), 0) / active.length) : 0,
    tauxTransfo: projects.length ? Math.round((won.length / projects.length) * 100) : 0,
    aRelancer: projects.filter((project) => project.status === 'A rappeler').length,
    prospectsChauds: hot.length,
    dossiersEnRisque: risk.length,
  };
}
