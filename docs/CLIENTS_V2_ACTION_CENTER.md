# Clients V2 — Centre d'actions CRM (Lot 9.5)

## Objectif produit

Transformer l'écran Clients en cockpit CRM orienté action : répondre en quelques
secondes à « Qui dois-je contacter et que dois-je faire maintenant ? », sans
dupliquer ni recalculer la liste clients existante (Lots 8/9).

## Architecture

```
app/api/clients/route.ts                       → source de vérité, enrichie d'un champ `actions`
src/lib/clients/
  client-list-aggregation.ts                    → filterClientList() : + param attentionReason
  clients-action-types.ts                       → ClientActionReason / ClientActionItem / ClientActionsSummary
  clients-action-config.ts                      → hiérarchie des priorités + libellés + CTA (fichier unique)
  clients-action-derive.ts                      → deriveClientActions / summarizeClientActions / topClientActions
  clients-action-format.ts                      → libellés d'échéance humains (FR, relatifs)
src/components/dashboard/
  ClientsV2List.tsx                              → orchestration page (inchangé dans son contrat externe)
  clients/ClientsActionCenter.tsx                → bloc "Priorités du jour" + compteurs informatifs
  clients/ClientsActionsPanel.tsx                → panneau latéral "Toutes les actions"
  clients/ClientsCollaboratorContext.tsx         → bloc Collaborateur Kadria dédié à la page Clients
  clients/clients-action-icons.tsx               → mapping icône (config) → composant lucide-react
```

## Source de données

`/api/clients` reste l'unique source de vérité. Le centre d'actions est dérivé
côté serveur, dans la même requête, à partir de la liste `items` **complète et
tenant-scopée déjà agrégée** (avant filtrage utilisateur, avant pagination) :

```
items = aggregateClientList(...)         // inchangé, batch, tenant-scopé
allActions = deriveClientActions(items)  // pur, déterministe, aucun appel réseau
response.actions = {
  items: topClientActions(allActions),   // 5 actions max pour le bloc compact
  summary: summarizeClientActions(allActions),
}
```

Ce choix correspond à l'option 1 du brief (« enrichir proprement le `summary`
de `/api/clients` ») : aucune seconde route n'a été nécessaire. `response.actions`
est calculé indépendamment des filtres actifs sur la liste (quickFilter,
recherche, tri) : il reflète toujours l'intégralité du portefeuille du tenant,
jamais uniquement la page courante affichée dans le tableau.

`deriveClientActions` ne recalcule aucun agrégat métier : il lit uniquement les
champs déjà produits par `aggregateClientList` (`attentionReason`,
`latestProject`, `nextAppointment`, `lastInteractionAt`, `totalQuotedAmount`).

## Hiérarchie des priorités

Centralisée dans `clients-action-config.ts` (`CLIENT_ACTION_PRIORITY_ORDER`) :

1. `appointment_change_requested` — Modification demandée — **critical**
2. `project_to_call_back` — À rappeler — **high**
3. `appointment_awaiting_confirmation` — Rendez-vous à confirmer — **medium**, promu **critical** si le rendez-vous est dans moins de 48h (`deriveClientActions`)
4. `quote_pending_too_long` — Devis sans réponse — **high**
5. `possible_duplicate` — À rapprocher — **high**
6. `stale_active_project` — Dossier sans activité — **medium**
7. `client_follow_up` — Relance recommandée — **medium**
8. `legacy_unlinked` — Contact non lié — **low**

Le tri final combine priorité (critical > high > medium > low) puis rang dans
la hiérarchie ci-dessus, jamais uniquement une couleur.

## Catégories et compteurs

`ClientActionsSummary` (retourné dans `response.actions.summary`) : `total`,
`callbacks`, `quotesWaiting`, `appointmentsToConfirm`, `appointmentChanges`,
`contactsToReconcile`, `staleProjects`, `followUps`. Les compteurs de la
rangée compacte affichent 5 catégories : À rappeler, Devis sans réponse,
Rendez-vous à confirmer, Modifications demandées, À rapprocher —
`stale_active_project`, `client_follow_up` et `legacy_unlinked` ne saturent
pas la rangée de chips, conformément au §20 (« le Centre d'actions ne doit
pas être dominé par les contacts legacy »).

