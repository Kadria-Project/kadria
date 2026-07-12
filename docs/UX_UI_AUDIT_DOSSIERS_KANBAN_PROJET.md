# Audit UX/UI local — Dossiers, Pipeline/Kanban, Fiche projet

Audit visuel réel produit avec Playwright (Chromium), contre le mode démo
local (`NODE_ENV=development`, `KADRIA_LOCAL_UX_AUDIT=true`, serveur
`next dev` sur `localhost:3417`). Aucune session réelle, aucun JWT, aucune
donnée réelle, aucune écriture Supabase. Ce rapport ne couvre que la zone
**Liste des dossiers**, **Pipeline/Kanban**, **Fiche projet** — les autres
zones (Devis, Planning, Catalogue, Équipe, Paramètres, Assistant interne,
Notifications, Centre de progression, Administration) sont hors scope de ce
lot et non retestées ici.

## 1. Cartographie du code (avant capture)

| Élément | Fichier / ligne |
|---|---|
| Point d'entrée dashboard démo | `app/demo-dashboard/page.tsx` → `src/components/DemoArtisanDashboard.tsx` |
| Plan figé | `DEMO_PLAN = 'performance'` (L152), `<PlanProvider plan={DEMO_PLAN}>` (L596) — **indépendant du `?scenario=`** |
| Toggle Liste/Kanban | `viewMode` state (L1761), boutons "📋 Liste" / "🗂️ Kanban" (L4714-4738), `FeatureGate feature="kanbanView"` autour du bouton Kanban |
| Filtres avancés | `FeatureGate feature="advancedFilters"` autour de Budget/Score/Période/Source (L4579-4649) |
| Recherche | `Input` avec placeholder `Nom, projet, ville, reference...` (L4492-4500), debounce 400ms (L1941) |
| Colonnes Kanban | `KANBAN_GROUPED_COLUMNS` (L792-798) : Nouveau / Action requise / Prêt à chiffrer / Devis en attente / Clôturé |
| Carte Kanban | `KanbanCard` (L5178+) — `draggable`, `onClick` → `router.push('/demo-dashboard/projet/{id}')`. **Pas de menu contextuel** sur la carte (clic = navigation directe uniquement) |
| Export | Menu "Exporter" (CSV / PDF / Rapport mensuel), `FeatureGate feature="pdfExports"` sur les 2 derniers items |
| Fiche projet | `app/demo-dashboard/projet/[id]/page.tsx` (4503 lignes) — modale RDV `showRdvModal` (L578, L2087, L4213) |
| Mobile dossiers | `src/components/dashboard/MobileDossiersView.tsx`, accessible via bottom-nav "Dossiers" |
| Mobile pipeline | `src/components/dashboard/MobilePipelineView.tsx`, accessible via bottom-nav "Menu" → "Pipeline complet" — **liste de cartes avec compteurs par statut, pas de colonnes** |
| Scénarios fixtures | `src/lib/demo-data.ts` L1623-1706 : `normal`/`essential`/`performance` = même volume (10 dossiers), `dense` = 30, `empty` = 1 |
| Plan par scénario (fixtures uniquement) | `getScenarioArtisan()` L1700-1706 : change `artisan.plan` mais **n'est jamais lu par `PlanProvider`** dans `DemoArtisanDashboard.tsx` |

### Matrice de test (résumé)

| Écran | Route/état | Scénario | Déclencheur | Sélecteur réel utilisé | Résultat |
|---|---|---|---|---|---|
| Dossiers liste | `/demo-dashboard` | normal/dense/empty/essential | clic "Suivi commercial" puis scroll jusqu'au bloc filtres | `getByRole('button',{name:'Suivi commercial'})` + `getByPlaceholder('Nom, projet, ville, reference...')` | Vu |
| Dossiers recherche | idem | normal | fill "Martin" | `getByPlaceholder(...)` | Vu, "1 dossier(s) trouvé(s)" confirmé |
| Dossiers mobile | `/demo-dashboard` mobile | normal | clic bottom-nav "Dossiers" | `getByRole('button',{name:'Dossiers',exact:true})` | Vu |
| Kanban desktop | `/demo-dashboard` | normal/dense/empty/essential | clic "🗂️ Kanban" | `getByRole('button',{name:/Kanban/})` | Vu |
| Kanban export menu | idem | normal | clic "Exporter" | `getByRole('button',{name:/Exporter/})` | Vu |
| Kanban mobile | `/demo-dashboard` mobile | normal | clic "Menu" puis "Pipeline complet" | `getByRole('button',{name:'Menu',exact:true})` puis `getByText('Pipeline complet')` | Vu — vue liste, pas colonnes |
| Fiche projet complète | `/demo-dashboard/projet/demo_104` | normal | navigation directe | URL directe | Vu |
| Fiche projet incomplète | `/demo-dashboard/projet/demo_101` | normal | navigation directe | URL directe | Vu |
| Fiche projet devis | `/demo-dashboard/projet/demo_103` | normal | navigation directe | URL directe | Vu |
| Fiche projet RDV | `/demo-dashboard/projet/demo_102` | normal | navigation directe | URL directe | Vu |
| Modale RDV | `/demo-dashboard/projet/demo_101` | normal | clic "Planifier un rendez-vous" | `getByRole('button',{name:/rendez-vous|planifier/i})` | Vu |

