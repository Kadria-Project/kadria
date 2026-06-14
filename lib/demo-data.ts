// Données fictives pour le dashboard de démonstration publique (/demo-dashboard).
// Aucune donnée réelle, aucun appel API — tout est statique.

export type DemoProject = {
  id: string;
  ref: string;
  clientFirstName: string;
  clientName: string;
  trade: string;
  projectType: string;
  city: string;
  budget: string;
  completenessScore: number;
  status: string;
  source: string;
  createdAt: string;
  devisAmount?: number;
};

export const ARTISAN = {
  nom: 'Martin Plomberie',
  prenom: 'Jean-Pierre',
  metier: 'Plombier',
  ville: 'Lyon',
  plan: 'Performance',
};

export const KPI_CURRENT = {
  ca_potentiel: 42800,
  devis_envoyes: 8700,
  chantiers_gagnes: 14500,
  taux_conversion: 23,
  panier_moyen: 3200,
  a_relancer: 3,
};

export const KPI_PREVIOUS = {
  ca_potentiel: 31200,
  devis_envoyes: 6100,
  chantiers_gagnes: 9800,
  taux_conversion: 18,
  panier_moyen: 2900,
  a_relancer: 5,
};

export const SPARKLINE_DATA = [
  0, 800, 1200, 800, 2400, 1800, 3200, 2800,
  4100, 3600, 5200, 4800, 6100, 5600, 7200,
  6800, 8100, 7600, 9200, 8800, 10100, 9600,
  11200, 10800, 12100, 11600, 13200, 12800,
  14100, 14500,
];

export const TOP_OPPORTUNITES = [
  { id: 'demo-1', rang: 1, score: 247, nom: 'Laurent Bertrand', metier: 'Plomberie', ville: 'Lyon 3e', statut: 'Devis envoyé', budget: '3 000 – 5 000 €' },
  { id: 'demo-2', rang: 2, score: 231, nom: 'Sophie Mercier', metier: 'Rénovation salle de bain', ville: 'Villeurbanne', statut: 'À rappeler', budget: '8 000 – 12 000 €' },
  { id: 'demo-3', rang: 3, score: 218, nom: 'Marc Fontaine', metier: 'Dépannage urgent', ville: 'Lyon 6e', statut: 'Qualifié', budget: '500 – 1 000 €' },
];

export const PIPELINE_DATA: Record<string, number> = {
  Nouveau: 4,
  'À rappeler': 3,
  Qualifié: 2,
  'Devis envoyé': 3,
  Gagné: 4,
  Perdu: 1,
};

export const EVENTS = [
  { date: '2026-06-17', titre: 'Visite chantier Bertrand', type: 'RDV', color: 'green' },
  { date: '2026-06-18', titre: 'Relance Mercier', type: 'Relance', color: 'orange' },
  { date: '2026-06-19', titre: 'Rappel Fontaine', type: 'Rappel', color: 'blue' },
  { date: '2026-06-20', titre: 'Intervention Moreau', type: 'Intervention', color: 'purple' },
  { date: '2026-06-23', titre: 'RDV devis Lecomte', type: 'RDV', color: 'green' },
  { date: '2026-06-25', titre: 'Relance Rousseau', type: 'Relance', color: 'orange' },
  { date: '2026-06-26', titre: 'Installation PAC Renard', type: 'Intervention', color: 'purple' },
];