**Hotfix Lot 9.5** : ces compteurs sont **purement informatifs**. Ils ne
sont plus des boutons — ils ne modifient jamais `attentionReason`, ne
déclenchent aucun fetch, ne changent pas la pagination, n'exposent aucun
`aria-pressed`, ne sont pas focusables et n'ont pas de curseur pointeur
(rendus en `<span>`, jamais en `<button>`, voir `CounterChip` dans
`ClientsActionCenter.tsx`). Avant ce hotfix ils filtraient la liste Clients
via `attentionReason` sans que les cartes de priorités ne reflètent
visuellement l'effet du clic — ce comportement a été retiré. Le filtrage par
catégorie d'action reste possible, mais uniquement depuis le panneau
« Toutes les actions » (état local indépendant, voir plus bas).

## KPI existants rendus interactifs

- **Total clients** → réinitialise toute la segmentation (`resetAll`).
- **Clients actifs** → bascule `quickFilter = 'active'` (→ `active=true`).
- **À traiter** → bascule `quickFilter = 'attention'` (→ `attention=true`).
- **Récurrents** → bascule `quickFilter = 'recurring'` (→ `recurring=true`).
- **Valeur gagnée** → bascule `sort = 'acceptedValue'`, `order = 'desc'` (tri, pas un filtre inventé).

Chaque carte KPI est un `<button>` avec `aria-pressed`, focus clavier visible,
curseur explicite et état actif (bordure + halo emerald), sans changer sa
densité visuelle de façon criarde.

## Filtrage par motif d'attention

Nouveau paramètre serveur `attentionReason` sur `GET /api/clients` :

- Valeurs acceptées : les 8 valeurs de `ClientActionReason` (`clients-action-types.ts`, export `CLIENT_ACTION_REASONS`).
- Valeur invalide → `400 { success: false, error: 'Motif d’attention invalide' }`.
- Appliqué dans `filterClientList` **avant** pagination, composable avec `active`, `source`, `q`, `status`, `hasAppointment`.
- Ne détourne pas `status` : c'est un filtre indépendant, dédié.
- Aucune valeur technique n'est jamais affichée : l'UI n'affiche que `CLIENT_ACTION_CONFIG[reason].categoryLabel`.

Tests dédiés : `src/lib/clients/__tests__/clients-action-center.test.ts`
(`npm run test:clients-action-center`).

## Prochaine action recommandée (CTA)

Mapping centralisé dans `clients-action-config.ts` (`ctaLabel` par raison),
conforme au §10 : "Traiter la demande", "Confirmer le rendez-vous", "Relancer
le client", "Ouvrir le dossier", "Reprendre le suivi", "Préparer la relance",
"Examiner le contact", "Ouvrir le dossier" (legacy, si un dossier existe).

`deriveClientActions` ne produit **jamais** d'action pour un client canonique
sans dossier (`latestProject === null`), sauf `legacy_unlinked` (par nature
sans client canonique) et `possible_duplicate` (l'action porte sur le contact,
pas sur un dossier). Aucun bouton n'est donc rendu sans effet réel : soit il
ouvre `href` (`/dashboard-v2/projet/[id]`), soit — pour `possible_duplicate` —
il applique le filtre `attentionReason=possible_duplicate` sur la liste
(examen du contact, jamais de fusion). Cette action reste un comportement de
**carte d'action** (clic sur son CTA), pas des compteurs de synthèse — voir
le hotfix Lot 9.5 ci-dessus.

## Panneau « Toutes les actions »

`ClientsActionsPanel` (sheet latérale droite sur desktop ≥ 640px, plein écran
sur mobile, réutilise le pattern `motion/react` + overlay déjà utilisé par
`InviteDrawer`) : liste complète des actions dérivées, filtre par catégorie
(chips), tri priorité/échéance, clic sur une carte → ouvre le dossier ou
applique le filtre de liste puis referme le panneau. Fermeture via Échap,
clic sur l'overlay, ou bouton dédié ; le scroll de la page est bloqué pendant
l'ouverture.

Le filtre par catégorie du panneau (`category`, état local `useState`
interne à `ClientsActionsPanel`) est **indépendant** de
`attentionReasonFilter`/`activeReason` de `ClientsV2List` : il ne filtre que
la liste d'actions affichée dans le panneau, jamais la liste Clients
principale, et ne déclenche aucun fetch vers `/api/clients`.

## Intégration Collaborateur Kadria

`ClientsCollaboratorContext.tsx` affiche, sur la page Clients uniquement, un
bloc « Aujourd'hui » avec une synthèse déterministe (ex. « 2 clients à
rappeler, 1 devis sans réponse… ») et une recommandation basée sur la première
action prioritaire réelle (« Commencez par Thomas Martin : modification
demandée. »). Aucune donnée fictive, aucun appel LLM supplémentaire — toutes
les phrases sont construites à partir de `response.actions`.