## 2. Périmètre réellement testé

- **Routes** : `/demo-dashboard` (mode `commercial`, vues Liste et Kanban),
  `/demo-dashboard/projet/demo_101`, `demo_102`, `demo_103`, `demo_104`.
- **Scénarios** : `normal`, `dense`, `empty`, `essential` (Dossiers +
  Kanban). `performance` non testé séparément car c'est le plan par défaut
  de toute la démo (voir P1-DKP-01) — `normal` en est donc déjà représentatif.
- **Viewports** : desktop 1440×1000 (usage principal), mobile 390×844. Le
  desktop dense 1280×800 et le petit mobile 360×800 n'ont pas été utilisés :
  aucune anomalie de layout n'a été détectée à 1440/390 qui aurait justifié
  un test supplémentaire à une autre largeur pour cette zone.
- **Interactions exécutées** : bascule Liste↔Kanban, recherche texte,
  ouverture menu Export, ouverture menu mobile "Menu Kadria" → "Pipeline
  complet", clic sur bouton "Planifier un rendez-vous" (ouverture modale),
  navigation vers 4 fiches projet aux profils différents, scroll vertical
  (desktop et mobile), scroll horizontal implicite du Kanban (colonnes en
  `overflow-x-auto` à largeur réduite).
- **Modales/drawers testés** : modale "Planifier un rendez-vous" (fiche
  projet), menu dropdown "Exporter" (Kanban), bottom-sheet "Menu Kadria"
  (mobile).
- **Non testés dans cette zone** (avec justification) :
  - Drag & drop réel d'une carte Kanban entre colonnes : le code
    (`onDragStart`/`onDrop`, L5111-5124) simule un changement de statut
    local (`onStatusChange`) sans écriture réseau, donc autorisé par la
    consigne, mais Playwright ne reproduit pas fidèlement le DnD HTML5
    natif sans une séquence `dispatchEvent` dédiée ; par prudence (éviter
    tout effet de bord non maîtrisé) cette interaction n'a pas été exercée
    dans ce lot. Le comportement de survol (`overColumn`, bordure verte) a
    été lu dans le code mais pas capturé visuellement.
  - Menu contextuel de carte Kanban : **n'existe pas** dans le code (clic
    carte = navigation directe uniquement, pas de bouton "..." séparé) —
    rien à tester, ce n'est pas un oubli.
  - Statut filtre dropdown (Radix `Select`) : tentative de clic a échoué
    (le sélecteur `button[role="combobox"]` ne matchait pas le composant
    Radix réel) ; la recherche texte a servi de preuve alternative que le
    filtrage fonctionne (10 → 1 dossier). Non bloquant pour la mission.
  - Tri explicite des colonnes de la liste : aucun contrôle de tri visible
    dans le header du tableau (`REF`, `RECU`, `CLIENT`...) au-delà de l'ordre
    par défaut (date de réception décroissante) — confirmé par lecture du
    code (`sortNextActions`, tri fixe), pas de bouton de tri à cliquer.
  - Assignation de responsable / changement d'assignation simulé : les
    fixtures démo assignent un responsable par défaut
    (`getDefaultDemoResponsible`) mais aucune UI de réassignation n'a été
    localisée dans la fiche projet lors de cette passe ; non testé faute de
    déclencheur identifié avec certitude dans le temps imparti.

## 3. Captures produites

21 fichiers dans `docs/ux-audit-screenshots/` (16 desktop, 5 mobile) :

