import { ARTISAN_TRADES } from '@/src/config/trades';

export type ResourceCategory =
  | 'Cas d’utilisation'
  | 'Guide'
  | 'Nouveautés'
  | 'Fonctionnalité'
  | 'Métier';

export type ResourceType = 'article' | 'guide' | 'patch-note';

export type ResourceContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'cardGrid'; items: { title: string; text: string }[] }
  | { type: 'badgeGrid'; items: string[] };

export interface ResourceCta {
  title: string;
  text: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface Resource {
  slug: string;
  title: string;
  category: ResourceCategory;
  type: ResourceType;
  excerpt: string;
  readingTime: string;
  publishedAt: string;
  content: ResourceContentBlock[];
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroIntro?: string;
  cta?: ResourceCta;
}

export const RESOURCE_CATEGORY_SLUGS: Record<ResourceCategory, string> = {
  'Cas d’utilisation': 'cas-utilisation',
  Guide: 'guides',
  Nouveautés: 'nouveautes',
  Fonctionnalité: 'fonctionnalites',
  Métier: 'metiers',
};

const COMPATIBLE_TRADES = ARTISAN_TRADES
  .filter((trade) => trade.value !== 'autre')
  .map((trade) => trade.label)
  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const COMPATIBLE_TRADE_GROUPS = chunkItems(COMPATIBLE_TRADES, 18);

export const RESOURCES: Resource[] = [
  {
    slug: 'profil-metier-kadria',
    title: "Le Profil Métier Kadria : pourquoi chaque artisan bénéficie d'une expérience adaptée à son métier",
    category: 'Fonctionnalité',
    type: 'guide',
    excerpt:
      "Découvrez comment Kadria adapte les questions, les dossiers et le suivi commercial à chaque artisan, avec plus de 86 métiers déjà compatibles.",
    readingTime: '12 min',
    publishedAt: '2026-07-08',
    featured: true,
    seoTitle: 'Le Profil Métier Kadria | 86 métiers déjà compatibles',
    seoDescription:
      'Découvrez comment le Profil Métier Kadria adapte les échanges, les dossiers et les informations collectées selon votre activité.',
    heroTitle: 'Le Profil Métier Kadria',
    heroSubtitle:
      "Parce qu’un paysagiste, un plombier et un couvreur n’attendent ni les mêmes questions, ni les mêmes priorités commerciales.",
    heroIntro:
      "Kadria n’applique pas un formulaire unique à tous les artisans. Le produit adapte les informations demandées, la structure du dossier et les prochaines actions à votre activité terrain.",
    cta: {
      title: 'Votre métier est déjà prêt.',
      text: "Choisissez votre métier lors de l’inscription et découvrez immédiatement une expérience plus pertinente pour vos demandes entrantes.",
      primaryLabel: 'Essayer gratuitement',
      primaryHref: '/register',
      secondaryLabel: 'Voir les métiers compatibles',
      secondaryHref: '/ressources/metiers',
    },
    content: [
      { type: 'heading', text: 'Pourquoi un Profil Métier ?' },
      {
        type: 'paragraph',
        text: "Une fuite de plomberie, un dépannage électrique, une terrasse paysagère ou une urgence toiture ne demandent pas les mêmes informations. Le Profil Métier permet à Kadria de qualifier chaque demande selon le vrai contexte du métier.",
      },
      {
        type: 'list',
        items: [
          'Questions adaptées au métier et au type de chantier',
          'Dossiers mieux structurés dès le premier contact',
          'Priorisation commerciale plus crédible',
          'Préparation du devis plus rapide',
          'Relances plus cohérentes avec le terrain',
        ],
      },
      { type: 'heading', text: 'Ce que cela change pour l’artisan' },
      {
        type: 'cardGrid',
        items: [
          { title: 'Moins d’allers-retours', text: 'Les informations importantes remontent plus tôt et au bon endroit.' },
          { title: 'Devis mieux préparés', text: 'Le dossier projet est plus complet avant même de chiffrer.' },
          { title: 'Meilleure priorisation', text: 'Les opportunités les plus sérieuses ressortent plus vite.' },
          { title: 'Suivi commercial plus clair', text: 'La fiche projet suit de vraies étapes métier et commerciales.' },
        ],
      },
      { type: 'heading', text: `${COMPATIBLE_TRADES.length} métiers déjà compatibles` },
      {
        type: 'paragraph',
        text: "La liste ci-dessous vient directement de la source utilisée par l’onboarding. Elle évolue au même rythme que le produit.",
      },
      ...COMPATIBLE_TRADE_GROUPS.map((group) => ({
        type: 'badgeGrid' as const,
        items: group,
      })),
    ],
  },
  {
    slug: 'demande-client-en-dossier-pret-a-chiffrer',
    title: 'Transformer une demande client en dossier prêt à chiffrer',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Comment Kadria transforme un appel, un message ou une demande incomplète en dossier clair, exploitable et prêt pour le devis.',
    readingTime: '4 min',
    publishedAt: '2026-06-02',
    featured: true,
    content: [
      { type: 'paragraph', text: "Une demande utile arrive rarement proprement structurée. Elle peut commencer par un appel rapide, un SMS du soir ou deux photos envoyées sur WhatsApp." },
      { type: 'heading', text: 'Avant : des informations dispersées' },
      {
        type: 'paragraph',
        text: "Sans organisation dédiée, le besoin, les photos, le budget et le délai restent éparpillés. Le devis est repoussé faute de temps pour tout rassembler.",
      },
      { type: 'heading', text: 'Avec Kadria : un dossier exploitable' },
      {
        type: 'list',
        items: [
          'Coordonnées centralisées',
          'Description reformulée clairement',
          'Photos rattachées au bon projet',
          'Budget et délai visibles quand ils existent',
          'Prochaine action recommandée pour avancer',
        ],
      },
      {
        type: 'paragraph',
        text: "Le résultat : moins d’oublis, des dossiers plus propres et un devis plus rapide à préparer quand vous reprenez la demande.",
      },
    ],
  },
  {
    slug: 'relancer-un-devis-sans-etre-insistant',
    title: 'Relancer un devis sans être insistant',
    category: 'Guide',
    type: 'guide',
    excerpt:
      'Une méthode simple pour relancer les bons prospects au bon moment, sans passer pour un commercial agressif.',
    readingTime: '5 min',
    publishedAt: '2026-06-18',
    featured: true,
    content: [
      { type: 'paragraph', text: "Beaucoup de chantiers se perdent faute de relance. Non pas parce que le prix est mauvais, mais parce que le client n’est jamais recontacté au bon moment." },
      { type: 'heading', text: 'Tous les devis n’ont pas la même température' },
      {
        type: 'paragraph',
        text: "Un devis urgent, un projet à six mois et une demande encore floue ne méritent pas le même rythme de suivi. Une relance utile commence par cette distinction.",
      },
      { type: 'heading', text: 'Une relance saine' },
      {
        type: 'list',
        items: [
          'Rappeler le devis et le contexte',
          'Proposer de répondre aux questions restantes',
          'Rester disponible sans mettre de pression',
          'Tracer chaque échange pour la suite',
        ],
      },
      {
        type: 'paragraph',
        text: "Une bonne relance montre que l’artisan est organisé et présent. Elle ne remplace pas le relationnel, elle lui donne plus de régularité.",
      },
    ],
  },
  {
    slug: 'kadria-pour-paysagistes',
    title: 'Kadria pour paysagistes : organiser les demandes de jardin, entretien et aménagement extérieur',
    category: 'Métier',
    type: 'guide',
    excerpt:
      'Entretien, taille, terrasse, clôture, aménagement extérieur : comment centraliser des demandes saisonnières et prioriser celles qui comptent vraiment.',
    readingTime: '4 min',
    publishedAt: '2026-06-21',
    featured: false,
    content: [
      { type: 'paragraph', text: "Chez un paysagiste, les demandes arrivent par vagues : entretien régulier, création de terrasse, plantation, clôture ou aménagement complet de jardin." },
      { type: 'heading', text: 'Ce que Kadria aide à qualifier' },
      {
        type: 'list',
        items: [
          'Type d’intervention : entretien, taille, terrasse, clôture, aménagement',
          'Surface et accès au terrain',
          'Photos, délai souhaité et budget évoqué',
          'Niveau de priorité selon la saison',
        ],
      },
      {
        type: 'paragraph',
        text: "Résultat : les paysagistes gardent une vue claire sur les pics saisonniers et concentrent leur temps sur les dossiers à plus forte valeur.",
      },
    ],
  },
  {
    slug: 'kadria-pour-plombiers',
    title: 'Kadria pour plombiers : traiter les urgences sans perdre les chantiers plus rentables',
    category: 'Métier',
    type: 'guide',
    excerpt:
      'Urgence, fuite, rénovation, chauffe-eau, salle de bain : Kadria aide à distinguer ce qui doit partir tout de suite de ce qui mérite un vrai devis.',
    readingTime: '4 min',
    publishedAt: '2026-06-22',
    featured: false,
    content: [
      { type: 'paragraph', text: "Un plombier ne traite pas une fuite urgente comme une rénovation de salle de bain. Pourtant, ces demandes arrivent souvent dans le même flux." },
      { type: 'heading', text: 'Avant le déplacement' },
      {
        type: 'list',
        items: [
          'Équipement concerné',
          'Urgence réelle ou non',
          'Accessibilité de la zone',
          'Photos de l’installation',
        ],
      },
      {
        type: 'paragraph',
        text: "Kadria aide à traiter l’urgence sans laisser filer les projets plus rentables qui demandent un devis plus propre et un meilleur suivi.",
      },
    ],
  },
  {
    slug: 'kadria-pour-electriciens',
    title: 'Kadria pour électriciens : mieux qualifier les demandes avant de se déplacer',
    category: 'Métier',
    type: 'guide',
    excerpt:
      'Panne, mise aux normes, tableau, éclairage, rénovation : comment obtenir les bonnes informations avant de bloquer un créneau.',
    readingTime: '4 min',
    publishedAt: '2026-06-23',
    featured: false,
    content: [
      { type: 'paragraph', text: "Pour un électricien, comprendre le contexte avant le déplacement change tout : panne isolée, rénovation large, tableau vétuste ou mise aux normes." },
      { type: 'heading', text: 'Informations utiles à capter' },
      {
        type: 'list',
        items: [
          'Type de bâtiment et contexte',
          'Symptôme exact ou besoin projet',
          'Accès au tableau et photos disponibles',
          'Urgence déclarée et délai souhaité',
        ],
      },
      {
        type: 'paragraph',
        text: "Avec ces éléments, la fiche projet devient plus exploitable et les déplacements inutiles diminuent.",
      },
    ],
  },
  {
    slug: 'kadria-pour-couvreurs',
    title: 'Kadria pour couvreurs : prioriser les urgences toiture et préparer les gros devis',
    category: 'Métier',
    type: 'guide',
    excerpt:
      'Après un épisode météo, Kadria aide à trier les vraies urgences et à préparer plus sereinement les rénovations plus lourdes.',
    readingTime: '4 min',
    publishedAt: '2026-06-24',
    featured: false,
    content: [
      { type: 'paragraph', text: "Les couvreurs reçoivent souvent un mélange d’urgences météo et de projets de rénovation plus conséquents. Sans méthode, tout semble prioritaire." },
      { type: 'heading', text: 'Ce que Kadria fait remonter' },
      {
        type: 'list',
        items: [
          'Nature de la fuite ou du dommage',
          'Photos et accès à la toiture',
          'Surface concernée',
          'Urgence déclarée et contraintes météo',
        ],
      },
      {
        type: 'paragraph',
        text: "La qualification permet de traiter vite les incidents critiques sans perdre de vue les devis de rénovation, souvent plus structurants pour l’activité.",
      },
    ],
  },
  {
    slug: 'demande-whatsapp-dossier-complet',
    title: 'D’un message WhatsApp à un dossier complet',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Trois lignes de message et deux photos : comment une demande perdue dans une conversation devient un vrai dossier projet.',
    readingTime: '3 min',
    publishedAt: '2026-05-28',
    featured: false,
    content: [
      { type: 'paragraph', text: "Un client envoie un message rapide et quelques photos. Sans système, ce contenu reste noyé dans la conversation." },
      { type: 'heading', text: 'Avec Kadria' },
      {
        type: 'list',
        items: [
          'Le besoin est reformulé',
          'Les photos restent attachées au bon projet',
          'Les échanges suivants enrichissent la même fiche',
        ],
      },
      {
        type: 'paragraph',
        text: "Ce qui n’était qu’un échange informel devient un dossier exploitable pour préparer une visite ou un devis.",
      },
    ],
  },
  {
    slug: 'appel-manque-chantier-perdu',
    title: 'Quand un appel manqué ne doit plus devenir un chantier perdu',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Sur un chantier, impossible de répondre à chaque appel. Voici comment Kadria récupère l’intention du client et prépare un rappel utile.',
    readingTime: '3 min',
    publishedAt: '2026-05-30',
    featured: false,
    content: [
      { type: 'paragraph', text: "Un appel manqué reste souvent sans contexte. Impossible de savoir s’il s’agissait d’un prospect chaud, d’une urgence ou d’une simple demande d’information." },
      { type: 'heading', text: 'Ce que Kadria prépare' },
      {
        type: 'list',
        items: [
          'Nature du besoin',
          'Urgence et délai',
          'Coordonnées et premier contexte',
          'Rappel plus utile dès votre retour',
        ],
      },
      {
        type: 'paragraph',
        text: "L’appel manqué redevient une opportunité traitable, au lieu d’un simple vide dans l’historique.",
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-mai-2026',
    title: 'Nouveautés Kadria — mai 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Parcours devis, suivi des décisions client et fiches projet plus complètes : le point sur les évolutions de mai 2026.',
    readingTime: '3 min',
    publishedAt: '2026-05-31',
    featured: false,
    content: [
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Premiers parcours devis intégrés',
          'Suivi de l’acceptation ou du refus',
          'Lien public de décision client',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise à jour' },
      {
        type: 'paragraph',
        text: "Le devis reste un moment clé du cycle commercial. Cette version renforce le suivi entre l’envoi, la décision du client et la suite du dossier.",
      },
    ],
  },
  {
    slug: 'preparer-devis-apres-journee-chantier',
    title: 'Préparer ses devis après une journée de chantier',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Le soir, retrouver rapidement les informations, photos et budgets nécessaires pour avancer sur ses devis sans tout reconstituer.',
    readingTime: '3 min',
    publishedAt: '2026-06-05',
    featured: false,
    content: [
      { type: 'paragraph', text: "Après une journée terrain, le temps de bureau est rare. Ce qui manque, ce n’est pas l’envie d’avancer, mais la capacité à retrouver vite le bon contexte." },
      { type: 'heading', text: 'Ce que Kadria centralise' },
      {
        type: 'list',
        items: [
          'Besoin client et historique',
          'Photos et pièces utiles',
          'Budget et délai si connus',
          'Prochaine étape recommandée',
        ],
      },
      {
        type: 'paragraph',
        text: "Préparer un devis devient plus fluide parce que le dossier est déjà rassemblé, au lieu d’être dispersé entre plusieurs canaux.",
      },
    ],
  },
  {
    slug: 'assistant-vocal-artisans',
    title: 'Assistant vocal Kadria : comment il prépare un vrai dossier pendant que vous êtes sur chantier',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      "Comment l’assistant vocal Kadria pose les bonnes questions à vos appelants et prépare une fiche exploitable, même quand vous ne pouvez pas répondre.",
    readingTime: '3 min',
    publishedAt: '2026-06-12',
    featured: false,
    content: [
      { type: 'paragraph', text: "L’assistant vocal Kadria prend le relais quand vous êtes indisponible, sans laisser l’appelant repartir sans contexte." },
      { type: 'heading', text: 'Ce qu’il récupère' },
      {
        type: 'list',
        items: [
          'Nature de la demande',
          'Urgence et coordonnées',
          'Informations utiles au rappel',
          'Base d’un dossier projet cohérent',
        ],
      },
      {
        type: 'paragraph',
        text: "Vous reprenez la main avec une fiche plus exploitable qu’un simple appel manqué.",
      },
    ],
  },
  {
    slug: 'fiche-projet-kadria',
    title: 'La fiche projet Kadria : le centre de gravité du dossier commercial',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      'Client, besoin, photos, budget, délai, statut, relance : la fiche projet centralise tout ce qui compte pour faire avancer un dossier.',
    readingTime: '3 min',
    publishedAt: '2026-06-19',
    featured: false,
    content: [
      { type: 'paragraph', text: "Chaque demande vient enrichir la même fiche projet. Elle devient le point de lecture unique pour reprendre un dossier sans perte de contexte." },
      { type: 'heading', text: 'Ce que vous retrouvez dedans' },
      {
        type: 'list',
        items: [
          'Coordonnées client',
          'Description du besoin',
          'Photos et pièces rattachées',
          'Budget, délai et statut',
          'Actions recommandées et relances',
        ],
      },
      {
        type: 'paragraph',
        text: "Au lieu de naviguer entre plusieurs conversations, vous repartez d’un dossier clair et à jour.",
      },
    ],
  },
  {
    slug: 'relances-commerciales-artisans',
    title: 'Relances commerciales Kadria : suivre les bons prospects sans y penser en permanence',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      'Relancer les devis au bon moment, suivre les prospects les plus chauds et éviter les oublis, sans transformer cela en deuxième métier.',
    readingTime: '3 min',
    publishedAt: '2026-06-26',
    featured: false,
    content: [
      { type: 'paragraph', text: "Le sujet n’est pas de relancer plus, mais de relancer mieux. Kadria aide à voir quels dossiers méritent une action et pourquoi." },
      { type: 'heading', text: 'Ce que suit Kadria' },
      {
        type: 'list',
        items: [
          'Devis envoyés et statut',
          'Prospects à relancer en priorité',
          'Moment recommandé pour reprendre contact',
          'Historique des échanges',
        ],
      },
      {
        type: 'paragraph',
        text: "Le suivi commercial reste présent sans devenir une charge mentale permanente.",
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juin-2026',
    title: 'Nouveautés Kadria — juin 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Quotas plus lisibles, filtres commerciaux plus utiles et meilleure lecture des fiches clients : le point sur juin 2026.',
    readingTime: '3 min',
    publishedAt: '2026-06-30',
    featured: false,
    content: [
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Quotas mieux visibles dans le dashboard',
          'Nouvelle carte dédiée aux limites du plan',
          'Suivi commercial plus lisible au quotidien',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise à jour' },
      {
        type: 'paragraph',
        text: "Mieux voir son plan, ses priorités et ses limites aide à prendre de meilleures décisions tous les jours.",
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juillet-2026',
    title: 'Nouveautés Kadria — juillet 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Un point sur les dernières améliorations du cockpit commercial, de l’assistant vocal et des fiches projet.',
    readingTime: '3 min',
    publishedAt: '2026-07-07',
    featured: true,
    content: [
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Fiche projet plus claire et plus rapide à lire',
          'Assistant vocal plus naturel',
          'Meilleure priorisation des demandes entrantes',
        ],
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: "Kadria continue d’évoluer pour aider les artisans à gagner du temps, mieux suivre leurs prospects et transformer plus de demandes en chantiers.",
      },
    ],
  },
];

function sortResources(resources: Resource[]): Resource[] {
  return [...resources].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export function getAllResources(): Resource[] {
  return sortResources(RESOURCES);
}

export function getResourceBySlug(slug: string): Resource | undefined {
  return RESOURCES.find((resource) => resource.slug === slug);
}

export function getFeaturedResources(limit?: number): Resource[] {
  const featured = sortResources(RESOURCES.filter((resource) => resource.featured));
  return typeof limit === 'number' ? featured.slice(0, limit) : featured;
}

export function getResourcesByCategory(category: ResourceCategory, limit?: number): Resource[] {
  const resources = sortResources(RESOURCES.filter((resource) => resource.category === category));
  return typeof limit === 'number' ? resources.slice(0, limit) : resources;
}

export function getCategorySlug(category: ResourceCategory): string {
  return RESOURCE_CATEGORY_SLUGS[category];
}

export function getCategoryFromSlug(slug: string): ResourceCategory | undefined {
  return (Object.entries(RESOURCE_CATEGORY_SLUGS).find(([, value]) => value === slug)?.[0] as ResourceCategory | undefined);
}

export function getCategoryLabel(category: ResourceCategory): string {
  return category;
}

export function getCategoryUrl(category: ResourceCategory): string {
  const slug = getCategorySlug(category);
  return category === 'Métier' ? '/ressources/metiers' : `/ressources/categories/${slug}`;
}
