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
  | 'Fonctionnalité'
  | 'Métier';

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
    slug: 'kadria-pour-paysagistes',
    title: 'Kadria pour paysagistes : organiser les demandes de jardin, entretien et aménagement extérieur',
    category: 'Métier',
    type: 'article',
    excerpt:
      'Entretien, taille, terrasse, clôture, aménagement extérieur : comment centraliser des demandes très saisonnières et prioriser celles qui comptent vraiment.',
    readingTime: '4 min',
    publishedAt: '2026-04-10',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Chez un paysagiste, les demandes ne se ressemblent jamais tout à fait : un entretien régulier, une taille de haie, la création d’une terrasse, la pose d’une clôture, un aménagement complet de jardin. Elles arrivent souvent par vagues, au même moment de la saison, avec des photos, des surfaces approximatives et des délais qui deviennent urgents dès les beaux jours.',
      },
      { type: 'heading', text: 'Des demandes très concentrées dans le temps' },
      {
        type: 'paragraph',
        text: 'Le printemps et le début d’été concentrent une grande partie des demandes de l’année : entretien de reprise, projets d’aménagement pensés pendant l’hiver, urgences liées à une haie trop haute avant un contrôle de voisinage. Sans organisation, ces demandes s’accumulent et certaines finissent oubliées, simplement parce qu’elles sont arrivées en même temps que dix autres.',
      },
      { type: 'heading', text: 'Ce que Kadria centralise pour vous' },
      {
        type: 'list',
        items: [
          'Type d’intervention : entretien, taille, terrasse, clôture, aménagement',
          'Photos du terrain et dimensions approximatives transmises par le client',
          'Niveau d’urgence, notamment en période chargée de printemps et d’été',
          'Budget évoqué par le client, quand il est mentionné',
          'Relances automatiques avant les périodes les plus chargées',
        ],
      },
      { type: 'heading', text: 'Prioriser les demandes les plus rentables' },
      {
        type: 'paragraph',
        text: 'Toutes les demandes ne se valent pas au même moment. Un chantier d’aménagement bien qualifié mérite d’être traité avant un simple entretien ponctuel si l’agenda est serré. Avec un dossier clair pour chaque demande, il devient plus simple d’arbitrer et de concentrer son temps sur les projets qui font vraiment avancer l’activité.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Kadria aide les paysagistes à garder une vue d’ensemble sur des demandes saisonnières et variées, à ne rien laisser filer pendant les périodes chargées, et à préparer des devis sur des dossiers déjà qualifiés.',
      },
    ],
  },
  {
    slug: 'kadria-pour-plombiers',
    title: 'Kadria pour plombiers : traiter les urgences sans perdre les chantiers plus rentables',
    category: 'Métier',
    type: 'article',
    excerpt:
      'Fuite à traiter dans l’heure, demande de salle de bain à chiffrer plus tard : comment trier sans laisser filer les projets les plus intéressants.',
    readingTime: '4 min',
    publishedAt: '2026-04-17',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un plombier reçoit rarement des demandes de même nature dans une même journée : une fuite à traiter dans l’heure, un remplacement de chaudière à planifier, un projet de salle de bain à chiffrer dans les prochaines semaines. Ces demandes n’ont ni la même urgence, ni la même rentabilité, et pourtant elles arrivent souvent par les mêmes canaux, mélangées.',
      },
      { type: 'heading', text: 'Le risque : traiter tout comme une urgence' },
      {
        type: 'paragraph',
        text: 'Quand chaque appel est traité dans l’ordre d’arrivée, les demandes de rénovation plus importantes — salle de bain, remplacement de ballon, tuyauterie complète — passent souvent après les dépannages, alors qu’elles représentent souvent les chantiers les plus rentables sur la durée.',
      },
      { type: 'heading', text: 'Ce que Kadria aide à structurer' },
      {
        type: 'list',
        items: [
          'Distinction claire entre urgence (fuite, dépannage) et projet planifiable',
          'Informations essentielles sur les demandes de salle de bain ou de remplacement de chaudière',
          'Fiche projet exploitable, prête à être reprise pour établir un devis',
          'Rappel et suivi automatiques pour ne pas laisser une demande sans réponse',
        ],
      },
      { type: 'heading', text: 'Trier sans perdre de temps' },
      {
        type: 'paragraph',
        text: 'L’objectif n’est pas de traiter moins d’urgences, mais de ne plus laisser les projets plus rentables se noyer au milieu des dépannages. Une demande de rénovation bien qualifiée, avec les bonnes informations dès le départ, se transforme plus facilement en devis solide.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Kadria aide les plombiers à garder une longueur d’avance sur les urgences tout en gardant un œil clair sur les chantiers plus importants, ceux qui méritent un suivi commercial soigné.',
      },
    ],
  },
  {
    slug: 'kadria-pour-electriciens',
    title: 'Kadria pour électriciens : mieux qualifier les demandes avant de se déplacer',
    category: 'Métier',
    type: 'article',
    excerpt:
      'Dépannage, mise aux normes, rénovation, installation complète : comment obtenir les bonnes informations avant même le premier rendez-vous.',
    readingTime: '4 min',
    publishedAt: '2026-04-24',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Une demande d’électricité peut recouvrir des réalités très différentes : un simple dépannage, une mise aux normes du tableau électrique, une rénovation complète, ou l’installation électrique d’un logement neuf. Sans détails précis, il est difficile d’estimer le temps nécessaire ou de préparer correctement un déplacement.',
      },
      { type: 'heading', text: 'Le problème des demandes trop générales' },
      {
        type: 'paragraph',
        text: '« J’ai un souci électrique » ou « je veux refaire mon installation » sont des demandes fréquentes, mais elles ne disent presque rien sur l’ampleur réelle du travail. Se déplacer sans ces informations fait perdre du temps, autant à l’artisan qu’au client.',
      },
      { type: 'heading', text: 'Les informations que Kadria aide à récupérer' },
      {
        type: 'list',
        items: [
          'Type de logement et surface approximative',
          'État du tableau électrique, quand cette information est disponible',
          'Nombre de pièces, de prises ou de points lumineux concernés',
          'Photos de l’installation existante',
          'Budget envisagé et délai souhaité par le client',
        ],
      },
      { type: 'heading', text: 'Un devis préparé plus rapidement' },
      {
        type: 'paragraph',
        text: 'Avec un dossier déjà qualifié avant le rendez-vous, il devient plus simple de préparer une estimation cohérente, voire de filtrer les demandes qui nécessitent réellement un déplacement de celles qui peuvent être chiffrées plus directement.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Kadria aide les électriciens à transformer des demandes floues en dossiers concrets, pour préparer des devis plus rapidement et limiter les déplacements peu utiles.',
      },
    ],
  },
  {
    slug: 'kadria-pour-couvreurs',
    title: 'Kadria pour couvreurs : prioriser les urgences toiture et préparer les gros devis',
    category: 'Métier',
    type: 'article',
    excerpt:
      'Fuite après un orage, projet de rénovation complète, zinguerie, isolation : comment qualifier chaque demande de toiture avant de se déplacer.',
    readingTime: '4 min',
    publishedAt: '2026-05-01',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Le métier de couvreur alterne entre deux réalités : des urgences, souvent après un épisode météo difficile, et des chantiers plus importants — réparation, rénovation, zinguerie, isolation de toiture — qui demandent un devis préparé avec soin.',
      },
      { type: 'heading', text: 'Après une tempête, tout arrive en même temps' },
      {
        type: 'paragraph',
        text: 'Après un orage ou un épisode de vent fort, les demandes de fuite ou de tuiles endommagées affluent en quelques heures. Sans méthode pour les trier, il est difficile de savoir laquelle traiter en premier, et certaines demandes urgentes peuvent se perdre dans le flux.',
      },
      { type: 'heading', text: 'Ce que Kadria permet de récupérer avant le déplacement' },
      {
        type: 'list',
        items: [
          'Localisation précise de la fuite ou du dommage',
          'Photos de la toiture transmises par le client',
          'Surface approximative concernée par les travaux',
          'Accès au chantier (hauteur, toiture accessible ou non)',
          'Niveau d’urgence, en particulier après un épisode météo',
        ],
      },
      { type: 'heading', text: 'Séparer l’urgence du gros chantier' },
      {
        type: 'paragraph',
        text: 'Une fuite ponctuelle et un projet de rénovation complète de toiture n’appellent ni le même délai de réponse, ni la même préparation. En qualifiant chaque demande dès son arrivée, il devient plus simple de traiter les urgences rapidement tout en préparant sérieusement les devis les plus conséquents.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Kadria aide les couvreurs à absorber les pics d’urgence sans perdre de vue les chantiers de rénovation, souvent plus longs à préparer mais plus déterminants pour l’activité.',
      },
    ],
  },
  {
    slug: 'demande-whatsapp-dossier-complet',
    title: 'Quand une demande WhatsApp devient un dossier complet',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Trois lignes de message et deux photos : voici comment cette demande, autrefois perdue dans une conversation, devient un dossier structuré avec Kadria.',
    readingTime: '3 min',
    publishedAt: '2026-05-08',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un client envoie un message WhatsApp : trois lignes qui décrivent rapidement son besoin, accompagnées de deux photos prises avec son téléphone. C’est souvent tout ce qu’un artisan reçoit pour démarrer une demande — et c’est largement suffisant pour commencer, à condition que rien ne se perde en chemin.',
      },
      { type: 'heading', text: 'Avant : une information qui reste coincée dans la conversation' },
      {
        type: 'paragraph',
        text: 'Sans organisation dédiée, ce message reste un message parmi d’autres. Les photos se mélangent avec des échanges personnels ou d’autres clients, le texte n’est jamais reformulé clairement, et il faut rouvrir la conversation à chaque fois pour se souvenir des détails.',
      },
      { type: 'heading', text: 'Avec Kadria : un dossier qui se construit tout seul' },
      {
        type: 'paragraph',
        text: 'La demande est récupérée, reformulée et rattachée à une fiche projet claire. Les photos sont conservées au bon endroit, les informations utiles sont mises en évidence, et le dossier peut être complété au fil des échanges suivants avec le même client.',
      },
      { type: 'heading', text: 'Le résultat' },
      {
        type: 'paragraph',
        text: 'Ce qui commençait comme trois lignes et deux photos devient un dossier exploitable, prêt à être repris pour préparer un devis ou organiser une visite, sans avoir à tout reconstituer de mémoire.',
      },
    ],
  },
  {
    slug: 'appel-manque-chantier-perdu',
    title: 'Un appel manqué ne devrait jamais devenir un chantier perdu',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Sur un chantier, impossible de répondre à chaque appel. Voici comment Kadria récupère l’intention du client et prépare un rappel utile.',
    readingTime: '3 min',
    publishedAt: '2026-05-15',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Un artisan en plein chantier ne peut pas toujours décrocher. Le téléphone sonne, personne ne répond, et l’appel finit en absence — sans qu’on sache si c’était un client existant, un nouveau prospect, ou une urgence.',
      },
      { type: 'heading', text: 'Ce qui se perd avec un simple appel manqué' },
      {
        type: 'paragraph',
        text: 'Sans information sur la raison de l’appel, il est difficile de savoir comment et quand rappeler. Certains prospects n’insistent pas et se tournent vers un autre artisan plus disponible, simplement parce que le premier contact n’a pas pu être récupéré.',
      },
      { type: 'heading', text: 'Ce que Kadria change' },
      {
        type: 'paragraph',
        text: 'Kadria récupère l’intention du client dès l’appel, structure les informations utiles — nature de la demande, urgence, coordonnées — et prépare un rappel avec le contexte nécessaire pour reprendre la conversation efficacement, sans repartir de zéro.',
      },
      { type: 'heading', text: 'Le résultat' },
      {
        type: 'paragraph',
        text: 'Un appel manqué reste une opportunité, pas une perte. L’artisan peut rappeler au moment où il est disponible, avec toutes les informations en main pour répondre directement au besoin du client.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-mai-2026',
    title: 'Nouveautés Kadria — Mai 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Premiers parcours de devis, suivi d’acceptation et de refus, fiches projet plus complètes : le point sur les évolutions du mois de mai.',
    readingTime: '3 min',
    publishedAt: '2026-05-29',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales évolutions apportées à Kadria en mai, centrées sur le parcours devis et la préparation des dossiers client.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Premiers parcours de devis intégrés au produit',
          'Suivi de l’acceptation ou du refus d’un devis',
          'Lien public permettant au client de donner sa décision directement',
          'Amélioration des statuts commerciaux associés à chaque dossier',
        ],
      },
      { type: 'heading', text: 'Améliorations' },
      {
        type: 'list',
        items: [
          'Fiches projet plus complètes',
          'Meilleure gestion des photos rattachées à un dossier',
          'Préparation des futures relances de devis',
          'Expérience prospect plus fluide sur le lien de décision',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Meilleure stabilité des formulaires',
          'Correction d’affichages incohérents sur certaines fiches',
          'Optimisation des performances sur certaines pages',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise à jour' },
      {
        type: 'paragraph',
        text: 'Le devis est souvent le moment où tout se joue avec un prospect. Ces évolutions visent à rendre ce moment plus simple à suivre, autant pour l’artisan que pour son client.',
      },
    ],
  },
  {
    slug: 'preparer-devis-apres-journee-chantier',
    title: 'Préparer ses devis après une journée de chantier sans repartir de zéro',
    category: 'Cas d’utilisation',
    type: 'article',
    excerpt:
      'Le soir, après une journée de chantier, retrouver rapidement les informations, photos et budgets nécessaires pour avancer sur ses devis.',
    readingTime: '3 min',
    publishedAt: '2026-06-05',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Le soir, après une journée sur le terrain, c’est souvent le seul moment disponible pour avancer sur les devis en attente. Encore faut-il retrouver rapidement les informations nécessaires : ce que le client a demandé, les photos échangées, le budget évoqué.',
      },
      { type: 'heading', text: 'Le temps perdu à tout reconstituer' },
      {
        type: 'paragraph',
        text: 'Sans dossier centralisé, préparer un devis implique souvent de rouvrir plusieurs conversations, de retrouver des photos éparpillées, et de se fier à sa mémoire pour les détails évoqués en rendez-vous. Ce temps de reconstitution s’ajoute à une journée déjà longue.',
      },
      { type: 'heading', text: 'Ce que Kadria centralise pour ce moment précis' },
      {
        type: 'list',
        items: [
          'Toutes les informations du dossier au même endroit',
          'Photos rattachées directement à la fiche projet',
          'Budget et délai déjà identifiés',
          'Historique des échanges avec le client',
        ],
      },
      { type: 'heading', text: 'Le résultat' },
      {
        type: 'paragraph',
        text: 'Préparer un devis devient une tâche plus rapide et moins fastidieuse, avec toutes les informations déjà rassemblées au bon endroit, prêtes à être reprises en quelques minutes.',
      },
    ],
  },
  {
    slug: 'assistant-vocal-artisans',
    title: 'Assistant vocal Kadria : qualifier les appels même quand vous êtes sur chantier',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      'Comment l’assistant vocal Kadria pose les bonnes questions à vos appelants et prépare une fiche exploitable, même quand vous ne pouvez pas répondre.',
    readingTime: '3 min',
    publishedAt: '2026-06-12',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Sur un chantier, il n’est pas toujours possible de décrocher. L’assistant vocal Kadria prend le relais dans ces moments-là, pour que chaque appel reste une opportunité plutôt qu’un rendez-vous manqué.',
      },
      { type: 'heading', text: 'Ce que fait l’assistant vocal' },
      {
        type: 'paragraph',
        text: 'Il échange avec la personne qui appelle, pose les questions utiles pour comprendre sa demande — nature du besoin, urgence, coordonnées — et prépare une fiche claire, prête à être consultée dès que vous êtes disponible.',
      },
      { type: 'heading', text: 'Concrètement, pour vous' },
      {
        type: 'list',
        items: [
          'Moins d’appels manqués sans suite',
          'Une fiche exploitable dès votre retour de chantier',
          'Les informations essentielles récupérées, sans avoir à rappeler pour les redemander',
          'Un rappel préparé avec le contexte nécessaire',
        ],
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'L’assistant vocal ne remplace pas la relation que vous entretenez avec vos clients : il vous permet de la garder intacte, même quand vous n’êtes pas disponible pour décrocher.',
      },
    ],
  },
  {
    slug: 'fiche-projet-kadria',
    title: 'La fiche projet Kadria : toutes les informations utiles au même endroit',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      'Client, besoin, photos, budget, délai, statut, relance : la fiche projet centralise tout ce qui compte pour avancer sur un dossier.',
    readingTime: '3 min',
    publishedAt: '2026-06-19',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'La fiche projet est le cœur opérationnel de Kadria. Chaque demande, quel que soit son point d’entrée — appel, message, formulaire — vient alimenter la même fiche, qui se construit et s’enrichit au fil des échanges.',
      },
      { type: 'heading', text: 'Ce que contient une fiche projet' },
      {
        type: 'list',
        items: [
          'Les coordonnées et informations du client',
          'La description du besoin',
          'Les photos rattachées au dossier',
          'Le budget et le délai, quand ils sont connus',
          'Le statut actuel du dossier',
          'Les relances prévues ou effectuées',
          'La prochaine action recommandée',
        ],
      },
      { type: 'heading', text: 'Pourquoi ça change le quotidien' },
      {
        type: 'paragraph',
        text: 'Plutôt que de jongler entre plusieurs outils ou conversations, chaque dossier se consulte en un seul endroit. Il devient plus simple de savoir où en est chaque demande et ce qu’il reste à faire pour la faire avancer.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'La fiche projet donne une vue claire et à jour de chaque dossier, pour reprendre une demande à tout moment sans perdre de temps à retrouver le contexte.',
      },
    ],
  },
  {
    slug: 'relances-commerciales-artisans',
    title: 'Relances commerciales : suivre les bons prospects sans y penser toute la journée',
    category: 'Fonctionnalité',
    type: 'article',
    excerpt:
      'Relancer les devis au bon moment, suivre les prospects les plus chauds et éviter les oublis, sans que cela devienne une tâche à part entière.',
    readingTime: '3 min',
    publishedAt: '2026-06-26',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Relancer un devis au bon moment fait souvent la différence entre un chantier signé et un prospect perdu. Mais garder cette tâche en tête, en plus du reste de l’activité, demande une organisation que peu d’artisans ont le temps de maintenir.',
      },
      { type: 'heading', text: 'Ce que Kadria suit pour vous' },
      {
        type: 'list',
        items: [
          'Les devis envoyés et leur statut',
          'Les prospects les plus engagés, à relancer en priorité',
          'Le moment recommandé pour une relance',
          'L’historique des échanges déjà réalisés',
        ],
      },
      { type: 'heading', text: 'Une posture professionnelle, sans pression inutile' },
      {
        type: 'paragraph',
        text: 'L’objectif n’est pas de multiplier les relances, mais de savoir lesquelles sont utiles et à quel moment les faire. Un suivi structuré permet de rester présent auprès des bons prospects, sans donner l’impression d’insister.',
      },
      { type: 'heading', text: 'En résumé' },
      {
        type: 'paragraph',
        text: 'Avec un suivi commercial centralisé, les relances se font au bon moment et pour les bons dossiers, sans que cela demande d’y penser en permanence.',
      },
    ],
  },
  {
    slug: 'nouveautes-kadria-juin-2026',
    title: 'Nouveautés Kadria — Juin 2026',
    category: 'Nouveautés',
    type: 'patch-note',
    excerpt:
      'Quotas mieux visibles dans le tableau de bord, filtres commerciaux plus utiles et amélioration de la lisibilité des fiches clients.',
    readingTime: '3 min',
    publishedAt: '2026-06-30',
    featured: false,
    content: [
      {
        type: 'paragraph',
        text: 'Voici les principales évolutions apportées à Kadria en juin, centrées sur la visibilité du tableau de bord et le suivi commercial au quotidien.',
      },
      { type: 'heading', text: 'Nouveau' },
      {
        type: 'list',
        items: [
          'Quotas de projets, d’appels vocaux et de devis désormais mieux visibles',
          'Nouvelle carte quotas directement dans le tableau de bord',
          'Meilleur suivi des limites associées à chaque plan',
          'Amélioration générale du tableau de bord artisan',
        ],
      },
      { type: 'heading', text: 'Améliorations' },
      {
        type: 'list',
        items: [
          'Meilleure lecture des dossiers prioritaires',
          'Filtres commerciaux plus utiles au quotidien',
          'Préparation du futur suivi des relances',
          'Meilleure cohérence de l’expérience mobile',
        ],
      },
      { type: 'heading', text: 'Corrections' },
      {
        type: 'list',
        items: [
          'Stabilisation de l’affichage des plans',
          'Correction de certains états commerciaux',
          'Amélioration de la lisibilité des fiches clients côté admin',
        ],
      },
      { type: 'heading', text: 'Pourquoi cette mise à jour' },
      {
        type: 'paragraph',
        text: 'Mieux voir où l’on en est de son plan et de ses dossiers prioritaires, c’est gagner du temps sur des décisions prises tous les jours. Cette mise à jour va dans ce sens.',
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