**Dossiers**
- `dossiers-01-liste-normal-desktop.png` — liste, 10 dossiers, tableau complet (REF/RECU/CLIENT/PROJET/RESPONSABLE/VILLE/SCORE/STATUT)
- `dossiers-02-liste-dense-desktop.png` — liste, 30 dossiers
- `dossiers-03-liste-empty-desktop.png` — 1 dossier (scénario "empty" ≠ zéro dossier)
- `dossiers-04-liste-mobile.png` — vue mobile avec cartes (Appeler/Ouvrir/Devis), chips de filtre
- `dossiers-05-filtres-desktop.png` — recherche "Martin" appliquée (10 → 1 résultat)
- `dossiers-05b-filtre-statut-desktop.png` — tentative filtre statut (non concluante, voir §2)
- `dossiers-06-liste-essential-desktop.png` — scénario essential, **identique pixel-perfect à dossiers-01**

**Kanban**
- `kanban-01-normal-desktop.png` — 5 colonnes, cartes avec score/responsable/montant
- `kanban-02-dense-desktop.png` — 30 dossiers, cartes dupliquées visibles (voir P3-DKP-03)
- `kanban-03-empty-desktop.png` — colonnes avec état vide ("Aucun dossier")
- `kanban-04-essential-scenario-desktop.png` — scénario essential (bouton Kanban non verrouillé, `count()===1`)
- `kanban-05-mobile.png` — vue mobile "Pipeline complet" (liste, pas colonnes)
- `kanban-06-export-menu-desktop.png` — menu Export ouvert (CSV/PDF/Rapport mensuel)

**Fiche projet**
- `projet-01-complet-desktop.png` — demo_104, devis accepté, pilotage commercial complet
- `projet-02-incomplet-desktop.png` — demo_101, budget manquant, CTA "Compléter le budget"
- `projet-03-devis-desktop.png` — demo_103, devis généré
- `projet-04-rendez-vous-desktop.png` — demo_102, RDV planifié affiché
- `projet-05-mobile.png` — fiche mobile avec CTA sticky bas (Appeler/RDV/Devis)
- `projet-06-modal-rdv-desktop.png` — modale "Planifier un rendez-vous"
- `projet-07-mobile-rdv.png` — fiche mobile, projet avec RDV

**Transversal**
- `mobile-menu-sheet.png` — bottom-sheet "Menu Kadria" (accès Pipeline complet, Valeur générée, Agenda, Abonnement, Paramètres, Support)

## 4. Analyse UX/UI (observé uniquement)

### Hiérarchie visuelle
- Liste dossiers : titre de section absent au-dessus du tableau (seul
  "10 dossier(s) trouvé(s)" fait office de repère), action principale
  ("Liste"/"Kanban"/"Exporter") bien groupée en haut à droite du tableau.
- Fiche projet : hiérarchie forte et cohérente — titre du besoin en gros,
  client/métier/ville en sous-titre, statut + score + température
  ("Chaud") en haut à droite, bloc vert "Pilotage commercial" qui capte
  l'œil en premier (bonne priorisation de l'action recommandée).
- Kanban : en-tête de colonne avec compteur coloré par statut, lisible.

### Cohérence UI
- Boutons Liste/Kanban : bon contraste actif/inactif (vert plein vs bordure
  neutre), cohérent avec les autres toggles du dashboard.
- Cartes Kanban et lignes de tableau utilisent la même palette de badges de
  statut (Nouveau/Qualifié/Devis envoyé/Gagné/Perdu) — cohérence confirmée
  visuellement entre liste et Kanban.
- La fiche projet réutilise les mêmes badges de statut que la liste/Kanban
  ("Devis accepté", "Qualifié") — cohérence transversale correcte sur ce
  périmètre.
- Modale RDV : style sobre, cohérent avec le reste de l'UI (fond sombre,
  bordure verte au focus), mais champs natifs `<input type="date">` /
  `<input type="time">` non stylés au même niveau que le reste des inputs
  Kadria (rendu navigateur brut visible dans `projet-06-modal-rdv-desktop.png`).

### UX
- Clic sur une carte Kanban = navigation directe vers la fiche, sans étape
  intermédiaire ni confirmation — rapide, cohérent avec un usage terrain.
- Aucun retour visuel testé après action réelle (aucune action d'écriture
  déclenchée dans ce lot, conformément à la consigne) — non applicable ici.
- Le bouton "Exporter" ouvre un menu à 3 options avec sous-titres explicites
  (bonne découvrabilité).

### Densité
- Scénario dense (30 dossiers) : le Kanban reste lisible, colonnes
  scrollables verticalement (`max-h-[calc(100vh-300px)]`), mais les cartes
  affichées sont des doublons quasi identiques des mêmes 10 profils clients
  (voir P3-DKP-03) — dégrade le réalisme du test sans casser l'UI.
