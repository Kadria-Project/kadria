export type GenericIntent = 'entretien' | 'depannage' | 'installation' | 'renovation' | 'creation' | 'reparation'

export type TradeTaxonomy = {
  value: string
  label: string
  aliases?: string[]
  workTypes: string[]
  qualificationQuestions: string[]
  urgencySignals: string[]
  goodFitSignals: string[]
  riskSignals: string[]
  quoteItems: string[]
  intentQuickReplies?: Partial<Record<GenericIntent, string[]>>
}

const GENERIC_FALLBACK: TradeTaxonomy = {
  value: 'autre',
  label: 'Autre',
  aliases: [],
  workTypes: ['dépannage', 'installation', 'rénovation', 'entretien'],
  qualificationQuestions: [
    'Quel type de travaux souhaitez-vous faire réaliser ?',
    'Le problème est-il urgent ou peut-il attendre quelques jours ?',
    "Avez-vous des photos de la situation ou du lieu d'intervention ?",
    "L'accès au lieu d'intervention est-il facile ?",
    'Avez-vous une idée de budget pour ce projet ?',
  ],
  urgencySignals: ['situation bloquante', 'danger immédiat', 'urgence déclarée'],
  goodFitSignals: ['photos disponibles', 'adresse précise', 'budget indiqué', 'délai réaliste'],
  riskSignals: ['demande très floue', 'budget absent', 'adresse imprécise', 'projet non défini'],
  quoteItems: ['déplacement', 'main d’œuvre', 'fournitures'],
  intentQuickReplies: {
    entretien: ['Entretien général', 'Petite révision'],
    depannage: ['Panne / dysfonctionnement', 'Besoin urgent'],
    installation: ['Nouvelle installation', 'Équipement à poser'],
    renovation: ['Rénovation partielle', 'Rénovation complète'],
    creation: ['Création / aménagement'],
    reparation: ['Réparation ponctuelle'],
  },
}