**Limite assumée** : `KadriaCollaboratorPanel` (le panneau global, colonne
droite du workspace) garde son résumé statique par `WorkspaceMode`
(`collaboratorContexts.clients`) car il n'a pas d'architecture pour recevoir
un contexte dynamique par page dans ce lot ; y injecter cette synthèse
demanderait de faire transiter des données Clients à travers
`WorkspaceNavigationContext`, ce qui touche un composant partagé
inter-pages. Le composant `ClientsCollaboratorContext` couvre la même intention
produit directement dans la page et documente ce point d'intégration futur.

## Réduction du bandeau supérieur

Le bandeau noir « Dossiers clients » (rendu dans `ArtisanDashboard.tsx`, juste
au-dessus de `<ClientsV2List />` en vue desktop) a été supprimé : il n'existe
plus qu'un seul en-tête (celui de `ClientsV2List`, avec breadcrumb "PORTFOLIO
CLIENTS", titre "Clients", sous-titre).

## Densité du tableau

- Ligne entière cliquable (rôle `button`, focus clavier, `Enter`/`Espace`)
  uniquement si un dossier existe (`latestProject`), sinon aucune interaction
  parasite.
- Le bouton "Ouvrir" devient un chevron secondaire (icône) avec
  `aria-label` explicite, `stopPropagation` pour ne pas déclencher deux
  navigations.
- Une seule raison d'attention affichée par ligne (`<Attention>`, déjà limité
  à `client.attentionReason`, un seul motif calculé côté agrégation).