- Scénario empty : 1 dossier au lieu de 0 — l'état "vraiment vide" (0
  dossier partout, y compris sur la carte et les KPIs) n'a pas été observé
  dans ce lot puisque la fixture "empty" contient toujours 1 élément.

### Mobile
- Liste dossiers mobile : cartes avec 3 actions par ligne (Appeler/Ouvrir/
  Devis), accessibles au pouce, bonne hauteur de cible tactile.
- Fiche projet mobile : CTA sticky en bas (Appeler/RDV/Devis) — bon pattern,
  cohérent avec un usage à une main sur chantier.
- Pipeline mobile ("Pipeline complet") n'est pas un Kanban à colonnes mais
  une liste de cartes filtrable par statut avec compteurs en haut — décision
  de design raisonnable pour 390px, mais le nom identique à la vue desktop
  ("Pipeline complet" / bouton "Kanban") peut suggérer à tort une parité
  fonctionnelle. Voir P2-DKP-02.

### Performance perçue
- Aucun skeleton ni loader visible pendant les captures (chargement quasi
  instantané en local, données déjà en mémoire côté client démo) — pas de
  décalage de mise en page (CLS) observé entre chargement et rendu final
  sur les 4 fiches projet testées.
- Erreurs réseau observées (voir §6) concernent uniquement des ressources
  externes (Google Fonts, tuiles OpenStreetMap, images Unsplash) bloquées
  par la sandbox réseau de cet environnement — sans lien avec le code
  applicatif, à ignorer pour l'évaluation UX/perf réelle en environnement
  normal.

## 5. Problèmes classés P0–P3

### P1-DKP-01 — Aucun verrouillage visuel Essentiel sur Dossiers/Kanban (transversal)
- **Écran** : Dossiers (liste + Kanban), scénario `essential`.
- **Capture** : `dossiers-06-liste-essential-desktop.png` vs
  `dossiers-01-liste-normal-desktop.png` (md5 strictement identiques) ;
  `kanban-04-essential-scenario-desktop.png`, bouton Kanban présent
  (`count()===1`, non gated).
- **Observation** : le plan démo est figé sur `'performance'`
  (`DemoArtisanDashboard.tsx` L152, L596-597) indépendamment du
  `?scenario=essential` choisi dans la toolbar d'audit. Le scénario
  `essential` ne modifie que `artisan.plan` dans les fixtures affichées
  (nom du plan visible ailleurs dans l'UI), jamais les `FeatureGate`
  réellement actifs (`kanbanView`, `advancedFilters`, `pdfExports`...).
- **Impact** : impossible de valider visuellement, dans cette zone, le
  comportement réel des artisans au plan Essentiel (CTA upgrade, filtres
  masqués, bouton Kanban verrouillé) — c'est pourtant un besoin explicite du
  mandat d'audit UX pour cette zone.
- **Recommandation** : soit brancher `PlanProvider`/`Dashboard` sur
  `artisan.plan` (dérivé du scénario) au lieu de `DEMO_PLAN` fixe pour les
  besoins de l'audit local uniquement (garder `performance` par défaut hors
  `?scenario=essential`), soit documenter clairement dans la toolbar que le
  sélecteur "essential"/"performance" n'affecte que les données et pas le
  plan effectif, pour éviter une confusion lors de futurs audits.
- **Composant probable** : `src/components/DemoArtisanDashboard.tsx`
  (L152, L596-597).
- **Effort** : S (si on décide de dériver le plan du scénario) à
  documentation seule (S) si on choisit de ne pas le corriger.
- **Portée** : transversale (concerne aussi Devis/Planning/Catalogue/Équipe
  hors scope de ce lot, dès qu'ils utilisent `FeatureGate`).

### P2-DKP-02 — Parité nominale trompeuse entre Kanban desktop et "Pipeline complet" mobile
- **Écran** : Kanban desktop vs Pipeline mobile.
- **Capture** : `kanban-01-normal-desktop.png` (5 colonnes) vs
  `kanban-05-mobile.png` (liste de cartes + compteurs, sans colonnes).
- **Observation** : les deux points d'entrée portent des libellés voisins
  ("🗂️ Kanban" / "Pipeline complet") mais donnent des expériences
  structurellement différentes (colonnes+DnD vs liste+filtres).
- **Impact** : un utilisateur habitué au Kanban desktop peut être surpris
  de ne pas retrouver la même structure sur mobile, alors que le
  changement de pattern est en réalité justifié par la largeur d'écran.
- **Recommandation** : renommer l'entrée mobile ("Suivi par statut" ou
  équivalent) pour ne pas suggérer une continuité 1:1, ou ajouter une courte
  mention "vue simplifiée" lors du premier accès mobile.