export const TRADE_TAXONOMIES: TradeTaxonomy[] = [
  {
    value: 'plombier',
    label: 'Plombier',
    aliases: ['plomberie', 'sanitaire', 'fuite', 'robinet', 'canalisation', 'wc', 'chauffe-eau'],
    workTypes: ['dépannage', 'fuite', 'installation sanitaire', 'remplacement équipement', 'salle de bain', 'rénovation'],
    qualificationQuestions: [
      'Quel équipement est concerné ?',
      "S'agit-il d'une fuite, d'un bouchon, d'une installation ou d'un remplacement ?",
      "Le problème est-il urgent ou peut-il attendre quelques jours ?",
      "La zone est-elle facilement accessible ?",
      "Avez-vous des photos du problème ou de l'installation ?",
    ],
    urgencySignals: ['fuite importante', 'dégât des eaux', 'canalisation bouchée', "plus d'eau chaude", 'WC inutilisable'],
    goodFitSignals: ['photos disponibles', 'adresse précise', 'budget indiqué', 'équipement identifié', 'délai réaliste'],
    riskSignals: ['demande très floue', 'budget absent', 'adresse imprécise', 'urgence hors zone', 'intervention très faible valeur'],
    quoteItems: ['déplacement', 'recherche de fuite', 'remplacement robinetterie', 'pose équipement', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      entretien: ['Chauffe-eau / cumulus', 'Robinetterie', 'Canalisations', 'WC / sanitaires'],
      depannage: ['Fuite d’eau', 'Canalisation bouchée', 'Chauffe-eau en panne', 'WC ne fonctionne plus'],
      installation: ['Chauffe-eau / cumulus', 'Robinetterie', 'WC / sanitaires', 'Salle de bain complète'],
      renovation: ['Salle de bain', 'Cuisine', 'Réseau de canalisations', 'Robinetterie'],
      creation: ['Salle de bain', 'Point d’eau', 'Réseau de canalisations'],
      reparation: ['Fuite d’eau', 'Robinetterie', 'Chauffe-eau', 'Canalisation'],
    },
  },
  {
    value: 'chauffagiste',
    label: 'Chauffagiste',
    aliases: ['chauffage', 'chaudière', 'radiateur', 'pompe à chaleur', 'plancher chauffant'],
    workTypes: ['dépannage chaudière', 'entretien chaudière', 'installation chauffage', 'remplacement chaudière', 'pompe à chaleur', 'plancher chauffant'],
    qualificationQuestions: [
      'Quel type de chauffage est concerné (chaudière, pompe à chaleur, radiateur) ?',
      "S'agit-il d'une panne, d'un entretien ou d'une installation neuve ?",
      "Avez-vous du chauffage actuellement ou êtes-vous sans chauffage ?",
      "Quel est l'âge approximatif de votre installation ?",
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['plus de chauffage', 'panne chaudière', 'fuite de gaz', 'odeur suspecte', 'hiver et logement froid'],
    goodFitSignals: ['budget indiqué', 'photos disponibles', 'installation existante identifiée', 'délai réaliste'],
    riskSignals: ['budget absent', 'demande très floue', 'installation très ancienne non décrite', 'adresse imprécise'],
    quoteItems: ['déplacement', 'diagnostic panne', 'remplacement pièce', 'pose chaudière', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      entretien: ['Chaudière', 'Pompe à chaleur', 'Radiateurs', 'Plancher chauffant'],
      depannage: ['Panne de chaudière', 'Plus de chauffage', 'Pompe à chaleur en panne', 'Radiateur froid'],
      installation: ['Chaudière', 'Pompe à chaleur', 'Plancher chauffant', 'Radiateurs'],
      renovation: ['Remplacement chaudière', 'Réseau de chauffage', 'Radiateurs', 'Plancher chauffant'],
      creation: ['Chaudière', 'Pompe à chaleur', 'Plancher chauffant'],
      reparation: ['Chaudière', 'Radiateur', 'Pompe à chaleur', 'Plancher chauffant'],
    },
  },
  {
    value: 'electricien',
    label: 'Électricien',
    aliases: ['électricité', 'tableau électrique', 'prise', 'disjoncteur', 'court-circuit', 'mise aux normes'],
    workTypes: ['dépannage électrique', 'mise aux normes', 'installation tableau', 'rénovation électrique', 'éclairage', 'domotique'],
    qualificationQuestions: [
      'Quel est le problème électrique constaté ?',
      "S'agit-il d'une panne, d'une mise aux normes ou d'une installation neuve ?",
      'Le logement est-il actuellement sans électricité ?',
      "Avez-vous accès au tableau électrique ?",
      'Avez-vous des photos de l’installation ou du problème ?',
    ],
    urgencySignals: ['coupure générale', 'odeur de brûlé', 'étincelles', 'disjoncteur qui saute en continu', 'pas d’électricité'],
    goodFitSignals: ['photos disponibles', 'tableau accessible', 'budget indiqué', 'délai réaliste'],
    riskSignals: ['budget absent', 'installation très vétuste non décrite', 'adresse imprécise', 'demande très floue'],
    quoteItems: ['déplacement', 'diagnostic électrique', 'remplacement tableau', 'pose prise/éclairage', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      entretien: ['Tableau électrique', 'Prises / interrupteurs', 'Éclairage', 'Mise aux normes'],
      depannage: ['Panne / coupure', 'Disjoncteur qui saute', 'Prise / interrupteur défectueux', 'Court-circuit'],
      installation: ['Tableau électrique', 'Prises / éclairage', 'Domotique', 'Mise aux normes'],
      renovation: ['Tableau électrique', 'Réseau complet', 'Prises / éclairage', 'Mise aux normes'],
      creation: ['Tableau électrique', 'Prises / éclairage', 'Domotique'],
      reparation: ['Panne / coupure', 'Tableau électrique', 'Prise / interrupteur', 'Éclairage'],
    },
  },
  {
    value: 'paysagiste',
    label: 'Paysagiste',
    aliases: ['jardin', 'espaces verts', 'aménagement extérieur', 'pelouse', 'plantation'],
    workTypes: ['entretien jardin', 'création espace vert', 'plantation', 'engazonnement', 'aménagement extérieur', 'élagage léger'],
    qualificationQuestions: [
      "Quelle est la surface approximative du terrain concerné ?",
      "S'agit-il d'un entretien régulier ou d'une création d'aménagement ?",
      "Avez-vous des photos ou un plan du terrain ?",
      'Quelle est la nature du sol et l’accès au terrain ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['terrain impraticable', 'arbre dangereux', 'demande avant événement proche'],
    goodFitSignals: ['surface connue', 'photos disponibles', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'surface inconnue', 'projet flou', 'accès très contraint non décrit'],
    quoteItems: ['déplacement', 'préparation terrain', 'plantation', 'engazonnement', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      entretien: ['Pelouse', 'Haies', 'Élagage', 'Nettoyage extérieur'],
      depannage: ['Arbre/branche dangereux', 'Système d’arrosage en panne', 'Terrain à remettre en état'],
      installation: ['Système d’arrosage', 'Clôture / haie', 'Engazonnement'],
      renovation: ['Aménagement extérieur', 'Pelouse', 'Massifs et plantations'],
      creation: ['Espace vert', 'Plantation', 'Engazonnement'],
      reparation: ['Système d’arrosage', 'Clôture', 'Allée / terrain'],
    },
  },
  {
    value: 'terrassier',
    label: 'Terrassier',
    aliases: ['terrassement', 'nivellement', 'fondations', 'excavation', 'remblai'],
    workTypes: ['terrassement terrain', 'nivellement', 'excavation fondations', 'tranchée', 'remblai/déblai'],
    qualificationQuestions: [
      'Quelle est la surface ou le volume approximatif à terrasser ?',
      "S'agit-il de préparer un terrain pour une construction, une piscine ou un aménagement ?",
      "Le terrain est-il facilement accessible aux engins ?",
      'Connaissez-vous la nature du sol ?',
      'Avez-vous un plan ou des photos du terrain ?',
    ],
    urgencySignals: ['chantier bloqué en attente du terrassement', 'effondrement de terrain', 'accès véhicule impossible'],
    goodFitSignals: ['surface connue', 'plan ou photos disponibles', 'budget indiqué', 'accès engins possible'],
    riskSignals: ['budget absent', 'accès engins impossible non anticipé', 'projet flou', 'terrain non décrit'],
    quoteItems: ['déplacement engins', 'terrassement', 'évacuation gravats', 'nivellement', 'main d’œuvre'],
    intentQuickReplies: {
      installation: ['Fondations', 'Tranchée', 'Nivellement'],
      creation: ['Préparation terrain construction', 'Préparation piscine', 'Nivellement'],
      renovation: ['Nivellement', 'Remblai / déblai'],
      reparation: ['Tassement de terrain', 'Tranchée à reprendre'],
    },
  },
  {
    value: 'menuisier',
    label: 'Menuisier',
    aliases: ['menuiserie', 'bois', 'porte', 'fenêtre', 'placard', 'agencement'],
    workTypes: ['pose porte', 'pose fenêtre', 'agencement intérieur', 'placard sur mesure', 'rénovation menuiserie', 'terrasse bois'],
    qualificationQuestions: [
      'Quel élément de menuiserie est concerné (porte, fenêtre, placard, terrasse) ?',
      "S'agit-il d'une réparation, d'un remplacement ou d'une création sur mesure ?",
      'Avez-vous les dimensions approximatives ?',
      'Avez-vous des photos de l’existant ou un plan du projet ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['porte ou fenêtre ne ferme plus', 'problème de sécurité', 'infiltration par menuiserie endommagée'],
    goodFitSignals: ['dimensions connues', 'photos disponibles', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'dimensions inconnues', 'projet flou', 'demande très ponctuelle isolée'],
    quoteItems: ['déplacement', 'fourniture menuiserie', 'pose', 'finitions', 'main d’œuvre'],
    intentQuickReplies: {
      depannage: ['Porte qui ne ferme plus', 'Fenêtre endommagée', 'Volet bloqué'],
      installation: ['Porte', 'Fenêtre', 'Placard sur mesure', 'Terrasse bois'],
      renovation: ['Porte', 'Fenêtre', 'Agencement intérieur'],
      creation: ['Placard sur mesure', 'Terrasse bois', 'Agencement intérieur'],
      reparation: ['Porte', 'Fenêtre', 'Volet'],
    },
  },
  {
    value: 'macon',
    label: 'Maçon',
    aliases: ['maçonnerie', 'gros œuvre', 'mur', 'fondation', 'dalle', 'extension'],
    workTypes: ['construction mur', 'extension maison', 'dalle béton', 'rénovation gros œuvre', 'fondations', 'ouverture mur'],
    qualificationQuestions: [
      'Quel type de travaux de maçonnerie envisagez-vous ?',
      'Quelle est la surface approximative concernée ?',
      "S'agit-il d'une construction neuve ou d'une rénovation ?",
      'Avez-vous un plan ou des photos du projet ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['fissure structurelle importante', 'mur instable', 'infiltration liée à la structure'],
    goodFitSignals: ['plan ou photos disponibles', 'surface connue', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'projet flou', 'surface inconnue', 'demande de très petite ampleur isolée'],
    quoteItems: ['déplacement', 'préparation chantier', 'matériaux', 'main d’œuvre', 'finitions'],
    intentQuickReplies: {
      depannage: ['Fissure', 'Mur instable', 'Infiltration'],
      installation: ['Extension', 'Dalle béton', 'Ouverture de mur'],
      renovation: ['Gros œuvre', 'Mur', 'Fondations'],
      creation: ['Extension maison', 'Dalle béton', 'Mur'],
      reparation: ['Fissure', 'Mur', 'Dalle'],
    },
  },
  {
    value: 'peintre',
    label: 'Peintre',
    aliases: ['peinture', 'enduit', 'finitions murales', 'décoration intérieure'],
    workTypes: ['peinture intérieure', 'peinture extérieure', 'enduit décoratif', 'préparation murs', 'rénovation peinture'],
    qualificationQuestions: [
      "Quelles pièces ou surfaces sont concernées par la peinture ?",
      "Quelle est la surface approximative à peindre (en m²) ?",
      "Faut-il une préparation des murs (enduit, ponçage) ?",
      "Avez-vous des photos de l'état actuel ?",
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['dégât des eaux à reprendre rapidement', 'mise en location imminente', 'vente imminente du bien'],
    goodFitSignals: ['surface connue', 'photos disponibles', 'budget indiqué', 'délai réaliste'],
    riskSignals: ['budget absent', 'surface inconnue', 'projet flou', 'demande très partielle isolée'],
    quoteItems: ['déplacement', 'préparation des surfaces', 'peinture', 'finitions', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      renovation: ['Peinture intérieure', 'Peinture extérieure', 'Enduit décoratif'],
      creation: ['Peinture intérieure', 'Décoration murale'],
      reparation: ['Reprise de peinture', 'Murs endommagés'],
    },
  },
  {
    value: 'plaquiste',
    label: 'Plaquiste',
    aliases: ['placo', 'cloison', 'plafond', 'isolation intérieure', 'faux plafond'],
    workTypes: ['pose cloison', 'pose plafond', 'isolation intérieure', 'rénovation intérieure', 'faux plafond'],
    qualificationQuestions: [
      'Quel type de travaux envisagez-vous (cloison, plafond, isolation) ?',
      'Quelle est la surface approximative concernée ?',
      "S'agit-il d'une création ou d'une rénovation ?",
      'Avez-vous un plan ou des photos du projet ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['plafond endommagé dangereux', 'dégât des eaux à reprendre rapidement'],
    goodFitSignals: ['surface connue', 'plan ou photos disponibles', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'surface inconnue', 'projet flou'],
    quoteItems: ['déplacement', 'matériaux', 'pose', 'finitions', 'main d’œuvre'],
    intentQuickReplies: {
      installation: ['Cloison', 'Plafond', 'Isolation intérieure'],
      renovation: ['Cloison', 'Faux plafond', 'Isolation intérieure'],
      creation: ['Cloison', 'Plafond'],
      reparation: ['Plafond endommagé', 'Cloison'],
    },
  },
  {
    value: 'couvreur',
    label: 'Couvreur',
    aliases: ['toiture', 'toit', 'tuile', 'charpente', 'gouttière', 'fuite toiture'],
    workTypes: ['réparation toiture', 'rénovation toiture', 'remplacement couverture', 'gouttières', 'isolation toiture'],
    qualificationQuestions: [
      'Quel problème de toiture constatez-vous (fuite, tuiles, gouttière) ?',
      'Connaissez-vous l’âge approximatif de la toiture ?',
      "Avez-vous des photos de la toiture ou des dégâts ?",
      "L'accès à la toiture est-il facile (hauteur, pente) ?",
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['fuite toiture active', 'tuiles tombées', 'infiltration dans le logement', 'tempête récente'],
    goodFitSignals: ['photos disponibles', 'âge toiture connu', 'budget indiqué', 'accès décrit'],
    riskSignals: ['budget absent', 'accès très difficile non anticipé', 'demande très floue'],
    quoteItems: ['déplacement', 'diagnostic toiture', 'matériaux', 'pose/réparation', 'main d’œuvre'],
    intentQuickReplies: {
      entretien: ['Gouttières', 'Démoussage', 'Tuiles'],
      depannage: ['Fuite toiture', 'Tuiles tombées', 'Gouttière bouchée'],
      renovation: ['Toiture complète', 'Gouttières', 'Isolation toiture'],
      reparation: ['Fuite toiture', 'Tuiles', 'Gouttière'],
    },
  },
  {
    value: 'serrurier',
    label: 'Serrurier',
    aliases: ['serrurerie', 'serrure', 'porte bloquée', 'clé', 'verrou', 'porte blindée'],
    workTypes: ['ouverture de porte', 'changement serrure', 'installation porte blindée', 'dépannage volet', 'sécurisation logement'],
    qualificationQuestions: [
      'Êtes-vous actuellement bloqué hors de chez vous ou à l’intérieur ?',
      'Quel élément est concerné (porte, serrure, volet) ?',
      "S'agit-il d'un dépannage urgent ou d'une installation prévue ?",
      'Avez-vous des photos de la serrure ou de la porte ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['porte bloquée', 'personne enfermée', 'effraction récente', 'logement non sécurisé'],
    goodFitSignals: ['photos disponibles', 'budget indiqué', 'situation clairement décrite'],
    riskSignals: ['budget absent', 'adresse imprécise', 'demande très floue', 'urgence hors zone'],
    quoteItems: ['déplacement', 'ouverture de porte', 'remplacement serrure', 'main d’œuvre', 'fournitures'],
    intentQuickReplies: {
      depannage: ['Porte bloquée', 'Personne enfermée', 'Effraction récente'],
      installation: ['Porte blindée', 'Nouvelle serrure', 'Sécurisation logement'],
      reparation: ['Serrure', 'Volet', 'Porte'],
    },
  },
  {
    value: 'carreleur',
    label: 'Carreleur',
    aliases: ['carrelage', 'faïence', 'sol', 'salle de bain carrelage'],
    workTypes: ['pose carrelage sol', 'pose faïence murale', 'rénovation salle de bain', 'pose carrelage extérieur'],
    qualificationQuestions: [
      'Quelle est la surface approximative à carreler (en m²) ?',
      'Quelle pièce est concernée ?',
      'Avez-vous déjà choisi le carrelage ou avez-vous besoin de conseils ?',
      "Avez-vous des photos de l'état actuel ?",
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['dégât des eaux à reprendre rapidement', 'mise en location imminente'],
    goodFitSignals: ['surface connue', 'photos disponibles', 'budget indiqué', 'matériaux déjà choisis'],
    riskSignals: ['budget absent', 'surface inconnue', 'projet flou'],
    quoteItems: ['déplacement', 'préparation support', 'fourniture carrelage', 'pose', 'main d’œuvre'],
    intentQuickReplies: {
      installation: ['Sol', 'Faïence murale', 'Salle de bain'],
      renovation: ['Sol', 'Faïence murale', 'Salle de bain'],
      creation: ['Sol', 'Faïence murale'],
      reparation: ['Carrelage fissuré', 'Joints'],
    },
  },
  {
    value: 'pisciniste',
    label: 'Pisciniste',
    aliases: ['piscine', 'bassin', 'pompe piscine', 'filtration piscine', 'liner'],
    workTypes: ['construction piscine', 'rénovation piscine', 'dépannage filtration', 'remplacement liner', 'entretien piscine'],
    qualificationQuestions: [
      'Quel type de piscine est concerné (enterrée, hors-sol, coque) ?',
      "S'agit-il d'une création, d'une rénovation ou d'un dépannage ?",
      'Quelles sont les dimensions approximatives du bassin ?',
      'Avez-vous des photos de la piscine ou du terrain ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['fuite importante du bassin', 'eau verte/insalubre', 'panne de filtration en pleine saison'],
    goodFitSignals: ['dimensions connues', 'photos disponibles', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'dimensions inconnues', 'projet flou'],
    quoteItems: ['déplacement', 'diagnostic', 'matériaux/équipement', 'pose/réparation', 'main d’œuvre'],
    intentQuickReplies: {
      entretien: ['Filtration', 'Liner', 'Eau du bassin'],
      depannage: ['Fuite du bassin', 'Eau verte/insalubre', 'Panne filtration'],
      installation: ['Piscine enterrée', 'Piscine hors-sol', 'Piscine coque'],
      renovation: ['Liner', 'Filtration', 'Margelles'],
      creation: ['Piscine enterrée', 'Piscine coque'],
    },
  },
  {
    value: 'climatisation',
    label: 'Climatisation',
    aliases: ['clim', 'climatiseur', 'pompe à chaleur air-air', 'ventilation', 'VMC'],
    workTypes: ['installation climatisation', 'dépannage climatisation', 'entretien climatisation', 'remplacement unité'],
    qualificationQuestions: [
      'Quel type de système est concerné (climatisation, VMC, pompe à chaleur) ?',
      "S'agit-il d'une panne, d'un entretien ou d'une installation neuve ?",
      'Combien de pièces souhaitez-vous climatiser ?',
      'Avez-vous des photos de l’installation existante ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['panne en pleine canicule', 'fuite de fluide', 'plus de ventilation'],
    goodFitSignals: ['nombre de pièces connu', 'photos disponibles', 'budget indiqué', 'délai réaliste'],
    riskSignals: ['budget absent', 'projet flou', 'installation très ancienne non décrite'],
    quoteItems: ['déplacement', 'diagnostic', 'fourniture unité', 'pose', 'main d’œuvre'],
    intentQuickReplies: {
      entretien: ['Climatisation', 'VMC', 'Pompe à chaleur air-air'],
      depannage: ['Climatisation en panne', 'VMC en panne', 'Fuite de fluide'],
      installation: ['Climatisation', 'VMC', 'Pompe à chaleur air-air'],
      renovation: ['Remplacement unité', 'VMC'],
    },
  },
  {
    value: 'domotique',
    label: 'Domotique',
    aliases: ['maison connectée', 'automatisation', 'volets connectés', 'alarme connectée'],
    workTypes: ['installation domotique', 'automatisation volets/éclairage', 'sécurité connectée', 'intégration objets connectés'],
    qualificationQuestions: [
      'Quels équipements souhaitez-vous connecter ou automatiser ?',
      "S'agit-il d'une installation neuve ou d'une extension d'un système existant ?",
      'Disposez-vous déjà d’une box ou d’un système domotique ?',
      'Avez-vous des photos de l’installation actuelle ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['panne système de sécurité connecté', 'volets bloqués'],
    goodFitSignals: ['équipements listés', 'budget indiqué', 'projet planifié'],
    riskSignals: ['budget absent', 'projet très flou', 'compatibilité matériel inconnue'],
    quoteItems: ['déplacement', 'diagnostic', 'matériel connecté', 'installation/configuration', 'main d’œuvre'],
    intentQuickReplies: {
      installation: ['Volets connectés', 'Éclairage connecté', 'Alarme connectée'],
      depannage: ['Système de sécurité en panne', 'Volets bloqués'],
      renovation: ['Extension système existant', 'Volets connectés'],
    },
  },
  {
    value: 'multiservices',
    label: 'Multiservices / homme toutes mains',
    aliases: ['petits travaux', 'bricolage', 'homme toutes mains', 'dépannage divers'],
    workTypes: ['petits travaux divers', 'montage meuble', 'petites réparations', 'entretien général', 'dépannage divers'],
    qualificationQuestions: [
      'Quel(s) type(s) de travaux souhaitez-vous faire réaliser ?',
      "S'agit-il d'une intervention ponctuelle ou de plusieurs petites tâches ?",
      'Le matériel nécessaire est-il déjà disponible sur place ?',
      'Avez-vous des photos de ce qui doit être fait ?',
      'Avez-vous une idée de budget pour ce projet ?',
    ],
    urgencySignals: ['besoin avant un événement proche', 'sécurité du logement en jeu'],
    goodFitSignals: ['liste des tâches claire', 'photos disponibles', 'budget indiqué'],
    riskSignals: ['budget absent', 'demande très floue', 'liste de tâches non définie'],
    quoteItems: ['déplacement', 'main d’œuvre', 'petites fournitures'],
    intentQuickReplies: {
      entretien: ['Entretien général', 'Petites réparations'],
      depannage: ['Dépannage divers', 'Petite réparation urgente'],
      installation: ['Montage meuble', 'Petits travaux'],
      reparation: ['Petites réparations', 'Dépannage divers'],
    },
  },
  GENERIC_FALLBACK,
]

const TAXONOMY_BY_VALUE = new Map(TRADE_TAXONOMIES.map(t => [t.value, t]))

export function getTradeTaxonomy(value: string): TradeTaxonomy | null {
  if (!value) return null
  return TAXONOMY_BY_VALUE.get(value) || (value === 'autre' ? GENERIC_FALLBACK : null)
}

export function getTradeTaxonomies(values: string[]): TradeTaxonomy[] {
  const result: TradeTaxonomy[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) continue
    const taxonomy = getTradeTaxonomy(value) || (value ? { ...GENERIC_FALLBACK, value, label: GENERIC_FALLBACK.label } : null)
    if (taxonomy) {
      result.push(taxonomy)
      seen.add(value)
    }
  }
  return result
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item)
      result.push(item)
    }
  }
  return result
}

export function getQualificationQuestionsForTrades(values: string[], limit?: number): string[] {
  const taxonomies = getTradeTaxonomies(values)
  const questions = dedupeStrings(taxonomies.flatMap(t => t.qualificationQuestions))
  return typeof limit === 'number' ? questions.slice(0, limit) : questions
}

export function getWorkTypesForTrades(values: string[]): string[] {
  const taxonomies = getTradeTaxonomies(values)
  return dedupeStrings(taxonomies.flatMap(t => t.workTypes))
}

const GENERIC_WORK_TYPES = ['dépannage', 'entretien', 'installation', 'rénovation', 'réparation', 'remplacement', 'urgence', 'devis simple']

/**
 * Suggère une liste de types de travaux pertinents pour les métiers sélectionnés,
 * en combinant les workTypes propres à chaque métier avec quelques types génériques
 * utiles à tout artisan (dépannage, entretien, devis simple, etc).
 */
export function getSuggestedWorkTypesForTrades(trades: string[], limit = 20): string[] {
  const specific = getWorkTypesForTrades(trades)
  const merged = dedupeStrings([...specific, ...GENERIC_WORK_TYPES])
  return merged.slice(0, limit)
}

export function getQuoteItemsForTrades(values: string[]): string[] {
  const taxonomies = getTradeTaxonomies(values)
  return dedupeStrings(taxonomies.flatMap(t => t.quoteItems))
}

const GENERIC_INTENTS: GenericIntent[] = ['entretien', 'depannage', 'installation', 'renovation', 'creation', 'reparation']

export function isGenericIntent(value: string): value is GenericIntent {
  return GENERIC_INTENTS.includes(value as GenericIntent)
}

/**
 * Fusionne les suggestions de quick replies métier pour une intention générique
 * (ex: "Entretien") à travers tous les métiers déclarés par l'artisan, sans doublons.
 * Limité à 4 options + "Autre" pour respecter le format quickReplies du chat.
 */
export function getIntentQuickRepliesForTrades(values: string[], intent: GenericIntent, limit = 4): string[] {
  const taxonomies = getTradeTaxonomies(values)
  const options = dedupeStrings(
    taxonomies.flatMap(t => t.intentQuickReplies?.[intent] ?? [])
  )
  return options.slice(0, limit)
}
