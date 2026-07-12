# Incohérences UI transversales — constats visuels réels

Basé sur les captures Playwright réelles produites dans les lots successifs
(`docs/ux-audit-screenshots/`) : 16 captures qualifiées et commitées du
premier lot (Dashboard, Navigation, Notifications, Paramètres — sur 19
candidates, 2 rejetées mauvais écran + 1 doublon strict, voir la section
"Lot de qualification visuelle" dans `UX_UI_AUDIT_V1.md`), complétées par 19
captures du lot Dossiers / Kanban / Fiche projet (voir
`UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md`), puis par le lot Devis (voir
`UX_UI_AUDIT_DEVIS.md`). Ne couvre que les écrans listés comme "Vu" dans
`UX_UI_AUDIT_SCREEN_MATRIX.md` — ne pas généraliser aux écrans non testés.
L'onboarding réel n'a jamais été capturé (faux positif corrigé — voir
`UX_UI_AUDIT_V1.md`) et reste non testé.

## Navigation
- La nav desktop (sidebar, 5 items : Valeur générée, Suivi commercial,
  Calendrier, Mes clients, Mes taches a faire) et la nav mobile (bottom-sheet
  "Menu Kadria", 6 items : Pipeline complet, Valeur générée, Agenda, Mon
  abonnement, Paramètres, Support) ne se recouvrent pas terme à terme. Des
  libellés différents désignent probablement les mêmes fonctions
  (Calendrier / Agenda), et des items n'existent que sur une des deux
  surfaces (Pipeline complet, Mon abonnement, Support absents de la sidebar
  desktop capturée).

## Formulaires
- Onglets Paramètres : 9 items sur une seule ligne horizontale à 1440px,
  dernier item tronqué sans indicateur de scroll. Sur mobile (390px), la
  même barre nécessite un scroll horizontal, également sans indicateur.

## Tableaux
- Le tableau "Mes clients" utilise 6 filtres dropdown alignés horizontalement
  qui atteignent quasiment le bord droit du conteneur à 1440px — peu de
  marge pour un ajout futur sans passer à une disposition en 2 lignes ou un
  menu "plus de filtres".

## Modales / drawers / feedback
- Le panneau de notifications s'ouvre sans overlay/backdrop assombrissant le
  reste de l'interface : le dashboard reste pleinement interactif derrière,
  ce qui brouille la distinction entre un panneau "léger" (non bloquant) et
  une vraie modale. À clarifier intentionnellement (soit ajouter un backdrop,
  soit assumer visuellement le côté non-bloquant, ex. ombre plus prononcée).

## Densité / troncature de texte
- Deux occurrences distinctes de troncature agressive du texte observées :
  le dernier onglet Paramètres ("Offre & quo...") et les libellés
  d'événements dans le calendrier lorsqu'il y en a 2 le même jour
  ("Relance devis - Sophi..."). Pas de pattern unifié de troncature
  (ellipsis avec tooltip, badge "+N", etc.) visible sur les deux cas.

