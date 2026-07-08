/**
 * Kadria Academy — données statiques des ressources (V1, sans CMS).
 *
 * Ce fichier est la source unique de vérité pour /ressources et
 * /ressources/[slug]. Pour ajouter une ressource, il suffit d'ajouter une
 * entrée au tableau RESOURCES ci-dessous.
 */

export type ResourceCategory =
  | 'Cas d’utilisation'
  | 'Guide'
  | 'Nouveautés'
  | 'Fonctionnalité';

export type ResourceType = 'article' | 'guide' | 'patch-note';

export type ResourceContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] };

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
}

export const RESOURCES: Resource[] = [
  {
    slug: 'demande-client-en-dossier-pret-a-chiffrer',
    title: 'Comment une simple demande client devient un dossier prêt à chiffrer',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Découvrez comment Kadria transforme un appel, un message ou une demande incomplète en dossier clair, exploitable et prêt pour le devis.',
    readingTime: '4 min',
    publishedAt: '2026-06-02',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Un artisan reçoit souvent des demandes dispersées : un appel pendant un chantier, un SMS le soir, un message WhatsApp avec une photo, ou un formulaire rempli à moitié. Chacune de ces demandes contient une partie de l’information, rarement toute l’information.',
      },
      { type: 'heading', text: 'Avant : des informations dispersées et incomplètes' },
      {
        type: 'paragraph',
        text: 'Sans outil dédié, ces demandes s’accumulent dans des canaux différents. Le budget n’est pas mentionné, le délai souhaité reste flou, les photos envoyées par message se perdent dans la conversation, et le devis finit par être repoussé faute de temps pour tout rassembler. Résultat : des oublis, des relances tardives, et des opportunités qui refroidissent.',
      },
      { type: 'heading', text: 'Avec Kadria : une demande centralisée et qualifiée' },
      {
        type: 'paragraph',
        text: 'Dès qu’une demande arrive, Kadria la centralise, la qualifie et l’enrichit automatiquement. Chaque échange vient compléter la même fiche projet, qui devient au fil du temps un dossier clair et priorisable.',
      },
      {
        type: 'list',
        items: [
          'Coordonnées du client centralisées en un seul endroit',
          'Description du besoin claire et structurée',
          'Photos rattachées directement au dossier',
          'Budget et délai identifiés dès que possible',
          'Niveau de complétude du dossier visible d’un coup d’œil',
          'Prochaine action recommandée pour ne jamais rester bloqué',
        ],
      },
      { type: 'heading', text: 'Le résultat' },
      {
        type: 'paragraph',
        text: 'Moins d’oublis, des dossiers plus propres, et des devis préparés plus rapidement. L’artisan garde le contrôle de sa relation client, sans passer son temps à reconstituer des informations éparpillées.',
      },
    ],
  },
  {
    slug: 'relancer-un-devis-sans-etre-insistant',
    title: 'Comment relancer un devis sans être insistant',
    category: 'Guide',
    type: 'guide',
    excerpt:
      'Une méthode simple pour relancer les bons prospects au bon moment, sans passer pour un commercial agressif.',
    readingTime: '5 min',
    publishedAt: '2026-06-18',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Beaucoup d’artisans perdent des chantiers non pas à cause du prix, mais parce que le devis envoyé n’est jamais relancé. Le client a d’autres priorités, oublie de répondre, et le projet finit par partir chez un concurrent plus présent au bon moment.',
      },
      { type: 'heading', text: 'Pourquoi il ne faut pas relancer tout le monde de la même manière' },
      {
        type: 'paragraph',
        text: 'Tous les devis n’ont pas la même température. Un client qui a demandé un rendez-vous rapide n’a pas le même niveau d’urgence qu’un client qui explore plusieurs devis pour un projet à six mois. Relancer de la même façon, avec la même fréquence, revient à traiter des situations très différentes comme si elles étaient identiques.',
      },
      { type: 'heading', text: 'Identifier les devis « chauds »' },
      {
        type: 'paragraph',
        text: 'Un devis chaud est un devis où le client a montré des signaux clairs d’intérêt : délai serré, budget déjà validé, demande précise. Ces dossiers méritent une relance rapide et personnalisée, avant que l’intérêt ne retombe.',
      },
      { type: 'heading', text: 'Relancer au bon moment' },
      {
        type: 'paragraph',
        text: 'Une relance trop précoce donne une impression de pression. Une relance trop tardive arrive après que le client a déjà fait son choix. Le bon rythme dépend du projet, mais une première relance quelques jours après l’envoi du devis, suivie d’une seconde plus espacée, reste une base solide pour la plupart des chantiers.',
      },
      { type: 'heading', text: 'Garder un ton professionnel' },
      {
        type: 'paragraph',
        text: 'Une relance efficace n’est pas une insistance. Elle rappelle le devis, propose de répondre à des questions éventuelles, et laisse la porte ouverte sans mettre le client sous pression. Le ton compte autant que le moment.',
      },
      { type: 'heading', text: 'Noter chaque échange' },
      {
        type: 'paragraph',
        text: 'Chaque relance, chaque réponse, chaque hésitation exprimée par le client est une information utile pour la suite. Sans trace écrite, ces détails se perdent et les relances suivantes repartent de zéro.',
      },
      { type: 'heading', text: 'Utiliser Kadria pour ne rien oublier' },
      {
        type: 'paragraph',
        text: 'Kadria garde la trace des devis envoyés, signale les dossiers à relancer et centralise l’historique des échanges, pour que chaque relance parte d’un contexte complet plutôt que de la mémoire de l’artisan.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Une bonne relance est un service rendu au client, pas une pression commerciale. Elle montre que l’artisan est organisé, disponible et sérieux — ce qui fait souvent la différence au moment de signer.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juillet-2026',
    title: 'Nouveautés Kadria — Juillet 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Un point sur les dernières améliorations apportées au cockpit commercial, à l’assistant vocal et aux fiches projet.',
    readingTime: '3 min',
    publishedAt: '2026-07-07',
    featured: true,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales améliorations apportées à Kadria ce mois-ci, pensées pour vous faire gagner du temps au quotidien sur le suivi de vos prospects et de vos chantiers.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Nouvelle fiche projet, plus claire et plus rapide à lire',
          'Assistant vocal plus naturel dans ses échanges avec vos prospects',
          'Meilleure priorisation des demandes entrantes',
          'Amélioration du suivi commercial de bout en bout',
        ],
      },
      { type: 'heading', text: 'Améliorations' },
      {
        type: 'list',
        items: [
          'Tableau de bord plus lisible',
          'Meilleure visibilité sur les relances en cours',
          'Affichage plus clair des dossiers prioritaires',
          'Expérience mobile améliorée',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Correction de certains doublons dans les informations projet',
          'Amélioration des performances d’affichage',
          'Stabilisation de plusieurs états commerciaux',
        ],
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Kadria évolue en continu pour aider les artisans à gagner du temps, mieux suivre leurs prospects et transformer plus de demandes en chantiers.',
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