export const DOSSIER_DEMO = {
  id: 'demo-p1',
  nom: 'Laurent Bertrand',
  metier: 'Plomberie',
  ville: 'Lyon 3e',
  telephone: '06 12 34 56 78',
  email: 'l.bertrand@email.fr',
  adresse: '14 Rue de la République, 69003 Lyon',
  statut: 'Devis envoyé',
  score: 95,
  budget: '3 000 – 5 000 €',
  projet: 'Remplacement chaudière gaz',
  surface: 'Appartement 85m²',
  delai: 'Sous 1 mois',
  source: 'Via chat widget',
  analyse: 'Prospect chaud',
  synthese:
    "Remplacement d'une chaudière gaz vétuste dans un appartement de 85m². Budget cohérent avec le marché, délai court. Client disponible rapidement pour une visite technique.",
  recommandation:
    'Contactez sous 24h pour proposer une visite technique. Budget et délai correspondent à votre planning. Forte probabilité de conversion.',
  createdAt: '2026-06-14T10:23:00.000Z',
  historique: [
    { date: '14/06/2026 10:23', type: 'creation', texte: 'Dossier créé — statut initial : Nouveau' },
    { date: '14/06/2026 10:24', type: 'statut', texte: 'Statut modifié : À rappeler' },
    { date: '14/06/2026 11:15', type: 'statut', texte: 'Statut modifié : Qualifié' },
    { date: '14/06/2026 14:30', type: 'statut', texte: 'Statut modifié : Devis envoyé' },
    { date: '14/06/2026 14:32', type: 'note', texte: 'Note interne mise à jour' },
  ],
};

