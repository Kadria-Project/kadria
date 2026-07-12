# Matrice des écrans — Audit UX/UI local (Playwright réel)

Statuts : **Vu** = capturé + contenu confirmé visuellement distinct.
**Cliqué mais non confirmé** = clic exécuté sans erreur mais capture
identique à un autre écran (navigation probablement inexistante avec le
sélecteur utilisé). **Non testé** = pas de tentative dans ce lot.

| Écran | Route | Desktop | Mobile | Scénario | Interactions testées | Statut |
|---|---|---|---|---|---|---|
| Dashboard (accueil) | `/demo-dashboard` | `desktop-dashboard-normal.png` | `mobile-dashboard-normal.png` | normal | Chargement, scroll implicite | Vu |
| Dashboard (param dense) | `/demo-dashboard?scenario=dense` | `desktop-dashboard-dense-param.png` | — | dense (via query) | Navigation directe | Vu (mais aucune différence visible vs normal, voir P2) |
| Suivi commercial | onglet dashboard | `desktop-suivi-commercial.png` | — | normal | Clic onglet nav latérale | Vu |
| Calendrier | onglet dashboard | `desktop-calendrier.png` | — | normal | Clic onglet nav latérale | Vu |
| Mes clients | onglet dashboard | `desktop-mes-clients.png` | — | normal | Clic onglet nav latérale | Vu |
| Mes taches a faire | onglet dashboard | `desktop-mes-taches.png` | — | normal | Clic onglet nav latérale | Vu |
| Notifications (panneau) | dashboard, cloche | `desktop-notifications-open.png` | — | normal | Clic cloche notif, ouverture panneau | Vu |
| Paramètres — Mon entreprise | `/demo-parametres` | `desktop-parametres.png` | `mobile-parametres.png` | normal | Chargement | Vu |
| Paramètres — Profil métier | `/demo-parametres` (onglet) | `desktop-parametres-profil-m-tier.png` | — | normal | Clic onglet | Vu |
| Paramètres — Catalogue & devis | `/demo-parametres` (onglet) | `desktop-parametres-catalogue-devis.png` | — | normal | Clic onglet | Vu |
| Paramètres — Coordonnées | `/demo-parametres` (onglet) | `desktop-parametres-coordonn-es.png` | — | normal | Clic onglet | Vu |
| Paramètres — Apparence | `/demo-parametres` (onglet) | `desktop-parametres-apparence.png` | — | normal | Clic onglet | Vu |
| Onboarding | `/demo-dashboard/onboarding` | `desktop-onboarding.png`, `desktop-onboarding-toolbaroff.png` | — | normal | Chargement | Vu (surface seulement, pas de clic sur les étapes) |
| Menu mobile (bottom-sheet) | dashboard mobile | — | `mobile-nav-open.png` | normal | Clic bouton menu | Vu |
| Dossiers (liste) | onglet "Suivi commercial", vue Liste | `dossiers-01-liste-normal-desktop.png`, `dossiers-03-liste-empty-desktop.png`, `dossiers-05-filtres-desktop.png` | `dossiers-04-liste-mobile.png` | normal / dense / empty | Clic onglet, clic "Liste", recherche "Martin" (1 résultat confirmé), scroll | Vu — `dossiers-02-liste-dense-desktop.png` (scénario dense) **manquante/invalide** : le fichier capturé montre le haut du dashboard, pas la liste de 30 dossiers ; non committée, à régénérer |
| Dossiers — scénario essentiel | onglet "Suivi commercial", vue Liste | `dossiers-06-liste-essential-desktop.png` | — | essential | Comparaison pixel avec `dossiers-01` | Vu — capture strictement identique (md5 identique) à `dossiers-01`, confirme code : le plan reste figé sur "performance" en démo (`DemoArtisanDashboard.tsx` L152/596-597), aucun verrouillage visuel n'apparaît pour "essential" (voir P1 rapport dédié) |
| Kanban (vue groupée par étape) | onglet "Suivi commercial", vue Kanban | `kanban-01-normal-desktop.png`, `kanban-02-dense-desktop.png`, `kanban-03-empty-desktop.png`, `kanban-06-export-menu-desktop.png` | `kanban-05-mobile.png` (vue liste filtrée, pas de colonnes) | normal / dense / empty | Clic "Kanban", clic "Exporter" (menu CSV/PDF/Rapport), clic carte → navigation fiche projet, scroll horizontal | Vu |
| Kanban — scénario essentiel (bouton verrouillé ?) | onglet "Suivi commercial" | `kanban-04-essential-scenario-desktop.png` | — | essential | `getByRole('button',{name:/Kanban/}).count()` = 1 (bouton présent, non verrouillé) | Vu — bouton Kanban jamais gated visuellement (plan figé sur performance), capture de la page non re-scrollée sur ce cliché précis (voir note rapport dédié) |
| Devis (liste / "Suivi commercial") | onglet dashboard "Suivi commercial" | `devis-01-liste-normal-desktop.png`, `devis-02-liste-dense-desktop.png`, `devis-03-liste-empty-desktop.png` (+ ancienne `desktop-devis-list.png`) | `devis-04-liste-mobile.png` (capture incorrecte, voir note) | normal/dense/empty | Navigation onglet, comparaison 3 scénarios | Vu — mais ce n'est pas une vue tabulaire dédiée aux devis, c'est le dashboard commercial agrégé (voir `docs/UX_UI_AUDIT_DEVIS.md`) ; capture mobile a en réalité ouvert le menu "Menu Kadria" (sélecteur "Suivi commercial" obsolète sur mobile) |
| Assistant interne Kadria | dashboard | `desktop-assistant-open.png` (mal nommée) | — | normal | Clic (a en réalité activé le filtre source "Assistant vocal") | Cliqué mais non confirmé — assistant non ouvert |
| Devis — création | `/demo-dashboard/projet/[id]/devis/new` | `devis-06-creation-initiale-desktop.png`, `devis-07-ajout-ligne-desktop.png`, `devis-08-catalogue-desktop.png`, `devis-09-calculs-desktop.png`, `devis-13-brouillon-desktop.png` | `devis-20-mobile-creation.png` | normal | Clic "Préparer un devis", ajout de ligne, remplissage 2 lignes (calculs HT/TVA/TTC vérifiés), soumission | Vu — flux complet fonctionnel, redirection confirmée vers le devis brouillon créé |
| Devis — édition | `/demo-dashboard/projet/[id]/devis/new` (réouverture) | `devis-10-edition-desktop.png`, `devis-10b-edition-suppression-ligne-desktop.png` | — | normal | Ajout puis suppression de ligne | Vu pour le formulaire (ajout/suppression) — non vérifié : réédition d'un brouillon existant avec pré-remplissage (pas de bouton "Modifier" localisé) |
| Devis — aperçu | `/demo-dashboard/projet/[id]/devis/[devisId]` | `devis-11-apercu-source-desktop.png` | `devis-12-apercu-mobile.png` | normal | Navigation directe, clic "Télécharger PDF" | Vu pour la page source ; clic PDF n'a ouvert aucune popup (timeout 30s) — rendu PDF non confirmé |
| Devis — cycle de vie (brouillon/envoyé/accepté/refusé) | `/demo-dashboard/projet/[id]/devis/[devisId]` | `devis-13-brouillon-desktop.png`, `devis-14-envoye-desktop.png`, `devis-15-accepte-desktop.png`, `devis-16-refuse-desktop.png` | — | normal | Navigation directe sur 4 devis à états différents | Vu — 4 badges/états distincts confirmés, motif de refus affiché en clair |
| Devis — scénario essentiel vs performance | `/demo-dashboard/projet/[id]/devis/[devisId]` | `devis-17-essential-locked.png`, `devis-18-performance.png`, `devis-17b-dashboard-essential.png`, `devis-17b-dashboard-performance.png` | — | essential / performance | Comparaison des 2 scénarios sur le même devis + dashboard | Vu — captures quasi identiques (mêmes actions actives, aucun verrouillage), seule différence : en-tête personnalisé "Dupont Renovation" en performance ; badge plan "PRO" figé sur le dashboard indépendamment du scénario (même bug que Dossiers/Kanban, voir P1 dans `docs/UX_UI_AUDIT_DEVIS.md`) |
| Fiche projet complète (devis accepté) | `/demo-dashboard/projet/demo_104` | `projet-01-complet-desktop.png` | `projet-05-mobile.png` | normal | Navigation directe, lecture pilotage commercial / avancement / analyse Kadria | Vu |
| Fiche projet incomplète (budget manquant) | `/demo-dashboard/projet/demo_101` | `projet-02-incomplet-desktop.png` | — | normal | Navigation directe | Vu |
| Fiche projet avec devis généré | `/demo-dashboard/projet/demo_103` | `projet-03-devis-desktop.png` | — | normal | Navigation directe | Vu |
| Fiche projet avec rendez-vous planifié | `/demo-dashboard/projet/demo_102` | `projet-04-rendez-vous-desktop.png` | `projet-07-mobile-rdv.png` | normal | Navigation directe | Vu |
| Fiche projet — modale "Planifier un rendez-vous" | `/demo-dashboard/projet/demo_101` | `projet-06-modal-rdv-desktop.png` | — | normal | Clic "Planifier un rendez-vous" | Vu |
| Menu mobile "Menu Kadria" (bottom-sheet secondaire) | dashboard mobile | — | `mobile-menu-sheet.png` | normal | Clic bouton "Menu" | Vu |
| Planning d'équipe | inconnue | — | — | — | Aucune | Non testé |
| Catalogue / prestations (écran dédié) | inconnue | — | — | — | Aucune | Non testé (seul l'onglet paramètres "Catalogue & devis" a été vu) |
| Équipe et collaborateurs | inconnue | — | — | — | Aucune | Non testé |
| Centre de progression (détail) | dashboard, bouton "Voir le détail" | — | — | — | Aucune | Non testé |
| Modales de confirmation / actions dangereuses | — | — | — | — | Aucune | Non testé |
| Drawers secondaires (hors notifications) | — | — | — | — | Aucune | Non testé |
| État verrouillé Essentiel + CTA upgrade (zone Dossiers/Kanban) | dashboard, plan essentiel | `dossiers-06-liste-essential-desktop.png`, `kanban-04-essential-scenario-desktop.png` | — | essential | Comparaison visuelle + comptage de sélecteur | Vu — **aucun verrouillage visuel constaté** dans cette zone ; voir P1 dans `UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md` |
| Scénario `empty` (zone Dossiers/Kanban) | `/demo-dashboard?scenario=empty` | `dossiers-03-liste-empty-desktop.png`, `kanban-03-empty-desktop.png` | — | empty | Navigation directe | Vu — 1 dossier (pas 0), voir note rapport dédié |
| Scénario `performance` (zone Dossiers/Kanban) | `/demo-dashboard?scenario=normal` (plan figé "performance" par défaut dans toute la démo) | voir lignes Dossiers/Kanban ci-dessus | — | normal=performance | — | Vu implicitement — le plan démo est toujours "performance" (voir P1) |

**Total captures produites (cumulé, tous lots)**: 42 fichiers PNG utiles dans
`docs/ux-audit-screenshots/` (21 des lots précédents + 21 de ce lot : zone
Dossiers/Kanban/Fiche projet, cf. `UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md`).
