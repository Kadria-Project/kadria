'use client';

export interface DemoPhoto {
  url: string;
  thumbnailUrl: string;
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
    completenessScore: 95,
    status: 'Qualifie',
    source: 'voice',
    devisAmount: null,
    photos: [],
    createdAt: '2026-06-20T06:15:00.000Z',
    callbackDate: null,
    notes: 'Priorite haute avant prochaine pluie.',
  },
  {
    id: 'demo_003',
    projectNumber: 'DEV-2026-003',
    clientFirstName: 'Claire',
    clientName: 'Petit',
    clientPhone: '06 45 67 89 01',
    clientEmail: 'cj.petit@email.fr',
    siteAddress: '5 chemin des Vignes',
    city: 'Lyon 6e',
    postalCode: '69006',
    trade: 'Renovation globale',
    projectType: 'Renovation complete appartement',
    budget: '80 000 - 100 000 EUR',
    desiredTimeline: 'Sous 3 mois',
    maturity: 'En reflexion avancee',
    aiSummary: "Renovation complete d'un appartement de 90m2. Couple en comparaison de devis, niveau de maturite eleve.",
    completenessScore: 97,
    status: 'Devis envoye',
    source: 'chat-widget',
    devisAmount: 88000,
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
    notes: 'Devis envoye le 18/06, relance recommandee avant le 25/06.',
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