// 16 dossiers fictifs, mappés au format `Project` utilisé par ArtisanDashboard
// (ProjectList / KanbanBoard / computeKpis / filterProjects / buildSparklineData).
export const DEMO_PROJECTS: DemoProject[] = [
  { id: 'demo-p1', ref: 'recA1b2', clientFirstName: 'Laurent', clientName: 'Bertrand', trade: 'Plomberie', projectType: 'Remplacement chaudière', city: 'Lyon 3e', budget: '3 000 – 5 000 €', completenessScore: 95, status: 'Devis envoyé', source: 'Via chat widget', createdAt: '2026-06-14T10:00:00.000Z' },
  { id: 'demo-p2', ref: 'recC3d4', clientFirstName: 'Sophie', clientName: 'Mercier', trade: 'Plomberie', projectType: 'Rénovation salle de bain complète', city: 'Villeurbanne', budget: '8 000 – 12 000 €', completenessScore: 88, status: 'À rappeler', source: 'Via chat widget', createdAt: '2026-06-13T12:00:00.000Z' },
  { id: 'demo-p3', ref: 'recE5f6', clientFirstName: 'Marc', clientName: 'Fontaine', trade: 'Plomberie', projectType: 'Fuite sous évier urgente', city: 'Lyon 6e', budget: '200 – 500 €', completenessScore: 100, status: 'Qualifié', source: 'Via appel vocal', createdAt: '2026-06-13T12:00:00.000Z' },
  { id: 'demo-p4', ref: 'recG7h8', clientFirstName: 'Isabelle', clientName: 'Rousseau', trade: 'Plomberie', projectType: 'Installation lave-vaisselle', city: 'Caluire-et-Cuire', budget: '300 – 600 €', completenessScore: 75, status: 'Nouveau', source: 'Via chat widget', createdAt: '2026-06-13T12:00:00.000Z' },
  { id: 'demo-p5', ref: 'recI9j0', clientFirstName: 'Pierre', clientName: 'Dumont', trade: 'Plomberie', projectType: 'Pose robinetterie salle de bain', city: 'Lyon 7e', budget: '500 – 1 000 €', completenessScore: 82, status: 'Nouveau', source: 'Via chat widget', createdAt: '2026-06-12T12:00:00.000Z' },
  { id: 'demo-p6', ref: 'recK1l2', clientFirstName: 'Catherine', clientName: 'Blanc', trade: 'Plomberie', projectType: 'Détartrage chauffe-eau', city: 'Bron', budget: '200 – 400 €', completenessScore: 90, status: 'Gagné', source: 'Via appel vocal', createdAt: '2026-06-11T12:00:00.000Z' },
  { id: 'demo-p7', ref: 'recM3n4', clientFirstName: 'Thomas', clientName: 'Girard', trade: 'Plomberie', projectType: 'Remplacement radiateurs', city: 'Lyon 8e', budget: '2 000 – 4 000 €', completenessScore: 71, status: 'Devis envoyé', source: 'Via chat widget', createdAt: '2026-06-11T12:00:00.000Z' },
  { id: 'demo-p8', ref: 'recO5p6', clientFirstName: 'Marie', clientName: 'Lecomte', trade: 'Plomberie', projectType: 'Création salle de bain PMR', city: 'Décines-Charpieu', budget: '5 000 – 8 000 €', completenessScore: 93, status: 'Qualifié', source: 'Via chat widget', createdAt: '2026-06-10T12:00:00.000Z' },
  { id: 'demo-p9', ref: 'recQ7r8', clientFirstName: 'Alain', clientName: 'Moreau', trade: 'Plomberie', projectType: 'Dépannage chaudière gaz', city: 'Vénissieux', budget: '300 – 800 €', completenessScore: 100, status: 'Gagné', source: 'Via appel vocal', createdAt: '2026-06-09T12:00:00.000Z' },
  { id: 'demo-p10', ref: 'recS9t0', clientFirstName: 'Nathalie', clientName: 'Simon', trade: 'Plomberie', projectType: 'Pose baignoire îlot', city: 'Lyon 2e', budget: '3 000 – 6 000 €', completenessScore: 67, status: 'À rappeler', source: 'Via chat widget', createdAt: '2026-06-09T12:00:00.000Z' },
  { id: 'demo-p11', ref: 'recU1v2', clientFirstName: 'François', clientName: 'Petit', trade: 'Plomberie', projectType: 'Réparation fuite toiture terrasse', city: 'Lyon 9e', budget: '1 000 – 2 000 €', completenessScore: 55, status: 'Perdu', source: 'Via chat widget', createdAt: '2026-06-08T12:00:00.000Z' },
  { id: 'demo-p12', ref: 'recW3x4', clientFirstName: 'Sandrine', clientName: 'Dupuis', trade: 'Plomberie', projectType: 'Installation adoucisseur eau', city: 'Tassin-la-Demi-Lune', budget: '1 500 – 2 500 €', completenessScore: 84, status: 'Devis envoyé', source: 'Via chat widget', createdAt: '2026-06-07T12:00:00.000Z' },
  { id: 'demo-p13', ref: 'recY5z6', clientFirstName: 'Bruno', clientName: 'Lambert', trade: 'Plomberie', projectType: 'Changement colonne WC', city: 'Oullins', budget: '400 – 700 €', completenessScore: 91, status: 'Gagné', source: 'Via appel vocal', createdAt: '2026-06-06T12:00:00.000Z' },
  { id: 'demo-p14', ref: 'recA7b8', clientFirstName: 'Véronique', clientName: 'Martin', trade: 'Plomberie', projectType: 'Rénovation cuisine complète', city: 'Saint-Fons', budget: '4 000 – 7 000 €', completenessScore: 78, status: 'Nouveau', source: 'Via chat widget', createdAt: '2026-06-06T12:00:00.000Z' },
  { id: 'demo-p15', ref: 'recC9d0', clientFirstName: 'Olivier', clientName: 'Renard', trade: 'Plomberie', projectType: 'Pose pompe à chaleur air/eau', city: 'Lyon 4e', budget: '8 000 – 15 000 €', completenessScore: 88, status: 'À rappeler', source: 'Via chat widget', createdAt: '2026-06-05T12:00:00.000Z' },
  { id: 'demo-p16', ref: 'recE1f2', clientFirstName: 'Julie', clientName: 'Chevalier', trade: 'Plomberie', projectType: 'Réparation fuite radiateur', city: 'Lyon 1er', budget: '200 – 400 €', completenessScore: 96, status: 'Gagné', source: 'Via appel vocal', createdAt: '2026-06-04T12:00:00.000Z' },
];
