import { ARTISAN_TRADES } from '@/src/config/trades';

/**
 * Kadria Academy - donnees statiques des ressources (V1, sans CMS).
 *
 * Ce fichier est la source unique de verite pour /ressources et
 * /ressources/[slug]. Pour ajouter une ressource, il suffit d'ajouter une
 * entree au tableau RESOURCES ci-dessous.
 */

export type ResourceCategory =
  | 'Cas d\u2019utilisation'
  | 'Guide'
  | 'Nouveaut\u00e9s'
  | 'Fonctionnalit\u00e9'
  | 'M\u00e9tier';

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

const COMPATIBLE_TRADES = ARTISAN_TRADES
  .filter((trade) => trade.value !== 'autre')
  .map((trade) => trade.label)
  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

const COMPATIBLE_TRADES_COUNT = COMPATIBLE_TRADES.length;

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
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    heroTitle: 'Le Profil M\u00e9tier Kadria',
    heroSubtitle:
      "Parce qu'un paysagiste, un plombier et un couvreur n'ont ni les m\u00eames clients, ni les m\u00eames projets, ni les m\u00eames informations \u00e0 collecter.",
    heroIntro:
      "Un logiciel traditionnel demande les m\u00eames informations \u00e0 tous les artisans. Kadria fonctionne diff\u00e9remment. Le logiciel adapte automatiquement les \u00e9changes, les questions, les informations attendues et l'organisation des dossiers selon le m\u00e9tier.",
    seoTitle: 'Le Profil M\u00e9tier Kadria | 86 m\u00e9tiers d\u00e9j\u00e0 compatibles',
    seoDescription:
      'D\u00e9couvrez comment le Profil M\u00e9tier Kadria adapte automatiquement les \u00e9changes, les dossiers et les informations collect\u00e9es selon votre activit\u00e9. Plus de 86 m\u00e9tiers sont d\u00e9j\u00e0 compatibles.',
    category: 'Fonctionnalit\u00e9',
    type: 'guide',
    excerpt:
      "D\u00e9couvrez comment le Profil M\u00e9tier Kadria adapte les questions, les dossiers et le suivi commercial \u00e0 chaque artisan, avec 86 m\u00e9tiers d\u00e9j\u00e0 compatibles.",
    readingTime: '12 minutes',
    publishedAt: '2026-07-08',
    featured: true,
    cta: {
      title: 'Votre m\u00e9tier est d\u00e9j\u00e0 pr\u00eat.',
      text: "Choisissez votre m\u00e9tier lors de votre inscription et d\u00e9couvrez une exp\u00e9rience adapt\u00e9e \u00e0 votre activit\u00e9 d\u00e8s les premiers \u00e9changes avec vos prospects.",
      primaryLabel: 'Essayer gratuitement',
      primaryHref: '/register',
      secondaryLabel: 'D\u00e9couvrir les fonctionnalit\u00e9s',
      secondaryHref: '/ressources#fonctionnalites',
    },
    content: [
      { type: 'heading', text: 'Pourquoi un Profil M\u00e9tier ?' },
      {
        type: 'paragraph',
        text: "Chaque profession poss\u00e8de son vocabulaire, ses contraintes et sa propre mani\u00e8re de pr\u00e9parer un devis. Certaines interventions sont urgentes, d'autres n\u00e9cessitent une visite technique, certaines demandent beaucoup de photos et d'autres surtout des dimensions, des acc\u00e8s ou des pr\u00e9cisions sur l'existant.",
      },
      {
        type: 'paragraph',
        text: "Un seul formulaire ne peut pas r\u00e9pondre correctement aux besoins de tous les m\u00e9tiers. Une demande de terrasse paysag\u00e8re, une fuite de plomberie, une r\u00e9novation \u00e9lectrique ou une intervention sur une toiture n'impliquent ni les m\u00eames questions, ni les m\u00eames priorit\u00e9s, ni les m\u00eames prochaines actions.",
      },
      { type: 'heading', text: 'Comment fonctionne le Profil M\u00e9tier ?' },
      {
        type: 'paragraph',
        text: "Le Profil M\u00e9tier personnalise l'assistance m\u00e9tier de Kadria pour que chaque artisan re\u00e7oive des dossiers plus proches de sa r\u00e9alit\u00e9 terrain. L'objectif n'est pas d'ajouter de la complexit\u00e9, mais d'obtenir plus vite les bonnes informations pour bien qualifier, bien chiffrer et bien relancer.",
      },
      {
        type: 'list',
        items: [
          'les questions pos\u00e9es',
          'les informations importantes',
          'les photos attendues',
          'la qualification automatique',
          'les crit\u00e8res de priorit\u00e9',
          'les conseils de relance',
          'la pr\u00e9paration des devis',
          'la fiche projet',
          'les recommandations commerciales',
          'les prochaines actions',
        ],
      },
      { type: 'heading', text: 'Exemples concrets' },
      { type: 'heading', text: 'Paysagiste' },
      {
        type: 'paragraph',
        text: "Quand un paysagiste re\u00e7oit une demande d'am\u00e9nagement ext\u00e9rieur, Kadria cherche \u00e0 faire remonter le type d'am\u00e9nagement, les dimensions, l'acc\u00e8s, la v\u00e9g\u00e9tation existante, le d\u00e9lai et le budget. Cela permet de distinguer un simple entretien d'un vrai projet de terrasse, de plantation ou de reprise compl\u00e8te du jardin, et donc de pr\u00e9parer la suite avec beaucoup plus de pr\u00e9cision.",
      },
      { type: 'heading', text: 'Plombier' },
      {
        type: 'paragraph',
        text: "Pour un plombier, Kadria aide \u00e0 faire la diff\u00e9rence entre une urgence, une fuite, une r\u00e9novation, un sujet de chaudi\u00e8re, de ballon ou un probl\u00e8me d'acc\u00e8s \u00e0 l'installation. Cette lecture du contexte \u00e9vite de traiter de la m\u00eame fa\u00e7on une urgence dans l'heure et une salle de bain \u00e0 chiffrer proprement.",
      },
      { type: 'heading', text: '\u00c9lectricien' },
      {
        type: 'paragraph',
        text: "Pour un \u00e9lectricien, Kadria fait remonter le type de b\u00e2timent, le tableau, le contexte de r\u00e9novation ou de d\u00e9pannage, les prises et l'\u00e9clairage concern\u00e9s. Cela aide \u00e0 savoir tr\u00e8s vite si l'on parle d'une panne ponctuelle, d'une mise aux normes ou d'une intervention bien plus large \u00e0 pr\u00e9parer diff\u00e9remment.",
      },
      { type: 'heading', text: 'Couvreur' },
      {
        type: 'paragraph',
        text: "Pour un couvreur, Kadria cherche \u00e0 qualifier le type de toiture, la pente, la fuite \u00e9ventuelle, la surface, l'acc\u00e8s et l'urgence m\u00e9t\u00e9o. Une demande apr\u00e8s un orage n'appelle pas la m\u00eame r\u00e9ponse qu'un projet de r\u00e9novation de couverture pr\u00e9vu plus tard, m\u00eame si les deux arrivent dans le m\u00eame flux.",
      },
      { type: 'heading', text: "Les b\u00e9n\u00e9fices pour l'artisan" },
      {
        type: 'cardGrid',
        items: [
          { title: 'Poser les bonnes questions', text: "Le dossier commence avec des questions qui ont du sens pour le m\u00e9tier concern\u00e9." },
          { title: 'Recevoir des dossiers plus complets', text: "Les informations utiles remontent plus t\u00f4t, avec moins d'oublis et moins de zones floues." },
          { title: 'Pr\u00e9parer les devis plus rapidement', text: "L'artisan repart d'un dossier d\u00e9j\u00e0 structur\u00e9, pas d'une conversation \u00e0 reconstituer." },
          { title: 'R\u00e9duire les oublis', text: "Les points importants du m\u00e9tier sont attendus d\u00e8s le d\u00e9part, au lieu d'\u00eatre d\u00e9couverts trop tard." },
          { title: 'Prioriser les demandes importantes', text: "Les demandes urgentes ou prometteuses ressortent mieux selon le contexte du m\u00e9tier." },
          { title: 'Limiter les allers-retours', text: "Moins de messages pour r\u00e9cup\u00e9rer des pr\u00e9cisions oubli\u00e9es apr\u00e8s coup." },
          { title: 'Pr\u00e9parer les visites techniques', text: "Acc\u00e8s, dimensions, photos et contraintes sont mieux remont\u00e9s avant le d\u00e9placement." },
          { title: 'Suivre plus facilement les prospects', text: "Le dossier commercial reste lisible parce qu'il refl\u00e8te les vraies \u00e9tapes du m\u00e9tier." },
          { title: 'Recevoir des informations plus exploitables', text: "Les donn\u00e9es collect\u00e9es servent vraiment au tri, au devis et au suivi commercial." },
        ],
      },
      { type: 'heading', text: `${COMPATIBLE_TRADES_COUNT} m\u00e9tiers d\u00e9j\u00e0 compatibles` },
      {
        type: 'paragraph',
        text: "Aujourd'hui, Kadria int\u00e8gre d\u00e9j\u00e0 des profils m\u00e9tier couvrant une grande partie des activit\u00e9s du b\u00e2timent, de l'am\u00e9nagement ext\u00e9rieur et des services techniques. La liste ci-dessous provient directement de la source d\u00e9j\u00e0 utilis\u00e9e par l'onboarding.",
      },
      ...COMPATIBLE_TRADE_GROUPS.map((group) => ({
        type: 'badgeGrid' as const,
        items: group,
      })),
      { type: 'heading', text: 'Le Profil M\u00e9tier \u00e9volue' },
      {
        type: 'paragraph',
        text: "Chaque Profil M\u00e9tier continue d'\u00eatre enrichi. Les informations collect\u00e9es peuvent \u00e9voluer, les conseils commerciaux peuvent \u00e9voluer, les fiches projet peuvent \u00eatre am\u00e9lior\u00e9es et de nouveaux m\u00e9tiers seront ajout\u00e9s r\u00e9guli\u00e8rement. Kadria n'est pas un formulaire fig\u00e9 : c'est un produit vivant qui apprend \u00e0 mieux servir le terrain.",
      },
    ],
  },
  {
    slug: 'demande-client-en-dossier-pret-a-chiffrer',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'DÃƒÂ©couvrez comment Kadria transforme un appel, un message ou une demande incomplÃƒÂ¨te en dossier clair, exploitable et prÃƒÂªt pour le devis.',
    readingTime: '4 min',
    publishedAt: '2026-06-02',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Un artisan reÃƒÂ§oit souvent des demandes dispersÃƒÂ©es : un appel pendant un chantier, un SMS le soir, un message WhatsApp avec une photo, ou un formulaire rempli ÃƒÂ  moitiÃƒÂ©. Chacune de ces demandes contient une partie de lÃ¢â‚¬â„¢information, rarement toute lÃ¢â‚¬â„¢information.',
      },
      { type: 'heading', text: 'Avant : des informations dispersÃƒÂ©es et incomplÃƒÂ¨tes' },
      {
        type: 'paragraph',
        text: 'Sans outil dÃƒÂ©diÃƒÂ©, ces demandes sÃ¢â‚¬â„¢accumulent dans des canaux diffÃƒÂ©rents. Le budget nÃ¢â‚¬â„¢est pas mentionnÃƒÂ©, le dÃƒÂ©lai souhaitÃƒÂ© reste flou, les photos envoyÃƒÂ©es par message se perdent dans la conversation, et le devis finit par ÃƒÂªtre repoussÃƒÂ© faute de temps pour tout rassembler. RÃƒÂ©sultat : des oublis, des relances tardives, et des opportunitÃƒÂ©s qui refroidissent.',
      },
      { type: 'heading', text: 'Avec Kadria : une demande centralisÃƒÂ©e et qualifiÃƒÂ©e' },
      {
        type: 'paragraph',
        text: 'DÃƒÂ¨s quÃ¢â‚¬â„¢une demande arrive, Kadria la centralise, la qualifie et lÃ¢â‚¬â„¢enrichit automatiquement. Chaque ÃƒÂ©change vient complÃƒÂ©ter la mÃƒÂªme fiche projet, qui devient au fil du temps un dossier clair et priorisable.',
      },
      {
        type: 'list',
        items: [
          'CoordonnÃƒÂ©es du client centralisÃƒÂ©es en un seul endroit',
          'Description du besoin claire et structurÃƒÂ©e',
          'Photos rattachÃƒÂ©es directement au dossier',
          'Budget et dÃƒÂ©lai identifiÃƒÂ©s dÃƒÂ¨s que possible',
          'Niveau de complÃƒÂ©tude du dossier visible dÃ¢â‚¬â„¢un coup dÃ¢â‚¬â„¢Ã…â€œil',
          'Prochaine action recommandÃƒÂ©e pour ne jamais rester bloquÃƒÂ©',
        ],
      },
      { type: 'heading', text: 'Le rÃƒÂ©sultat' },
      {
        type: 'paragraph',
        text: 'Moins dÃ¢â‚¬â„¢oublis, des dossiers plus propres, et des devis prÃƒÂ©parÃƒÂ©s plus rapidement. LÃ¢â‚¬â„¢artisan garde le contrÃƒÂ´le de sa relation client, sans passer son temps ÃƒÂ  reconstituer des informations ÃƒÂ©parpillÃƒÂ©es.',
      },
    ],
  },
  {
    slug: 'relancer-un-devis-sans-etre-insistant',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'guide',
    excerpt:
      'Une mÃƒÂ©thode simple pour relancer les bons prospects au bon moment, sans passer pour un commercial agressif.',
    readingTime: '5 min',
    publishedAt: '2026-06-18',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Beaucoup dÃ¢â‚¬â„¢artisans perdent des chantiers non pas ÃƒÂ  cause du prix, mais parce que le devis envoyÃƒÂ© nÃ¢â‚¬â„¢est jamais relancÃƒÂ©. Le client a dÃ¢â‚¬â„¢autres prioritÃƒÂ©s, oublie de rÃƒÂ©pondre, et le projet finit par partir chez un concurrent plus prÃƒÂ©sent au bon moment.',
      },
      { type: 'heading', text: 'Pourquoi il ne faut pas relancer tout le monde de la mÃƒÂªme maniÃƒÂ¨re' },
      {
        type: 'paragraph',
        text: 'Tous les devis nÃ¢â‚¬â„¢ont pas la mÃƒÂªme tempÃƒÂ©rature. Un client qui a demandÃƒÂ© un rendez-vous rapide nÃ¢â‚¬â„¢a pas le mÃƒÂªme niveau dÃ¢â‚¬â„¢urgence quÃ¢â‚¬â„¢un client qui explore plusieurs devis pour un projet ÃƒÂ  six mois. Relancer de la mÃƒÂªme faÃƒÂ§on, avec la mÃƒÂªme frÃƒÂ©quence, revient ÃƒÂ  traiter des situations trÃƒÂ¨s diffÃƒÂ©rentes comme si elles ÃƒÂ©taient identiques.',
      },
      { type: 'heading', text: 'Identifier les devis Ã‚Â« chauds Ã‚Â»' },
      {
        type: 'paragraph',
        text: 'Un devis chaud est un devis oÃƒÂ¹ le client a montrÃƒÂ© des signaux clairs dÃ¢â‚¬â„¢intÃƒÂ©rÃƒÂªt : dÃƒÂ©lai serrÃƒÂ©, budget dÃƒÂ©jÃƒÂ  validÃƒÂ©, demande prÃƒÂ©cise. Ces dossiers mÃƒÂ©ritent une relance rapide et personnalisÃƒÂ©e, avant que lÃ¢â‚¬â„¢intÃƒÂ©rÃƒÂªt ne retombe.',
      },
      { type: 'heading', text: 'Relancer au bon moment' },
      {
        type: 'paragraph',
        text: 'Une relance trop prÃƒÂ©coce donne une impression de pression. Une relance trop tardive arrive aprÃƒÂ¨s que le client a dÃƒÂ©jÃƒÂ  fait son choix. Le bon rythme dÃƒÂ©pend du projet, mais une premiÃƒÂ¨re relance quelques jours aprÃƒÂ¨s lÃ¢â‚¬â„¢envoi du devis, suivie dÃ¢â‚¬â„¢une seconde plus espacÃƒÂ©e, reste une base solide pour la plupart des chantiers.',
      },
      { type: 'heading', text: 'Garder un ton professionnel' },
      {
        type: 'paragraph',
        text: 'Une relance efficace nÃ¢â‚¬â„¢est pas une insistance. Elle rappelle le devis, propose de rÃƒÂ©pondre ÃƒÂ  des questions ÃƒÂ©ventuelles, et laisse la porte ouverte sans mettre le client sous pression. Le ton compte autant que le moment.',
      },
      { type: 'heading', text: 'Noter chaque ÃƒÂ©change' },
      {
        type: 'paragraph',
        text: 'Chaque relance, chaque rÃƒÂ©ponse, chaque hÃƒÂ©sitation exprimÃƒÂ©e par le client est une information utile pour la suite. Sans trace ÃƒÂ©crite, ces dÃƒÂ©tails se perdent et les relances suivantes repartent de zÃƒÂ©ro.',
      },
      { type: 'heading', text: 'Utiliser Kadria pour ne rien oublier' },
      {
        type: 'paragraph',
        text: 'Kadria garde la trace des devis envoyÃƒÂ©s, signale les dossiers ÃƒÂ  relancer et centralise lÃ¢â‚¬â„¢historique des ÃƒÂ©changes, pour que chaque relance parte dÃ¢â‚¬â„¢un contexte complet plutÃƒÂ´t que de la mÃƒÂ©moire de lÃ¢â‚¬â„¢artisan.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Une bonne relance est un service rendu au client, pas une pression commerciale. Elle montre que lÃ¢â‚¬â„¢artisan est organisÃƒÂ©, disponible et sÃƒÂ©rieux Ã¢â‚¬â€ ce qui fait souvent la diffÃƒÂ©rence au moment de signer.',
      },
    ],
  },
  {
    slug: 'kadria-pour-paysagistes',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Entretien, taille, terrasse, clÃƒÂ´ture, amÃƒÂ©nagement extÃƒÂ©rieur : comment centraliser des demandes trÃƒÂ¨s saisonniÃƒÂ¨res et prioriser celles qui comptent vraiment.',
    readingTime: '4 min',
    publishedAt: '2026-04-10',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Chez un paysagiste, les demandes ne se ressemblent jamais tout ÃƒÂ  fait : un entretien rÃƒÂ©gulier, une taille de haie, la crÃƒÂ©ation dÃ¢â‚¬â„¢une terrasse, la pose dÃ¢â‚¬â„¢une clÃƒÂ´ture, un amÃƒÂ©nagement complet de jardin. Elles arrivent souvent par vagues, au mÃƒÂªme moment de la saison, avec des photos, des surfaces approximatives et des dÃƒÂ©lais qui deviennent urgents dÃƒÂ¨s les beaux jours.',
      },
      { type: 'heading', text: 'Des demandes trÃƒÂ¨s concentrÃƒÂ©es dans le temps' },
      {
        type: 'paragraph',
        text: 'Le printemps et le dÃƒÂ©but dÃ¢â‚¬â„¢ÃƒÂ©tÃƒÂ© concentrent une grande partie des demandes de lÃ¢â‚¬â„¢annÃƒÂ©e : entretien de reprise, projets dÃ¢â‚¬â„¢amÃƒÂ©nagement pensÃƒÂ©s pendant lÃ¢â‚¬â„¢hiver, urgences liÃƒÂ©es ÃƒÂ  une haie trop haute avant un contrÃƒÂ´le de voisinage. Sans organisation, ces demandes sÃ¢â‚¬â„¢accumulent et certaines finissent oubliÃƒÂ©es, simplement parce quÃ¢â‚¬â„¢elles sont arrivÃƒÂ©es en mÃƒÂªme temps que dix autres.',
      },
      { type: 'heading', text: 'Ce que Kadria centralise pour vous' },
      {
        type: 'list',
        items: [
          'Type dÃ¢â‚¬â„¢intervention : entretien, taille, terrasse, clÃƒÂ´ture, amÃƒÂ©nagement',
          'Photos du terrain et dimensions approximatives transmises par le client',
          'Niveau dÃ¢â‚¬â„¢urgence, notamment en pÃƒÂ©riode chargÃƒÂ©e de printemps et dÃ¢â‚¬â„¢ÃƒÂ©tÃƒÂ©',
          'Budget ÃƒÂ©voquÃƒÂ© par le client, quand il est mentionnÃƒÂ©',
          'Relances automatiques avant les pÃƒÂ©riodes les plus chargÃƒÂ©es',
        ],
      },
      { type: 'heading', text: 'Prioriser les demandes les plus rentables' },
      {
        type: 'paragraph',
        text: 'Toutes les demandes ne se valent pas au mÃƒÂªme moment. Un chantier dÃ¢â‚¬â„¢amÃƒÂ©nagement bien qualifiÃƒÂ© mÃƒÂ©rite dÃ¢â‚¬â„¢ÃƒÂªtre traitÃƒÂ© avant un simple entretien ponctuel si lÃ¢â‚¬â„¢agenda est serrÃƒÂ©. Avec un dossier clair pour chaque demande, il devient plus simple dÃ¢â‚¬â„¢arbitrer et de concentrer son temps sur les projets qui font vraiment avancer lÃ¢â‚¬â„¢activitÃƒÂ©.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Kadria aide les paysagistes ÃƒÂ  garder une vue dÃ¢â‚¬â„¢ensemble sur des demandes saisonniÃƒÂ¨res et variÃƒÂ©es, ÃƒÂ  ne rien laisser filer pendant les pÃƒÂ©riodes chargÃƒÂ©es, et ÃƒÂ  prÃƒÂ©parer des devis sur des dossiers dÃƒÂ©jÃƒÂ  qualifiÃƒÂ©s.',
      },
    ],
  },
  {
    slug: 'kadria-pour-plombiers',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Fuite ÃƒÂ  traiter dans lÃ¢â‚¬â„¢heure, demande de salle de bain ÃƒÂ  chiffrer plus tard : comment trier sans laisser filer les projets les plus intÃƒÂ©ressants.',
    readingTime: '4 min',
    publishedAt: '2026-04-17',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un plombier reÃƒÂ§oit rarement des demandes de mÃƒÂªme nature dans une mÃƒÂªme journÃƒÂ©e : une fuite ÃƒÂ  traiter dans lÃ¢â‚¬â„¢heure, un remplacement de chaudiÃƒÂ¨re ÃƒÂ  planifier, un projet de salle de bain ÃƒÂ  chiffrer dans les prochaines semaines. Ces demandes nÃ¢â‚¬â„¢ont ni la mÃƒÂªme urgence, ni la mÃƒÂªme rentabilitÃƒÂ©, et pourtant elles arrivent souvent par les mÃƒÂªmes canaux, mÃƒÂ©langÃƒÂ©es.',
      },
      { type: 'heading', text: 'Le risque : traiter tout comme une urgence' },
      {
        type: 'paragraph',
        text: 'Quand chaque appel est traitÃƒÂ© dans lÃ¢â‚¬â„¢ordre dÃ¢â‚¬â„¢arrivÃƒÂ©e, les demandes de rÃƒÂ©novation plus importantes Ã¢â‚¬â€ salle de bain, remplacement de ballon, tuyauterie complÃƒÂ¨te Ã¢â‚¬â€ passent souvent aprÃƒÂ¨s les dÃƒÂ©pannages, alors quÃ¢â‚¬â„¢elles reprÃƒÂ©sentent souvent les chantiers les plus rentables sur la durÃƒÂ©e.',
      },
      { type: 'heading', text: 'Ce que Kadria aide ÃƒÂ  structurer' },
      {
        type: 'list',
        items: [
          'Distinction claire entre urgence (fuite, dÃƒÂ©pannage) et projet planifiable',
          'Informations essentielles sur les demandes de salle de bain ou de remplacement de chaudiÃƒÂ¨re',
          'Fiche projet exploitable, prÃƒÂªte ÃƒÂ  ÃƒÂªtre reprise pour ÃƒÂ©tablir un devis',
          'Rappel et suivi automatiques pour ne pas laisser une demande sans rÃƒÂ©ponse',
        ],
      },
      { type: 'heading', text: 'Trier sans perdre de temps' },
      {
        type: 'paragraph',
        text: 'LÃ¢â‚¬â„¢objectif nÃ¢â‚¬â„¢est pas de traiter moins dÃ¢â‚¬â„¢urgences, mais de ne plus laisser les projets plus rentables se noyer au milieu des dÃƒÂ©pannages. Une demande de rÃƒÂ©novation bien qualifiÃƒÂ©e, avec les bonnes informations dÃƒÂ¨s le dÃƒÂ©part, se transforme plus facilement en devis solide.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Kadria aide les plombiers ÃƒÂ  garder une longueur dÃ¢â‚¬â„¢avance sur les urgences tout en gardant un Ã…â€œil clair sur les chantiers plus importants, ceux qui mÃƒÂ©ritent un suivi commercial soignÃƒÂ©.',
      },
    ],
  },
  {
    slug: 'kadria-pour-electriciens',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'DÃƒÂ©pannage, mise aux normes, rÃƒÂ©novation, installation complÃƒÂ¨te : comment obtenir les bonnes informations avant mÃƒÂªme le premier rendez-vous.',
    readingTime: '4 min',
    publishedAt: '2026-04-24',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Une demande dÃ¢â‚¬â„¢ÃƒÂ©lectricitÃƒÂ© peut recouvrir des rÃƒÂ©alitÃƒÂ©s trÃƒÂ¨s diffÃƒÂ©rentes : un simple dÃƒÂ©pannage, une mise aux normes du tableau ÃƒÂ©lectrique, une rÃƒÂ©novation complÃƒÂ¨te, ou lÃ¢â‚¬â„¢installation ÃƒÂ©lectrique dÃ¢â‚¬â„¢un logement neuf. Sans dÃƒÂ©tails prÃƒÂ©cis, il est difficile dÃ¢â‚¬â„¢estimer le temps nÃƒÂ©cessaire ou de prÃƒÂ©parer correctement un dÃƒÂ©placement.',
      },
      { type: 'heading', text: 'Le problÃƒÂ¨me des demandes trop gÃƒÂ©nÃƒÂ©rales' },
      {
        type: 'paragraph',
        text: 'Ã‚Â« JÃ¢â‚¬â„¢ai un souci ÃƒÂ©lectrique Ã‚Â» ou Ã‚Â« je veux refaire mon installation Ã‚Â» sont des demandes frÃƒÂ©quentes, mais elles ne disent presque rien sur lÃ¢â‚¬â„¢ampleur rÃƒÂ©elle du travail. Se dÃƒÂ©placer sans ces informations fait perdre du temps, autant ÃƒÂ  lÃ¢â‚¬â„¢artisan quÃ¢â‚¬â„¢au client.',
      },
      { type: 'heading', text: 'Les informations que Kadria aide ÃƒÂ  rÃƒÂ©cupÃƒÂ©rer' },
      {
        type: 'list',
        items: [
          'Type de logement et surface approximative',
          'Ãƒâ€°tat du tableau ÃƒÂ©lectrique, quand cette information est disponible',
          'Nombre de piÃƒÂ¨ces, de prises ou de points lumineux concernÃƒÂ©s',
          'Photos de lÃ¢â‚¬â„¢installation existante',
          'Budget envisagÃƒÂ© et dÃƒÂ©lai souhaitÃƒÂ© par le client',
        ],
      },
      { type: 'heading', text: 'Un devis prÃƒÂ©parÃƒÂ© plus rapidement' },
      {
        type: 'paragraph',
        text: 'Avec un dossier dÃƒÂ©jÃƒÂ  qualifiÃƒÂ© avant le rendez-vous, il devient plus simple de prÃƒÂ©parer une estimation cohÃƒÂ©rente, voire de filtrer les demandes qui nÃƒÂ©cessitent rÃƒÂ©ellement un dÃƒÂ©placement de celles qui peuvent ÃƒÂªtre chiffrÃƒÂ©es plus directement.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Kadria aide les ÃƒÂ©lectriciens ÃƒÂ  transformer des demandes floues en dossiers concrets, pour prÃƒÂ©parer des devis plus rapidement et limiter les dÃƒÂ©placements peu utiles.',
      },
    ],
  },
  {
    slug: 'kadria-pour-couvreurs',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Fuite aprÃƒÂ¨s un orage, projet de rÃƒÂ©novation complÃƒÂ¨te, zinguerie, isolation : comment qualifier chaque demande de toiture avant de se dÃƒÂ©placer.',
    readingTime: '4 min',
    publishedAt: '2026-05-01',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Le mÃƒÂ©tier de couvreur alterne entre deux rÃƒÂ©alitÃƒÂ©s : des urgences, souvent aprÃƒÂ¨s un ÃƒÂ©pisode mÃƒÂ©tÃƒÂ©o difficile, et des chantiers plus importants Ã¢â‚¬â€ rÃƒÂ©paration, rÃƒÂ©novation, zinguerie, isolation de toiture Ã¢â‚¬â€ qui demandent un devis prÃƒÂ©parÃƒÂ© avec soin.',
      },
      { type: 'heading', text: 'AprÃƒÂ¨s une tempÃƒÂªte, tout arrive en mÃƒÂªme temps' },
      {
        type: 'paragraph',
        text: 'AprÃƒÂ¨s un orage ou un ÃƒÂ©pisode de vent fort, les demandes de fuite ou de tuiles endommagÃƒÂ©es affluent en quelques heures. Sans mÃƒÂ©thode pour les trier, il est difficile de savoir laquelle traiter en premier, et certaines demandes urgentes peuvent se perdre dans le flux.',
      },
      { type: 'heading', text: 'Ce que Kadria permet de rÃƒÂ©cupÃƒÂ©rer avant le dÃƒÂ©placement' },
      {
        type: 'list',
        items: [
          'Localisation prÃƒÂ©cise de la fuite ou du dommage',
          'Photos de la toiture transmises par le client',
          'Surface approximative concernÃƒÂ©e par les travaux',
          'AccÃƒÂ¨s au chantier (hauteur, toiture accessible ou non)',
          'Niveau dÃ¢â‚¬â„¢urgence, en particulier aprÃƒÂ¨s un ÃƒÂ©pisode mÃƒÂ©tÃƒÂ©o',
        ],
      },
      { type: 'heading', text: 'SÃƒÂ©parer lÃ¢â‚¬â„¢urgence du gros chantier' },
      {
        type: 'paragraph',
        text: 'Une fuite ponctuelle et un projet de rÃƒÂ©novation complÃƒÂ¨te de toiture nÃ¢â‚¬â„¢appellent ni le mÃƒÂªme dÃƒÂ©lai de rÃƒÂ©ponse, ni la mÃƒÂªme prÃƒÂ©paration. En qualifiant chaque demande dÃƒÂ¨s son arrivÃƒÂ©e, il devient plus simple de traiter les urgences rapidement tout en prÃƒÂ©parant sÃƒÂ©rieusement les devis les plus consÃƒÂ©quents.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Kadria aide les couvreurs ÃƒÂ  absorber les pics dÃ¢â‚¬â„¢urgence sans perdre de vue les chantiers de rÃƒÂ©novation, souvent plus longs ÃƒÂ  prÃƒÂ©parer mais plus dÃƒÂ©terminants pour lÃ¢â‚¬â„¢activitÃƒÂ©.',
      },
    ],
  },
  {
    slug: 'demande-whatsapp-dossier-complet',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Trois lignes de message et deux photos : voici comment cette demande, autrefois perdue dans une conversation, devient un dossier structurÃƒÂ© avec Kadria.',
    readingTime: '3 min',
    publishedAt: '2026-05-08',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un client envoie un message WhatsApp : trois lignes qui dÃƒÂ©crivent rapidement son besoin, accompagnÃƒÂ©es de deux photos prises avec son tÃƒÂ©lÃƒÂ©phone. CÃ¢â‚¬â„¢est souvent tout ce quÃ¢â‚¬â„¢un artisan reÃƒÂ§oit pour dÃƒÂ©marrer une demande Ã¢â‚¬â€ et cÃ¢â‚¬â„¢est largement suffisant pour commencer, ÃƒÂ  condition que rien ne se perde en chemin.',
      },
      { type: 'heading', text: 'Avant : une information qui reste coincÃƒÂ©e dans la conversation' },
      {
        type: 'paragraph',
        text: 'Sans organisation dÃƒÂ©diÃƒÂ©e, ce message reste un message parmi dÃ¢â‚¬â„¢autres. Les photos se mÃƒÂ©langent avec des ÃƒÂ©changes personnels ou dÃ¢â‚¬â„¢autres clients, le texte nÃ¢â‚¬â„¢est jamais reformulÃƒÂ© clairement, et il faut rouvrir la conversation ÃƒÂ  chaque fois pour se souvenir des dÃƒÂ©tails.',
      },
      { type: 'heading', text: 'Avec Kadria : un dossier qui se construit tout seul' },
      {
        type: 'paragraph',
        text: 'La demande est rÃƒÂ©cupÃƒÂ©rÃƒÂ©e, reformulÃƒÂ©e et rattachÃƒÂ©e ÃƒÂ  une fiche projet claire. Les photos sont conservÃƒÂ©es au bon endroit, les informations utiles sont mises en ÃƒÂ©vidence, et le dossier peut ÃƒÂªtre complÃƒÂ©tÃƒÂ© au fil des ÃƒÂ©changes suivants avec le mÃƒÂªme client.',
      },
      { type: 'heading', text: 'Le rÃƒÂ©sultat' },
      {
        type: 'paragraph',
        text: 'Ce qui commenÃƒÂ§ait comme trois lignes et deux photos devient un dossier exploitable, prÃƒÂªt ÃƒÂ  ÃƒÂªtre repris pour prÃƒÂ©parer un devis ou organiser une visite, sans avoir ÃƒÂ  tout reconstituer de mÃƒÂ©moire.',
      },
    ],
  },
  {
    slug: 'appel-manque-chantier-perdu',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Sur un chantier, impossible de rÃƒÂ©pondre ÃƒÂ  chaque appel. Voici comment Kadria rÃƒÂ©cupÃƒÂ¨re lÃ¢â‚¬â„¢intention du client et prÃƒÂ©pare un rappel utile.',
    readingTime: '3 min',
    publishedAt: '2026-05-15',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un artisan en plein chantier ne peut pas toujours dÃƒÂ©crocher. Le tÃƒÂ©lÃƒÂ©phone sonne, personne ne rÃƒÂ©pond, et lÃ¢â‚¬â„¢appel finit en absence Ã¢â‚¬â€ sans quÃ¢â‚¬â„¢on sache si cÃ¢â‚¬â„¢ÃƒÂ©tait un client existant, un nouveau prospect, ou une urgence.',
      },
      { type: 'heading', text: 'Ce qui se perd avec un simple appel manquÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Sans information sur la raison de lÃ¢â‚¬â„¢appel, il est difficile de savoir comment et quand rappeler. Certains prospects nÃ¢â‚¬â„¢insistent pas et se tournent vers un autre artisan plus disponible, simplement parce que le premier contact nÃ¢â‚¬â„¢a pas pu ÃƒÂªtre rÃƒÂ©cupÃƒÂ©rÃƒÂ©.',
      },
      { type: 'heading', text: 'Ce que Kadria change' },
      {
        type: 'paragraph',
        text: 'Kadria rÃƒÂ©cupÃƒÂ¨re lÃ¢â‚¬â„¢intention du client dÃƒÂ¨s lÃ¢â‚¬â„¢appel, structure les informations utiles Ã¢â‚¬â€ nature de la demande, urgence, coordonnÃƒÂ©es Ã¢â‚¬â€ et prÃƒÂ©pare un rappel avec le contexte nÃƒÂ©cessaire pour reprendre la conversation efficacement, sans repartir de zÃƒÂ©ro.',
      },
      { type: 'heading', text: 'Le rÃƒÂ©sultat' },
      {
        type: 'paragraph',
        text: 'Un appel manquÃƒÂ© reste une opportunitÃƒÂ©, pas une perte. LÃ¢â‚¬â„¢artisan peut rappeler au moment oÃƒÂ¹ il est disponible, avec toutes les informations en main pour rÃƒÂ©pondre directement au besoin du client.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-mai-2026',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'patch-note',
    excerpt:
      'Premiers parcours de devis, suivi dÃ¢â‚¬â„¢acceptation et de refus, fiches projet plus complÃƒÂ¨tes : le point sur les ÃƒÂ©volutions du mois de mai.',
    readingTime: '3 min',
    publishedAt: '2026-05-29',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales ÃƒÂ©volutions apportÃƒÂ©es ÃƒÂ  Kadria en mai, centrÃƒÂ©es sur le parcours devis et la prÃƒÂ©paration des dossiers client.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Premiers parcours de devis intÃƒÂ©grÃƒÂ©s au produit',
          'Suivi de lÃ¢â‚¬â„¢acceptation ou du refus dÃ¢â‚¬â„¢un devis',
          'Lien public permettant au client de donner sa dÃƒÂ©cision directement',
          'AmÃƒÂ©lioration des statuts commerciaux associÃƒÂ©s ÃƒÂ  chaque dossier',
        ],
      },
      { type: 'heading', text: 'AmÃƒÂ©liorations' },
      {
        type: 'list',
        items: [
          'Fiches projet plus complÃƒÂ¨tes',
          'Meilleure gestion des photos rattachÃƒÂ©es ÃƒÂ  un dossier',
          'PrÃƒÂ©paration des futures relances de devis',
          'ExpÃƒÂ©rience prospect plus fluide sur le lien de dÃƒÂ©cision',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Meilleure stabilitÃƒÂ© des formulaires',
          'Correction dÃ¢â‚¬â„¢affichages incohÃƒÂ©rents sur certaines fiches',
          'Optimisation des performances sur certaines pages',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise ÃƒÂ  jour' },
      {
        type: 'paragraph',
        text: 'Le devis est souvent le moment oÃƒÂ¹ tout se joue avec un prospect. Ces ÃƒÂ©volutions visent ÃƒÂ  rendre ce moment plus simple ÃƒÂ  suivre, autant pour lÃ¢â‚¬â„¢artisan que pour son client.',
      },
    ],
  },
  {
    slug: 'preparer-devis-apres-journee-chantier',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Le soir, aprÃƒÂ¨s une journÃƒÂ©e de chantier, retrouver rapidement les informations, photos et budgets nÃƒÂ©cessaires pour avancer sur ses devis.',
    readingTime: '3 min',
    publishedAt: '2026-06-05',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Le soir, aprÃƒÂ¨s une journÃƒÂ©e sur le terrain, cÃ¢â‚¬â„¢est souvent le seul moment disponible pour avancer sur les devis en attente. Encore faut-il retrouver rapidement les informations nÃƒÂ©cessaires : ce que le client a demandÃƒÂ©, les photos ÃƒÂ©changÃƒÂ©es, le budget ÃƒÂ©voquÃƒÂ©.',
      },
      { type: 'heading', text: 'Le temps perdu ÃƒÂ  tout reconstituer' },
      {
        type: 'paragraph',
        text: 'Sans dossier centralisÃƒÂ©, prÃƒÂ©parer un devis implique souvent de rouvrir plusieurs conversations, de retrouver des photos ÃƒÂ©parpillÃƒÂ©es, et de se fier ÃƒÂ  sa mÃƒÂ©moire pour les dÃƒÂ©tails ÃƒÂ©voquÃƒÂ©s en rendez-vous. Ce temps de reconstitution sÃ¢â‚¬â„¢ajoute ÃƒÂ  une journÃƒÂ©e dÃƒÂ©jÃƒÂ  longue.',
      },
      { type: 'heading', text: 'Ce que Kadria centralise pour ce moment prÃƒÂ©cis' },
      {
        type: 'list',
        items: [
          'Toutes les informations du dossier au mÃƒÂªme endroit',
          'Photos rattachÃƒÂ©es directement ÃƒÂ  la fiche projet',
          'Budget et dÃƒÂ©lai dÃƒÂ©jÃƒÂ  identifiÃƒÂ©s',
          'Historique des ÃƒÂ©changes avec le client',
        ],
      },
      { type: 'heading', text: 'Le rÃƒÂ©sultat' },
      {
        type: 'paragraph',
        text: 'PrÃƒÂ©parer un devis devient une tÃƒÂ¢che plus rapide et moins fastidieuse, avec toutes les informations dÃƒÂ©jÃƒÂ  rassemblÃƒÂ©es au bon endroit, prÃƒÂªtes ÃƒÂ  ÃƒÂªtre reprises en quelques minutes.',
      },
    ],
  },
  {
    slug: 'assistant-vocal-artisans',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Comment lÃ¢â‚¬â„¢assistant vocal Kadria pose les bonnes questions ÃƒÂ  vos appelants et prÃƒÂ©pare une fiche exploitable, mÃƒÂªme quand vous ne pouvez pas rÃƒÂ©pondre.',
    readingTime: '3 min',
    publishedAt: '2026-06-12',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Sur un chantier, il nÃ¢â‚¬â„¢est pas toujours possible de dÃƒÂ©crocher. LÃ¢â‚¬â„¢assistant vocal Kadria prend le relais dans ces moments-lÃƒÂ , pour que chaque appel reste une opportunitÃƒÂ© plutÃƒÂ´t quÃ¢â‚¬â„¢un rendez-vous manquÃƒÂ©.',
      },
      { type: 'heading', text: 'Ce que fait lÃ¢â‚¬â„¢assistant vocal' },
      {
        type: 'paragraph',
        text: 'Il ÃƒÂ©change avec la personne qui appelle, pose les questions utiles pour comprendre sa demande Ã¢â‚¬â€ nature du besoin, urgence, coordonnÃƒÂ©es Ã¢â‚¬â€ et prÃƒÂ©pare une fiche claire, prÃƒÂªte ÃƒÂ  ÃƒÂªtre consultÃƒÂ©e dÃƒÂ¨s que vous ÃƒÂªtes disponible.',
      },
      { type: 'heading', text: 'ConcrÃƒÂ¨tement, pour vous' },
      {
        type: 'list',
        items: [
          'Moins dÃ¢â‚¬â„¢appels manquÃƒÂ©s sans suite',
          'Une fiche exploitable dÃƒÂ¨s votre retour de chantier',
          'Les informations essentielles rÃƒÂ©cupÃƒÂ©rÃƒÂ©es, sans avoir ÃƒÂ  rappeler pour les redemander',
          'Un rappel prÃƒÂ©parÃƒÂ© avec le contexte nÃƒÂ©cessaire',
        ],
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'LÃ¢â‚¬â„¢assistant vocal ne remplace pas la relation que vous entretenez avec vos clients : il vous permet de la garder intacte, mÃƒÂªme quand vous nÃ¢â‚¬â„¢ÃƒÂªtes pas disponible pour dÃƒÂ©crocher.',
      },
    ],
  },
  {
    slug: 'fiche-projet-kadria',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Client, besoin, photos, budget, dÃƒÂ©lai, statut, relance : la fiche projet centralise tout ce qui compte pour avancer sur un dossier.',
    readingTime: '3 min',
    publishedAt: '2026-06-19',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'La fiche projet est le cÃ…â€œur opÃƒÂ©rationnel de Kadria. Chaque demande, quel que soit son point dÃ¢â‚¬â„¢entrÃƒÂ©e Ã¢â‚¬â€ appel, message, formulaire Ã¢â‚¬â€ vient alimenter la mÃƒÂªme fiche, qui se construit et sÃ¢â‚¬â„¢enrichit au fil des ÃƒÂ©changes.',
      },
      { type: 'heading', text: 'Ce que contient une fiche projet' },
      {
        type: 'list',
        items: [
          'Les coordonnÃƒÂ©es et informations du client',
          'La description du besoin',
          'Les photos rattachÃƒÂ©es au dossier',
          'Le budget et le dÃƒÂ©lai, quand ils sont connus',
          'Le statut actuel du dossier',
          'Les relances prÃƒÂ©vues ou effectuÃƒÂ©es',
          'La prochaine action recommandÃƒÂ©e',
        ],
      },
      { type: 'heading', text: 'Pourquoi ÃƒÂ§a change le quotidien' },
      {
        type: 'paragraph',
        text: 'PlutÃƒÂ´t que de jongler entre plusieurs outils ou conversations, chaque dossier se consulte en un seul endroit. Il devient plus simple de savoir oÃƒÂ¹ en est chaque demande et ce quÃ¢â‚¬â„¢il reste ÃƒÂ  faire pour la faire avancer.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'La fiche projet donne une vue claire et ÃƒÂ  jour de chaque dossier, pour reprendre une demande ÃƒÂ  tout moment sans perdre de temps ÃƒÂ  retrouver le contexte.',
      },
    ],
  },
  {
    slug: 'relances-commerciales-artisans',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'article',
    excerpt:
      'Relancer les devis au bon moment, suivre les prospects les plus chauds et ÃƒÂ©viter les oublis, sans que cela devienne une tÃƒÂ¢che ÃƒÂ  part entiÃƒÂ¨re.',
    readingTime: '3 min',
    publishedAt: '2026-06-26',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Relancer un devis au bon moment fait souvent la diffÃƒÂ©rence entre un chantier signÃƒÂ© et un prospect perdu. Mais garder cette tÃƒÂ¢che en tÃƒÂªte, en plus du reste de lÃ¢â‚¬â„¢activitÃƒÂ©, demande une organisation que peu dÃ¢â‚¬â„¢artisans ont le temps de maintenir.',
      },
      { type: 'heading', text: 'Ce que Kadria suit pour vous' },
      {
        type: 'list',
        items: [
          'Les devis envoyÃƒÂ©s et leur statut',
          'Les prospects les plus engagÃƒÂ©s, ÃƒÂ  relancer en prioritÃƒÂ©',
          'Le moment recommandÃƒÂ© pour une relance',
          'LÃ¢â‚¬â„¢historique des ÃƒÂ©changes dÃƒÂ©jÃƒÂ  rÃƒÂ©alisÃƒÂ©s',
        ],
      },
      { type: 'heading', text: 'Une posture professionnelle, sans pression inutile' },
      {
        type: 'paragraph',
        text: 'LÃ¢â‚¬â„¢objectif nÃ¢â‚¬â„¢est pas de multiplier les relances, mais de savoir lesquelles sont utiles et ÃƒÂ  quel moment les faire. Un suivi structurÃƒÂ© permet de rester prÃƒÂ©sent auprÃƒÂ¨s des bons prospects, sans donner lÃ¢â‚¬â„¢impression dÃ¢â‚¬â„¢insister.',
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Avec un suivi commercial centralisÃƒÂ©, les relances se font au bon moment et pour les bons dossiers, sans que cela demande dÃ¢â‚¬â„¢y penser en permanence.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juin-2026',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'patch-note',
    excerpt:
      'Quotas mieux visibles dans le tableau de bord, filtres commerciaux plus utiles et amÃƒÂ©lioration de la lisibilitÃƒÂ© des fiches clients.',
    readingTime: '3 min',
    publishedAt: '2026-06-30',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales ÃƒÂ©volutions apportÃƒÂ©es ÃƒÂ  Kadria en juin, centrÃƒÂ©es sur la visibilitÃƒÂ© du tableau de bord et le suivi commercial au quotidien.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Quotas de projets, dÃ¢â‚¬â„¢appels vocaux et de devis dÃƒÂ©sormais mieux visibles',
          'Nouvelle carte quotas directement dans le tableau de bord',
          'Meilleur suivi des limites associÃƒÂ©es ÃƒÂ  chaque plan',
          'AmÃƒÂ©lioration gÃƒÂ©nÃƒÂ©rale du tableau de bord artisan',
        ],
      },
      { type: 'heading', text: 'AmÃƒÂ©liorations' },
      {
        type: 'list',
        items: [
          'Meilleure lecture des dossiers prioritaires',
          'Filtres commerciaux plus utiles au quotidien',
          'PrÃƒÂ©paration du futur suivi des relances',
          'Meilleure cohÃƒÂ©rence de lÃ¢â‚¬â„¢expÃƒÂ©rience mobile',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Stabilisation de lÃ¢â‚¬â„¢affichage des plans',
          'Correction de certains ÃƒÂ©tats commerciaux',
          'AmÃƒÂ©lioration de la lisibilitÃƒÂ© des fiches clients cÃƒÂ´tÃƒÂ© admin',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise ÃƒÂ  jour' },
      {
        type: 'paragraph',
        text: 'Mieux voir oÃƒÂ¹ lÃ¢â‚¬â„¢on en est de son plan et de ses dossiers prioritaires, cÃ¢â‚¬â„¢est gagner du temps sur des dÃƒÂ©cisions prises tous les jours. Cette mise ÃƒÂ  jour va dans ce sens.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juillet-2026',
    title: "Le Profil M\u00e9tier Kadria : pourquoi chaque artisan b\u00e9n\u00e9ficie d'une exp\u00e9rience adapt\u00e9e \u00e0 son m\u00e9tier",
    category: 'Fonctionnalit\u00e9',
    type: 'patch-note',
    excerpt:
      'Un point sur les derniÃƒÂ¨res amÃƒÂ©liorations apportÃƒÂ©es au cockpit commercial, ÃƒÂ  lÃ¢â‚¬â„¢assistant vocal et aux fiches projet.',
    readingTime: '3 min',
    publishedAt: '2026-07-07',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales amÃƒÂ©liorations apportÃƒÂ©es ÃƒÂ  Kadria ce mois-ci, pensÃƒÂ©es pour vous faire gagner du temps au quotidien sur le suivi de vos prospects et de vos chantiers.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Nouvelle fiche projet, plus claire et plus rapide ÃƒÂ  lire',
          'Assistant vocal plus naturel dans ses ÃƒÂ©changes avec vos prospects',
          'Meilleure priorisation des demandes entrantes',
          'AmÃƒÂ©lioration du suivi commercial de bout en bout',
        ],
      },
      { type: 'heading', text: 'AmÃƒÂ©liorations' },
      {
        type: 'list',
        items: [
          'Tableau de bord plus lisible',
          'Meilleure visibilitÃƒÂ© sur les relances en cours',
          'Affichage plus clair des dossiers prioritaires',
          'ExpÃƒÂ©rience mobile amÃƒÂ©liorÃƒÂ©e',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Correction de certains doublons dans les informations projet',
          'AmÃƒÂ©lioration des performances dÃ¢â‚¬â„¢affichage',
          'Stabilisation de plusieurs ÃƒÂ©tats commerciaux',
        ],
      },
      { type: 'heading', text: 'En rÃƒÂ©sumÃƒÂ©' },
      {
        type: 'paragraph',
        text: 'Kadria ÃƒÂ©volue en continu pour aider les artisans ÃƒÂ  gagner du temps, mieux suivre leurs prospects et transformer plus de demandes en chantiers.',
      },
    ],
  },
];

export function getAllResources(): Resource[] {
  return RESOURCES;
}

export function getResourceBySlug(slug: string): Resource | undefined {
  return RESOURCES.find((resource) => resource.slug === slug);
}

export function getFeaturedResources(): Resource[] {
  return RESOURCES.filter((resource) => resource.featured);
}

export function getResourcesByCategory(category: ResourceCategory): Resource[] {
  return RESOURCES.filter((resource) => resource.category === category);
}
