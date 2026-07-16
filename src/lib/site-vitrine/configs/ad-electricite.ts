import type { SiteVitrineConfig } from '../types'

/**
 * AD Électricité — démonstrateur de l'add-on « Site vitrine artisan ».
 *
 * ⚠️ Entreprise FICTIVE. Toutes les données (coordonnées, réalisations,
 * avis, délais, budgets) sont des exemples de démonstration, et le site
 * le mentionne explicitement à plusieurs endroits.
 */
export const adElectricite: SiteVitrineConfig = {
  slug: 'ad_electricite',
  trade: 'electricien',
  isDemo: true,

  identity: {
    name: 'AD Électricité',
    wordmark: ['AD', 'Électricité'],
    tagline: 'Électricien à Reims et alentours',
    city: 'Reims',
    phoneDisplay: '03 XX XX XX XX',
    phoneNote: 'Numéro masqué — site de démonstration',
    email: 'contact@ad-electricite.exemple',
    address: 'Reims (adresse fictive de démonstration)',
  },

  theme: {
    paper: '#f6f5f1',
    paperSoft: '#efeee8',
    ink: '#131c2b',
    body: '#3b4454',
    muted: '#6b7280',
    night: '#101d33',
    brand: '#1d3a66',
    accent: '#c2410c',
    accentStrong: '#9a3412',
    line: '#d9d7cd',
    lineOnDark: 'rgba(246,245,241,0.14)',
  },

  nav: [
    { label: 'Prestations', href: '#prestations' },
    { label: 'Réalisations', href: '#realisations' },
    { label: 'Méthode', href: '#methode' },
    { label: 'Secteur', href: '#zone' },
    { label: 'FAQ', href: '#faq' },
  ],

  hero: {
    eyebrow: 'Électricien — Reims et communes environnantes',
    title: [
      'L’électricité bien faite,',
      'du tableau jusqu’à la borne de recharge.',
    ],
    subtitle:
      'Dépannage, rénovation, mise aux normes, borne de recharge : AD Électricité intervient à Reims et dans les communes voisines, avec un devis détaillé et des explications claires à chaque étape.',
    primaryCta: 'Décrire mon projet',
    secondaryCta: 'Voir nos réalisations',
    reassurance: [
      'Devis détaillé poste par poste',
      'Réponse à votre demande sous 24 h ouvrées',
      'Un seul interlocuteur, du devis à la fin du chantier',
    ],
    specialty: {
      label: 'Interventions courantes',
      items: [
        'Remplacement de tableau électrique',
        'Borne de recharge 7 kW en maison',
        'Mise en conformité avant vente ou location',
        'Rénovation électrique complète',
      ],
    },
  },

  trust: {
    title: 'Nos engagements',
    commitments: [
      {
        title: 'Intervention locale',
        detail: 'Basés à Reims, nous intervenons dans un rayon de 25 km. Pas de déplacement facturé à l’aveugle.',
      },
      {
        title: 'Explications claires',
        detail: 'Chaque intervention est expliquée simplement : ce qu’on fait, pourquoi, et ce que ça change pour vous.',
      },
      {
        title: 'Devis détaillé',
        detail: 'Un devis poste par poste, avec le matériel désigné précisément. Pas de ligne « forfait divers ».',
      },
      {
        title: 'Chantier propre',
        detail: 'Protection des sols, rebouchage soigné des saignées, évacuation des déchets en fin de chantier.',
      },
      {
        title: 'Demande suivie',
        detail: 'Votre demande est enregistrée et suivie : vous savez toujours où elle en est, sans relancer.',
      },
      {
        title: 'Interlocuteur unique',
        detail: 'La personne qui chiffre votre projet est celle qui le réalise. Pas de commercial intermédiaire.',
      },
    ],
  },

  prestations: {
    title: 'Ce que nous faisons',
    intro:
      'Quatre interventions représentent l’essentiel de nos chantiers. Les autres prestations complètent une installation ou accompagnent une rénovation.',
    items: [
      {
        id: 'depannage',
        title: 'Dépannage électrique',
        emphasis: 'lead',
        description:
          'Panne générale, disjoncteur qui saute, prise qui chauffe, odeur suspecte : nous cherchons la cause, pas seulement le symptôme. Vous repartez avec une installation sûre et une explication de ce qui s’est passé.',
        examples: [
          'Recherche de panne après coupure partielle',
          'Remplacement d’un disjoncteur défectueux',
          'Sécurisation d’une prise ou d’une ligne qui chauffe',
        ],
        ctaLabel: 'Décrire ma panne',
      },
      {
        id: 'renovation',
        title: 'Rénovation électrique',
        emphasis: 'lead',
        description:
          'Maison ancienne, appartement à rafraîchir ou extension : nous reprenons l’installation pièce par pièce ou en totalité, en coordonnant le passage des câbles avec vos autres travaux.',
        examples: [
          'Réfection complète d’un appartement des années 70',
          'Reprise de l’électricité d’une cuisine refaite',
          'Alimentation d’une extension ou d’un garage',
        ],
        ctaLabel: 'Décrire ma rénovation',
      },
      {
        id: 'borne',
        title: 'Borne de recharge véhicule électrique',
        emphasis: 'lead',
        description:
          'Installation de bornes 7 kW en maison individuelle : vérification du tableau, dimensionnement de la ligne, pose, paramétrage de la puissance et essais en conditions réelles avec votre véhicule.',
        examples: [
          'Borne 7 kW murale en garage',
          'Borne sur pied en extérieur avec ligne enterrée',
          'Ajout d’un délesteur pour éviter les coupures',
        ],
        ctaLabel: 'Étudier mon projet de borne',
      },
      {
        id: 'tableau',
        title: 'Tableau & mise en conformité',
        emphasis: 'lead',
        description:
          'Remplacement de tableaux vétustes, ajout de différentiels, mise en conformité avant une vente ou une location. Nous documentons l’état avant/après pour vos démarches.',
        examples: [
          'Remplacement d’un tableau à fusibles par un tableau moderne',
          'Mise en conformité suite à un diagnostic de vente',
          'Ajout de protections différentielles 30 mA',
        ],
        ctaLabel: 'Faire vérifier mon tableau',
      },
      {
        id: 'eclairage',
        title: 'Installation d’éclairage',
        emphasis: 'standard',
        description:
          'Éclairage intérieur sur mesure (spots, variateurs, rubans LED) et extérieur (façade, terrasse, détection).',
        examples: ['Plan lumière d’un séjour', 'Éclairage de terrasse avec détection'],
        ctaLabel: 'Parler éclairage',
      },
      {
        id: 'domotique',
        title: 'Domotique',
        emphasis: 'standard',
        description:
          'Pilotage du chauffage, des volets et de l’éclairage, avec des solutions simples qui restent utilisables sans application.',
        examples: ['Centralisation des volets roulants', 'Thermostat connecté sur chaudière existante'],
        ctaLabel: 'Parler domotique',
      },
      {
        id: 'neuf',
        title: 'Installation neuve',
        emphasis: 'standard',
        description:
          'Électricité complète de constructions neuves, en lien avec votre constructeur ou votre architecte, du tableau aux finitions.',
        examples: ['Maison individuelle neuve', 'Studio créé dans un comble aménagé'],
        ctaLabel: 'Parler construction',
      },
    ],
  },

  caseStudy: {
    eyebrow: 'Réalisation détaillée — exemple de démonstration',
    title: 'Borne de recharge 7 kW en maison individuelle',
    location: 'Maison des années 90 — secteur Tinqueux (cas fictif présenté à titre d’exemple)',
    context:
      'Les propriétaires venaient de commander un véhicule électrique et voulaient recharger la nuit, sans risquer de faire disjoncter la maison. Le tableau, d’origine, n’avait plus d’emplacement libre.',
    steps: [
      {
        title: 'Vérification du tableau et de l’abonnement',
        detail:
          'Contrôle des protections existantes, mesure de la place disponible et validation de la puissance souscrite : ici, un passage de 6 à 9 kVA était nécessaire.',
      },
      {
        title: 'Préparation de la ligne dédiée',
        detail:
          'Ajout d’une rangée au tableau, protection différentielle dédiée et passage d’un câble 10 mm² sur 18 mètres, en goulotte dans le garage.',
      },
      {
        title: 'Pose de la borne',
        detail:
          'Fixation murale à hauteur d’usage, à côté de la place de stationnement, câble de recharge accessible sans enjamber le capot.',
      },
      {
        title: 'Paramétrage',
        detail:
          'Réglage de la puissance de charge à 7 kW, programmation de la recharge en heures creuses et activation du délestage.',
      },
      {
        title: 'Contrôle final et prise en main',
        detail:
          'Essai complet avec le véhicule, vérification des échauffements après 30 minutes de charge, et explication du fonctionnement aux propriétaires.',
      },
    ],
    duration: '3 semaines entre la demande et la mise en service',
    budget: '1 500 à 2 000 € TTC',
    budgetNote:
      'Budget indicatif de démonstration, matériel et main-d’œuvre compris. Chaque installation dépend du tableau existant, de la distance de câblage et de l’abonnement : seul un devis après visite fait référence.',
  },

  gallery: {
    title: 'Réalisations récentes',
    intro:
      'Exemples de chantiers présentés à titre de démonstration — sur un vrai site, chaque fiche serait accompagnée des photos du chantier réel.',
    items: [
      {
        id: 'tableau-cernay',
        title: 'Remplacement complet du tableau',
        category: 'Tableau électrique',
        location: 'Reims — quartier Cernay',
        context: 'Maison de ville, tableau à fusibles d’origine (1968).',
        description:
          'Dépose de l’ancien tableau, repérage de tous les circuits, pose d’un tableau 3 rangées avec différentiels 30 mA et étiquetage complet.',
        visual: 'tableau',
      },
      {
        id: 'eclairage-sejour',
        title: 'Plan lumière d’un séjour traversant',
        category: 'Éclairage intérieur',
        location: 'Bétheny',
        context: 'Rénovation d’un séjour de 42 m², plafond refait.',
        description:
          'Spots orientables sur deux circuits, variateurs, et ruban LED en corniche pour l’éclairage du soir.',
        visual: 'eclairage-int',
      },
      {
        id: 'eclairage-terrasse',
        title: 'Éclairage de terrasse et d’allée',
        category: 'Éclairage extérieur',
        location: 'Cormontreuil',
        context: 'Terrasse neuve, jardin de 300 m².',
        description:
          'Bornes basses le long de l’allée, appliques de façade avec détection, alimentation enterrée sous fourreau.',
        visual: 'eclairage-ext',
      },
      {
        id: 'borne-witry',
        title: 'Borne 7 kW sur pied en extérieur',
        category: 'Borne de recharge',
        location: 'Witry-lès-Reims',
        context: 'Stationnement extérieur, garage non attenant.',
        description:
          'Ligne enterrée sur 12 mètres, borne sur pied avec protection dédiée, recharge programmée en heures creuses.',
        visual: 'borne',
      },
      {
        id: 'normes-location',
        title: 'Remise aux normes avant location',
        category: 'Mise en conformité',
        location: 'Reims — centre',
        context: 'Appartement T3 destiné à la location, diagnostic défavorable.',
        description:
          'Reprise des points signalés au diagnostic : terre généralisée, différentiels, remplacement des prises anciennes.',
        visual: 'normes',
      },
      {
        id: 'renovation-tinqueux',
        title: 'Rénovation électrique complète',
        category: 'Rénovation',
        location: 'Tinqueux',
        context: 'Maison des années 60 rénovée pièce par pièce.',
        description:
          'Nouvelle installation complète : tableau, circuits séparés cuisine/salle de bains, prises RJ45, le tout en site occupé.',
        visual: 'renovation',
      },
    ],
  },

  method: {
    title: 'Comment se déroule votre projet',
    intro:
      'Une demande bien décrite au départ, c’est un devis plus juste et un chantier sans surprise. Voici les cinq étapes, de votre premier message à la fin des travaux.',
    steps: [
      {
        title: 'Vous décrivez votre besoin',
        detail:
          'En quelques minutes, en ligne : le type de travaux, votre commune, vos délais, et des photos si vous en avez. Pas besoin de vocabulaire technique.',
      },
      {
        title: 'Nous analysons votre demande',
        detail:
          'Nous relisons votre dossier, vérifions que tout est clair et préparons les bonnes questions avant de vous recontacter. Réponse sous 24 h ouvrées.',
      },
      {
        title: 'Échange ou visite sur place',
        detail:
          'Selon le projet, un échange téléphonique suffit, ou nous passons voir l’installation. La visite est indispensable pour un tableau ou une rénovation.',
      },
      {
        title: 'Devis détaillé',
        detail:
          'Vous recevez un devis poste par poste, avec le matériel désigné et les délais. Vous savez exactement ce que vous payez.',
      },
      {
        title: 'Chantier réalisé et suivi',
        detail:
          'Travaux réalisés aux dates convenues, chantier laissé propre, et un point final ensemble pour vérifier que tout fonctionne comme prévu.',
      },
    ],
  },

  projectIntake: {
    title: 'Décrivez votre projet, nous préparons le reste',
    subtitle:
      'Notre assistant en ligne vous pose les bonnes questions selon votre besoin : type de travaux, description, contraintes techniques, photos, délais, commune et coordonnées. Votre demande arrive structurée — et vous n’avez rien à réexpliquer au téléphone.',
    needs: [
      { id: 'depannage', label: 'Un dépannage' },
      { id: 'borne', label: 'Une borne de recharge' },
      { id: 'tableau', label: 'Un tableau à remplacer' },
      { id: 'renovation', label: 'Une rénovation' },
      { id: 'eclairage', label: 'Un éclairage' },
      { id: 'autre', label: 'Autre besoin électrique' },
    ],
    collected: [
      'Le type de besoin et sa description',
      'Les informations techniques utiles (tableau, surface, accès…)',
      'Vos photos, si vous en avez',
      'Vos délais souhaités',
      'Votre commune et vos coordonnées',
    ],
    formPath: '/projet',
    tracking: {
      demoMode: 'true',
      source: 'site_vitrine_demo',
      trade: 'electricien',
      site: 'ad_electricite',
    },
    demoNotice:
      'Parcours de démonstration : la demande est simulée, aucun dossier réel n’est créé.',
  },

  zone: {
    title: 'Zone d’intervention',
    intro:
      'Nous intervenons à Reims et dans les communes environnantes, dans un rayon d’environ 25 km. Au-delà, contactez-nous : selon le chantier, un déplacement reste possible.',
    center: 'Reims',
    groups: [
      {
        label: 'Agglomération immédiate',
        communes: ['Tinqueux', 'Cormontreuil', 'Bétheny', 'Saint-Brice-Courcelles', 'Bezannes'],
      },
      {
        label: 'Première couronne',
        communes: ['Witry-lès-Reims', 'Taissy', 'Saint-Léonard', 'Champigny', 'Ormes'],
      },
      {
        label: 'Jusqu’à 25 km',
        communes: ['Fismes', 'Verzy', 'Bazancourt', 'Hermonville', 'Gueux'],
      },
    ],
    note: 'Dépannages : priorité aux communes de l’agglomération pour intervenir vite.',
  },

  reviews: {
    title: 'Ce que disent nos clients',
    disclaimer:
      'Avis d’exemple, rédigés pour la démonstration. Sur un vrai site, cet espace accueille les retours réels des clients de l’artisan.',
    items: [
      {
        author: 'M. et Mme L.',
        location: 'Witry-lès-Reims',
        project: 'Borne de recharge 7 kW',
        text: 'Tout a été expliqué avant le devis : la puissance, le câble, le délestage. La borne fonctionne parfaitement et la recharge se lance toute seule en heures creuses.',
      },
      {
        author: 'Claire D.',
        location: 'Reims',
        project: 'Remplacement de tableau',
        text: 'Le diagnostic de vente signalait plusieurs points à reprendre. Devis clair, intervention en une journée, et tous les circuits sont maintenant étiquetés.',
      },
      {
        author: 'Antoine R.',
        location: 'Tinqueux',
        project: 'Rénovation complète',
        text: 'Chantier en site occupé, jamais plus d’une pièce sans courant à la fois. On a apprécié les points réguliers sur l’avancement.',
      },
    ],
  },

  faq: {
    title: 'Questions fréquentes',
    intro: 'Les questions qu’on nous pose le plus souvent avant un premier rendez-vous.',
    items: [
      {
        question: 'Intervenez-vous en urgence ?',
        answer:
          'Oui, pour les pannes qui privent le logement d’électricité ou présentent un danger (échauffement, odeur de brûlé, disjoncteur qui ne réarme plus). Décrivez la situation dans votre demande : les urgences réelles sont traitées en priorité, généralement dans la journée sur l’agglomération de Reims.',
      },
      {
        question: 'Dans quelles communes intervenez-vous ?',
        answer:
          'À Reims et dans un rayon d’environ 25 km : Tinqueux, Cormontreuil, Bétheny, Witry-lès-Reims, Bezannes, Taissy, Fismes… Si votre commune n’est pas listée, posez la question dans votre demande : selon le chantier, nous pouvons nous déplacer plus loin.',
      },
      {
        question: 'Comment préparer une demande de devis ?',
        answer:
          'Décrivez ce que vous voulez faire, indiquez votre commune et vos délais, et ajoutez si possible des photos : le tableau électrique porte ouverte, la pièce concernée, l’emplacement envisagé pour une borne. Plus la demande est précise, plus le devis est juste — et souvent plus rapide.',
      },
      {
        question: 'Quand faut-il remplacer un tableau électrique ?',
        answer:
          'Quelques signes ne trompent pas : fusibles en porcelaine, absence d’interrupteurs différentiels 30 mA, disjoncteur qui saute sans raison, ou tableau plein sans emplacement libre alors que vos besoins augmentent (borne, pompe à chaleur…). Un diagnostic de vente défavorable est aussi un bon déclencheur.',
      },
      {
        question: 'Que faut-il vérifier avant d’installer une borne de recharge ?',
        answer:
          'Trois choses : la puissance de votre abonnement (souvent à ajuster pour du 7 kW), l’état et la place disponible dans votre tableau, et la distance entre le tableau et le stationnement, qui détermine la section du câble. Nous vérifions ces trois points avant tout devis.',
      },
      {
        question: 'Comment se passe une rénovation électrique ?',
        answer:
          'Après la visite, nous planifions les travaux pièce par pièce pour que le logement reste habitable. Les saignées sont rebouchées au fur et à mesure, et vous gardez le courant chaque soir. Une rénovation complète de maison prend généralement une à trois semaines selon la surface.',
      },
      {
        question: 'À quoi servent les photos dans ma demande ?',
        answer:
          'Elles nous permettent souvent d’évaluer l’installation avant même la visite : une photo du tableau nous dit son âge, ses protections et la place disponible. Résultat : moins d’allers-retours, un devis plus rapide et plus précis.',
      },
      {
        question: 'Comment planifier une visite technique ?',
        answer:
          'Déposez votre demande en ligne ; nous vous rappelons sous 24 h ouvrées pour convenir d’un créneau. Les visites ont lieu en semaine, avec des créneaux en fin de journée pour les personnes qui travaillent.',
      },
    ],
  },

  finalCta: {
    title: 'Un projet électrique ? Décrivez-le, c’est le meilleur point de départ.',
    text:
      'Quelques minutes suffisent : votre besoin, vos photos, vos délais. Vous recevez un retour structuré — pas un rendez-vous téléphonique à répéter trois fois les mêmes informations.',
    bullets: [
      'Réponse sous 24 h ouvrées',
      'Demande enregistrée et suivie',
      'Sans engagement',
    ],
    cta: 'Décrire mon projet',
  },

  footer: {
    hours: [
      { days: 'Lundi – Vendredi', hours: '8 h – 18 h 30' },
      { days: 'Samedi', hours: '9 h – 12 h (dépannages)' },
      { days: 'Dimanche', hours: 'Fermé' },
    ],
    legalNote:
      'AD Électricité est une entreprise fictive créée pour ce site de démonstration. Les mentions légales complètes (SIRET, assurance, qualifications) d’un artisan réel figureraient ici.',
    privacyNote:
      'Sur un site en production, les demandes déposées sont traitées via Kadria conformément au RGPD. Aucune donnée réelle n’est collectée sur cette démonstration.',
    demoCredit: 'Site de démonstration conçu avec Kadria',
  },

  sections: {
    trustBand: true,
    prestations: true,
    caseStudy: true,
    gallery: true,
    method: true,
    projectIntake: true,
    zone: true,
    reviews: true,
    faq: true,
    finalCta: true,
  },
}