## Couleurs / badges
- Les codes couleur (vert = positif/payé, orange = alerte/relance, bleu =
  neutre/info, violet = intervention) sont appliqués de façon cohérente
  entre le dashboard (KPIs), le tableau clients (badges de statut) et le
  calendrier (légende d'événements) sur les écrans testés — point positif,
  aucune incohérence de palette relevée dans ce périmètre.

## Plan / gating (Dossiers, Kanban, Fiche projet)
- Le plan démo est figé sur `'performance'`
  (`src/components/DemoArtisanDashboard.tsx` L152 `DEMO_PLAN` et L596-597
  `<PlanProvider plan={DEMO_PLAN}><Dashboard plan={DEMO_PLAN} />`), **quel
  que soit le scénario `?scenario=` choisi dans la toolbar d'audit**. Le
  scénario `essential` ne change que `artisan.plan` dans les fixtures
  (`src/lib/demo-data.ts` L1700-1706), jamais le plan réellement injecté
  dans `PlanProvider`/`FeatureGate`. Résultat mesuré : `dossiers-01-liste-
  normal-desktop.png` et `dossiers-06-liste-essential-desktop.png` sont
  strictement identiques au pixel près (md5 identique), de même pour le
  bouton Kanban (jamais verrouillé, `count()===1` en scénario essential).
  Toute exploration commanditée pour "vérifier visuellement les verrouillages
  Essentiel" sur Dossiers/Kanban se heurte structurellement à cette limite —
  ce n'est pas un manque d'effort de test, c'est un plan hardcodé en amont.
  Voir P1-DKP-01 dans `UX_UI_AUDIT_DOSSIERS_KANBAN_PROJET.md`.

## Plan / gating (Devis) — même bug que Dossiers/Kanban
- Reproduit à l'identique sur la page détail d'un devis : `devis-17-essential-
  locked.png` (`?scenario=essential`) et `devis-18-performance.png`
  (`?scenario=performance`) affichent les mêmes prestations, les mêmes
  boutons "Marquer comme accepté" / "Marquer comme refusé" pleinement actifs
  et non grisés, sans badge ni message d'upsell côté Essentiel. Seule
  différence visuelle : l'en-tête personnalisé ("Dupont Renovation", en vert)
  affiché en `performance` vs le texte générique "Kadria" en `essential` —
  preuve que le personnalisation de marque fonctionne, mais qu'aucun autre
  élément de la page n'est verrouillé. Le badge de plan sur le dashboard
  reste également figé sur "PRO" quel que soit `?scenario=`
  (`devis-17b-dashboard-essential.png` vs `devis-17b-dashboard-performance.png`
  identiques). Cohérent avec la cause déjà identifiée dans
  `DemoArtisanDashboard.tsx` (plan démo figé sur `'performance'`,
  indépendant du scénario). Voir P1 dans `UX_UI_AUDIT_DEVIS.md`.

## Devis : pas de vue "liste" dédiée trouvée
- L'écran le plus proche d'une "liste des devis" est l'onglet "Suivi
  commercial" du dashboard, qui est en réalité un tableau de bord commercial
  agrégé (CA potentiel, devis envoyés, taux de conversion, opportunités à
  sécuriser), pas une liste tabulaire filtrable de devis avec statut/montant
  par ligne. À vérifier si une vraie liste existe ailleurs dans l'app ; non
  localisée dans le lot Devis. Voir `UX_UI_AUDIT_DEVIS.md`.

## Devis mobile : sélecteur de nav obsolète (constat d'audit, pas un bug produit)
- Le menu mobile n'expose plus l'item "Suivi commercial" tel quel (remplacé
  par "Pipeline complet" dans le bottom-sheet "Menu Kadria"), alors que le
  libellé desktop équivalent reste "Suivi commercial". Cette divergence de
  nommage desktop/mobile a fait échouer la capture automatisée de la liste de
  devis mobile (elle montre le menu ouvert au lieu de la liste). Signale une
  petite incohérence de nommage entre les deux plateformes, à rapprocher du
  constat déjà fait sur "Kanban mobile ≠ Kanban desktop" ci-dessous.

## Kanban mobile ≠ Kanban desktop
- Le "Kanban" desktop (`Suivi commercial` → bouton Kanban) affiche 5
  colonnes par étape avec drag & drop. Sur mobile, l'entrée "Pipeline
  complet" (menu bottom-sheet) affiche une liste de cartes avec des
  compteurs par statut et des chips de filtre — pas de colonnes, pas de
  drag & drop. Ce n'est pas un bug (le pattern colonnes n'est pas adapté à
  390px) mais l'appellation "Pipeline complet" identique aux deux endroits
  peut créer une attente de continuité visuelle qui n'existe pas. Voir
  P2-DKP-02.

## Fixtures dupliquées en scénario dense
- En scénario `dense` (30 dossiers), le Kanban affiche des cartes avec des
  noms de client, montants et scores strictement identiques répétés
  plusieurs fois dans une même colonne (ex. "Camille Durand — Plomberie —
  Rouen — Score 58%" apparaît 3 fois consécutives visibles dans
  `kanban-02-dense-desktop.png`). Cela réduit le réalisme du test de densité
  mais n'est pas un bug d'affichage — c'est une caractéristique des fixtures
  démo. Voir P3-DKP-03.

## Non couvert par ce document
Les familles suivantes ne peuvent pas être évaluées faute d'écrans testés
dans les lots réalisés à ce jour : rendu PDF simulé réel des devis (le clic
"Télécharger PDF" n'a pas ouvert de popup dans le lot Devis), réédition d'un
devis brouillon existant avec pré-remplissage (seul le formulaire vierge a
été testé), animations, comportement des modales de confirmation d'action
dangereuse, cohérence des formulaires du Catalogue en écran dédié (distinct
de l'onglet paramètres), Planning d'équipe, Équipe et collaborateurs,
Administration, Assistant interne, Centre de progression (détail),
Notifications (au-delà du panneau simple). Voir la liste "Non testé" dans
`UX_UI_AUDIT_SCREEN_MATRIX.md`.