- Colonne Client resserrée, email affiché en second (téléphone retiré de
  l'aperçu principal pour ne pas être plus visible que le nom).

## Client sans dossier / contact non lié

- Un client canonique sans dossier reste visible en liste/KPI, mais ne génère
  aucune action artificielle (voir §"Prochaine action recommandée").
- `possible_duplicate` → catégorie "À rapprocher", action "Examiner le
  contact" (filtre, jamais de bouton "Fusionner").
- `legacy_unlinked` → catégorie "Contact non lié", priorité basse par défaut,
  navigation vers le dossier existant si disponible ; volontairement exclu de
  la rangée de compteurs rapides pour ne pas dominer le centre d'actions.

## États vides / erreurs

- Aucune action : "Tout est sous contrôle" / "Aucun client ne nécessite
  d'action immédiate.", icône `ShieldCheck`, liste clients toujours visible.
- Catégorie vide dans les compteurs : chip atténuée (compteur 0, ton neutre),
  jamais interactive de toute façon (compteurs purement informatifs, Lot 9.5).
- Chargement : skeletons dédiés dans `ClientsActionCenter` (pas de compteur à
  0 pendant le fetch — `summary` reste `null` tant que la réponse n'est pas
  arrivée).
- Échec réseau : "Les priorités ne sont pas disponibles pour le moment." sans
  casser la liste clients existante (qui garde son propre état d'erreur).

## Responsive & accessibilité

- KPI en grille 2 colonnes (mobile) → 5 colonnes (desktop), inchangé dans sa
  structure de grille, hauteur réduite (`p-3.5` au lieu de `p-4`, valeur en
  `text-lg`).
- Bloc "Priorités du jour" : liste verticale compacte partout, 5 actions
  visibles max ; le lien "Voir toutes les actions" ouvre le panneau plutôt
  qu'une nouvelle page.
- Compteurs en rangée horizontale scrollable (`overflow-x-auto`) pour éviter
  tout débordement sur tablette/mobile.
- Compteurs de « Priorités du jour » : `<span>` non interactifs, aucun rôle
  `button`, aucun `tabIndex`, aucun `aria-pressed` (Lot 9.5). `aria-pressed`
  reste utilisé sur les filtres réellement interactifs : KPI du portefeuille
  et chips de catégorie du panneau « Toutes les actions ». Rôle
  `button`/`dialog` corrects sur ces éléments interactifs, focus visible
  partout, priorité jamais encodée uniquement par la couleur (icône +
  libellé texte systématiques), `useReducedMotion` de `motion/react`
  respecté (import `motion/react`, jamais `framer-motion`).

## Tests

- `npm run test:clients-v2-list` — inchangé, toujours vert (aucune régression
  sur l'agrégation/le filtrage existants).
- `npm run test:client-resolution` — inchangé, toujours vert.
- `npm run test:clients-action-center` (nouveau) — couvre : les 8 valeurs de
  `attentionReason` acceptées, une valeur invalide ignorée sans throw côté
  fonction pure (le rejet HTTP 400 est géré dans la route), composition avec
  `active`/recherche, hiérarchie de priorité (modification de RDV devant
  confirmation/devis), legacy sans dossier, client canonique sans dossier
  jamais actionné, absence d'action (portefeuille calme), plafond de 5
  actions dans le bloc compact, cohérence des compteurs avec l'ensemble
  dérivé complet (jamais une page).

**Limite assumée** : le dépôt n'a pas d'infrastructure de test de composants
React (pas de Jest/Vitest/Testing Library configuré, aucun fichier
`*.test.tsx` existant). La couverture UI de ce lot porte donc sur la logique
pure (dérivation, tri, formatage, filtre serveur), qui est ce qui détermine
réellement le contenu et l'ordre affichés ; le rendu React lui-même n'a été
vérifié que par lecture de code, `tsc --noEmit` et `next build`.

## Recette sur le dataset réel

**Limite assumée** : cet environnement d'exécution ne dispose d'aucune
variable d'environnement Supabase (`.env.local` absent, aucune clé
`SUPABASE_*`) ni de session authentifiée réelle. Il n'a donc pas été possible
de lancer le serveur dev contre la base réelle et de naviguer sur `/clients`
en tant qu'utilisateur authentifié pour cette mission. La vérification a donc
été faite par :

1. Lecture complète du code d'agrégation existant (`client-list-aggregation.ts`)
   qui produit déjà, sans modification de ce lot, les `attentionReason` pour
   les 5 clients cités dans le brief (RDV à confirmer, contact non lié, RDV à
   confirmer, modification de RDV demandée, devis sans réponse).
2. Un test dédié (`appointment_change_requested outranks appointment_awaiting_confirmation
   and quote_pending_too_long`) qui rejoue exactement ce scénario de priorité
   relative avec un jeu de données équivalent (un client avec RDV modifié, un
   avec RDV en attente, un avec devis ancien) et vérifie que l'action de
   modification de RDV sort en premier.
3. `tsc --noEmit`, la suite de tests complète et `next build` sans erreur,
   garantissant que le code déployé compile et s'exécute sans référence à des
   données inventées.

Une recette authentifiée sur le tenant réel (`6392ae57-f34b-48ac-92ca-7faf848b5582`,
voir `docs/CLIENTS_V2_TEST_DATA_RESET.md`) reste à faire en environnement
disposant des identifiants Supabase, avant mise en production.

**Hotfix Lot 9.5** : même limite d'environnement (pas de credentials
Supabase en sandbox). Vérification faite par lecture de code
(`ClientsActionCenter.tsx`, `ClientsV2List.tsx`, `ClientsActionsPanel.tsx`),
tests structurels dédiés (`clients-action-center.test.ts` : le
`CounterChip` est un `<span>` sans `onClick`/`aria-pressed`/`tabIndex`, le
wiring `activeReason`/`onToggleReason` a disparu de `<ClientsActionCenter>`,
le panneau garde un état `category` local indépendant), `tsc --noEmit`,
`next build` et un survol Playwright de la page publique (pas de session
authentifiée disponible, donc pas de vérification de l'écran `/clients` réel
lui-même — même limite que les Lots 9 et 9.4/9.5 précédents).

## Limites et préparation du Lot 10

- `client_follow_up` est un motif d'attention documenté et filtrable, mais
  n'est produit par aucune règle dans `chooseAttention()`
  (`client-list-aggregation.ts`) : ce lot n'a pas touché à cette logique
  d'agrégation (hors périmètre explicite du brief). Le Lot 10 pourra
  introduire la règle métier qui déclenche ce motif si besoin.
- La fiche client est désormais livrée par le Lot 10 sous
  `/dashboard-v2/clients/[id]` (voir `docs/CLIENTS_V2_DETAIL.md`), avec sa
  propre « prochaine action » qui réutilise `clients-action-config.ts` à
  l'échelle d'un seul client. La fusion effective de contacts, l'envoi
  automatique de SMS/e-mail et tout scoring IA restent hors périmètre et n'ont
  pas été touchés.
- L'intégration complète du Centre d'actions dans le panneau `KadriaCollaboratorPanel`
  global (plutôt que le bloc dédié `ClientsCollaboratorContext`) est
  documentée ci-dessus comme travail préparatoire pour un lot futur.