- **Composant probable** : `src/components/dashboard/MobileDashboardView.tsx`
  (libellé "Pipeline complet" L1099), `MobilePipelineView.tsx`.
- **Effort** : S (changement de libellé).
- **Portée** : locale à cette zone.

### P3-DKP-03 — Cartes dupliquées en scénario dense (Kanban)
- **Écran** : Kanban, scénario `dense`.
- **Capture** : `kanban-02-dense-desktop.png` (colonnes "Nouveau" et "Prêt
  à chiffrer" montrent des cartes identiques répétées : même nom client,
  même score, même ville).
- **Observation** : les fixtures `dense` dupliquent un nombre restreint de
  profils plutôt que de générer 30 profils distincts.
- **Impact** : réduit le réalisme du test de densité (un audit visuel de
  "surcharge d'information" est moins probant avec des doublons visuels
  évidents), sans casser l'UI.
- **Recommandation** : générer des variantes de nom/ville/montant pour les
  fixtures dense, ou accepter ce compromis pour un usage strictement local.
- **Composant probable** : `src/lib/demo-data.ts` (génération scénario
  `dense`).
- **Effort** : S.
- **Portée** : locale (fixtures démo uniquement, aucun impact production).

### P3-DKP-04 — Champs natifs non stylés dans la modale RDV
- **Écran** : Fiche projet, modale "Planifier un rendez-vous".
- **Capture** : `projet-06-modal-rdv-desktop.png`.
- **Observation** : les champs Date et Heure utilisent le rendu natif du
  navigateur (icône calendrier/horloge standard), visuellement en rupture
  avec le reste des inputs Kadria (bordures arrondies, focus vert).
- **Impact** : mineur, incohérence de finition visible uniquement dans
  cette modale précise.
- **Recommandation** : harmoniser via un composant `Input` custom
  date/heure si le design system en propose un ailleurs dans l'app.
- **Composant probable** : `app/demo-dashboard/projet/[id]/page.tsx`
  (bloc modale RDV, ~L4213+).
- **Effort** : S/M selon disponibilité d'un composant date/heure réutilisable.
- **Portée** : locale.

Aucun problème P0 (bloquant) identifié dans le périmètre réellement testé.

## 6. Validation technique

- **Build** : `npm run build` exécuté après ce lot — voir résultat en fin de
  rapport (§7 du rapport final ci-dessous / section Git).
- **Erreurs console** : uniquement des échecs réseau externes attendus dans
  ce sandbox (`ERR_CONNECTION_RESET` / `ERR_TUNNEL_CONNECTION_FAILED` sur
  `fonts.googleapis.com`, tuiles `*.tile.openstreetmap.org`, images
  `images.unsplash.com`) — aucune erreur JavaScript applicative détectée
  pendant les parcours Dossiers/Kanban/Fiche projet.
- **Erreurs réseau** : idem, uniquement ressources externes (police Inter,
  fond de carte OpenStreetMap dans le panneau "Carte des chantiers", photos
  de démo hébergées sur Unsplash) — attendu dans un environnement sans
  accès sortant à ces domaines, sans rapport avec une régression de code.
- **Appels réseau inattendus** : **aucun** — le hook `unexpectedRequests`
  (toute requête non-GET vers l'app, ou tout appel `supabase*`) est resté
  vide sur l'ensemble des parcours de ce lot, confirmant qu'aucune écriture
  réelle n'a été déclenchée (drag & drop non exercé, aucune confirmation
  d'action destructive).

## 7. Sécurité — vérifications effectuées

- `middleware.ts` : condition `NODE_ENV !== 'production' && process.env.KADRIA_LOCAL_UX_AUDIT === 'true'`
  inchangée dans ce lot (non modifiée, non retouchée).
- `app/demo-dashboard/layout.tsx` : même garde côté layout, calculée
  serveur uniquement, jamais transmise en tant que secret au client.
- Aucune session réelle : la démo n'utilise ni `AuthGuard` ni cookie de
  session (`DemoArtisanDashboard` — commentaire L592-594 dans le code).
- Aucun appel Supabase ni écriture réseau détecté pendant les captures
  (voir §6).
- `/dashboard-v2` non touché, non exploré dans ce lot.
