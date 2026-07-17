# Clients V2 — Fiche Client (Lot 10)

## Objectif

`/dashboard-v2/clients/[id]` est le hub CRM d'un client **canonique** (table
`clients`). Elle répond à « quelle est toute mon histoire avec ce client et
que dois-je faire maintenant ? » sans dupliquer la logique des dossiers,
devis, agenda ou portail — elle les agrège et pointe vers eux.

## Route et choix d'architecture

Route retenue : **`app/dashboard-v2/clients/[id]/page.tsx`**, pas
`app/clients/[id]/page.tsx` littéral du brief. Toutes les pages Clients V2
existantes (Lots 8/9/9.5, `ClientsV2List`) vivent sous `/dashboard-v2` et sont
client-fetched — il n'y a pas de route `/clients` racine dans ce repo. Rester
cohérent avec `/dashboard-v2/projet/[id]` limite le risque de régression sur
la navigation existante.

Le composant serveur `page.tsx` vérifie la session (`getSession()`, redirige
vers `/login` sinon) puis délègue tout le data-fetching au composant client
`ClientDetailWorkspace` (`src/components/dashboard/clients/ClientDetailWorkspace.tsx`),
qui appelle `GET /api/clients/[id]`. Ce pattern (auth côté serveur minimal +
fetch client) est celui déjà utilisé par `/dashboard-v2/projet/[id]`.

Pas de `loading.tsx`/`error.tsx`/`not-found.tsx` App Router dédiés : comme le
reste du dashboard, le chargement/erreur/404 sont gérés en state React dans
le composant client (skeletons structurés, `ErrorState`), cohérent avec
l'existant.

## API — `GET /api/clients/[id]`

`app/api/clients/[id]/route.ts`.

Sécurité tenant :
- Session requise (`getCurrentTenantContext()`), 401 sinon.
- Le tenant vient **uniquement** du contexte de session, jamais de l'URL.
- La requête `clients` filtre `id` **et** `tenant_id`. Un client d'un autre
  tenant produit exactement la même réponse `404` qu'un client inexistant —
  aucune différence de code/latence/payload ne permet d'énumérer les clients
  d'un autre tenant.

Lectures batch (zéro N+1) :
1. `clients` (1 ligne, id+tenant).
2. `Projects` où `client_id = :id` (1 requête).
3. Si `projects` est vide : **aucun** appel `.in('project_id', [])` — les
   tableaux `quotes/appointments/activities/events` sont directement vides et
   la fiche reste affichée (règle client sans projet).
4. Sinon, en parallèle (`Promise.all`, une requête par table) : `Devis`,
   `project_appointments`, `Activity`, `ProjectClientEvents` sur l'ensemble
   des `project_id` du client.

`PATCH /api/clients/[id]` (édition légère, voir plus bas) suit la même
vérification tenant, valide/normalise email et téléphone
(`client-normalization.ts`), détecte les conflits d'email/téléphone
normalisés au sein du tenant, et **ne touche jamais** aux lignes `Projects`
(snapshots historiques).

## Contrat de données

`src/lib/clients/client-detail-types.ts` : `ClientDetail` avec `client`
(identité), `summary`, `commercialSummary`, `nextAction`, `nextAppointment`,
`projects[]`, `quotes[]`, `appointments[]`, `timeline[]`. Chaque sous-type
(`ClientProjectSummary`, `ClientQuoteSummary`, `ClientAppointment`,
`ClientTimelineEvent`, `ClientNextAction`) est explicite — pas de
`Record<string, unknown>` dans le contrat exposé à l'UI.

## Agrégation serveur

`src/lib/clients/client-detail-aggregation.ts` (pur, testé) :
- `buildClientIdentity` : particulier vs entreprise, jamais le même libellé
  deux fois (`companyName` en titre, `contactName` seulement si distinct).
- `buildClientProjects` : trie actifs d'abord puis date récente, calcule le
  montant accepté par dossier, la prochaine échéance et la dernière activité.
- `buildClientQuotes` / `buildClientAppointments` : filtrent les lignes dont
  le `project_id` ne correspond à aucun projet du client (défense anti
  orpheline / anti fuite inter-tenant).
- `buildClientSummary` / `buildCommercialSummary` : compteurs et synthèse
  commerciale (§ ci-dessous).
- `deriveClientNextAction` : réutilise **exactement** la hiérarchie de
  raisons du Centre d'actions CRM (Lot 9.5, `clients-action-config.ts`) —
  `appointment_change_requested` > `project_to_call_back` >
  `appointment_awaiting_confirmation` > `quote_pending_too_long` >
  `stale_active_project` — à l'échelle des projets d'un seul client, pour ne
  jamais afficher une règle différente de la liste Clients.

## Timeline

`src/lib/clients/client-timeline.ts` (pur, sans dépendance à l'ordre
Supabase) :
- Normalise `Projects` (création/mise à jour), `Activity`,
  `ProjectClientEvents`, `Devis` (envoyé/accepté), `project_appointments`
  (créé/confirmé/modification demandée) en `ClientTimelineEvent` commun avec
  un `tone` (neutral/info/success/warning/danger) et un titre humain — jamais
  un code technique brut (`quote_sent_at`, `appointment_change_requested`…
  sont traduits).
- Ignore silencieusement (`onOrphan` callback, loggé sans PII) toute ligne
  dont le `project_id` ne correspond à aucun projet chargé pour ce client.
- Ignore toute date invalide/manquante sans planter.
- Déduplique par `titre + projet + minute` : une même action journalisée
  dans deux tables (ex. devis envoyé dans `Devis` et `Activity`) n'apparaît
  qu'une fois.
- Trie explicitement du plus récent au plus ancien.
- L'API renvoie jusqu'à 200 événements dans le même payload (volume artisan
  actuel raisonnable) ; au-delà, une pagination dédiée à l'onglet Historique
  serait nécessaire — non implémentée dans ce lot (documenté comme limite).

## En-tête, KPI, prochaine action

- En-tête : avatar déterministe, nom (société en titre pour une entreprise,
  contact en sous-titre), statut, ville, ancienneté, badge « Client
  récurrent » si ≥2 dossiers. CTA principal contextuel : prochaine action →
  son CTA ; sinon dossier actif → « Ouvrir le dossier actif » ; sinon **aucun
  bouton "Créer un dossier"** (voir § Création de dossier, reportée).
- KPI compacts (rangée desktop / grille 2 colonnes mobile) : Dossiers,
  Dossiers actifs, Chantiers gagnés, Valeur gagnée, Devis en attente,
  Prochain RDV — tous dérivés du contrat serveur, "Dossiers" et "Devis en
  attente" et "Prochain RDV" sont des raccourcis d'onglet.
- Prochaine action : carte unique en haut de l'onglet Vue d'ensemble, état
  neutre explicite (« Aucun suivi urgent — la relation client est à jour »)
  si `nextAction` est `null`.

## Onglets

`Vue d'ensemble / Dossiers / Devis / Rendez-vous / Historique`, pilotés par
`?tab=` (`router.replace(..., { scroll:false })`, pas de rechargement). Les
coordonnées restent dans la colonne latérale, jamais en onglet.

- **Vue d'ensemble** : prochaine action, 3 derniers dossiers, 2 devis en
  attention, 3 dernières interactions ; colonne latérale = coordonnées,
  prochain RDV, synthèse commerciale. CTA « Voir tout » vers chaque onglet.
- **Dossiers** : tous les projets du client, filtres locaux
  Tous/Actifs/Gagnés/Perdus (pas de pagination — volume artisan), tri actif
  d'abord puis récence, adresse chantier (`Projects.site_address`, jamais
  confondue avec l'adresse client canonique).
- **Devis** : tous les devis des projets du client (les snapshots ne sont pas
  comptés comme devis indépendants — seule la table `Devis` est lue), statut
  humain (Accepté/Refusé/En attente/Brouillon), montant TTC, dates
  envoi/acceptation, lien vers le dossier.
- **Rendez-vous** : à venir / passés, couleurs Agenda réutilisées (vert
  confirmé, ambre en attente, orange modification demandée, rouge/atténué
  annulé).
- **Historique** : timeline complète (jusqu'à 200 événements), icône/ton par
  type, lien dossier si pertinent.

## Synthèse commerciale

Valeur devisée totale, valeur acceptée, taux de conversion
(`acceptedQuoteCount / quoteCount`, affiché seulement si `quoteCount > 0`),
panier moyen gagné (`acceptedAmount / wonProjectCount`, affiché seulement si
`wonProjectCount > 0`), dernière interaction. Aucun score IA, aucune
métrique sur-vendue sur petit échantillon (les deux ratios sont simplement
masqués si le dénominateur est nul).

## Entreprises

`companyName` = titre principal. Le nom du contact (`firstName lastName`)
n'apparaît en sous-titre que s'il est distinct du nom de société — jamais
« SCI Horizon / SCI Horizon ».

## Client sans projet

Jamais de `404` du seul fait de l'absence de projet. La fiche affiche
l'identité, les coordonnées, le statut, `0` partout, aucun rendez-vous, et
une timeline vide (pas de fausse activité inventée).

## Legacy

`/dashboard-v2/clients/[id]` ne concerne **que** les clients canoniques
(table `clients`). Les entrées legacy (regroupées uniquement en mémoire par
`aggregateClientList`, id `legacy:<hash>`) continuent d'ouvrir leur dernier
dossier (`/dashboard-v2/projet/[id]`) depuis `ClientsV2List` — aucun id
legacy n'est jamais passé à `/dashboard-v2/clients/[id]`, qui n'a d'ailleurs
aucun moyen de le résoudre (la table `clients` ne contient que des lignes
canoniques).

`src/components/dashboard/ClientsV2List.tsx` : `canOpenClient()` retourne
`true` pour un canonique même sans projet (la fiche existe toujours) et pour
un legacy seulement s'il a un dossier. Un nouveau prop optionnel
`onOpenClient(clientId)` route les clics canoniques vers la fiche ; à défaut
de ce prop, le composant retombe sur l'ancien comportement (ouverture du
dernier dossier) pour rester rétrocompatible avec d'éventuels appelants non
mis à jour. `ArtisanDashboard.tsx` passe désormais ce prop aux deux usages de
`ClientsV2List` (`router.push('/dashboard-v2/clients/' + id)`).

## Édition

`PATCH /api/clients/[id]` est **livré** dans ce lot (pas de bouton préparé
mais désactivé) : prénom, nom, société, email, téléphone, adresse (lignes 1
et 2), code postal, ville, statut. Validation/normalisation via
`client-normalization.ts` (déjà utilisé par la résolution Clients V2),
détection de conflit d'email/téléphone normalisé au sein du tenant (409),
garde-fou sur la contrainte d'identité (`clients_identity_check` : au moins
un de prénom/nom/société), et **aucune** mise à jour en masse des snapshots
`Projects`. **Non livré dans ce lot** : aucune UI de formulaire d'édition
dans `ClientDetailWorkspace` (l'écran est en lecture seule) — le PATCH est en
place côté API pour un lot d'UI ultérieur, mais aucun bouton "Modifier" n'est
affiché puisque son flux complet (formulaire, retours d'erreur inline) n'est
pas livré ici. Documenté comme report explicite, cf. § Limites.

## Responsive et accessibilité

- Desktop : header → KPI → onglets → contenu + colonne latérale.
- Mobile/tablette : KPI en grille 2 colonnes, onglets scrollables
  horizontalement, cartes empilées au lieu de tableaux comprimés, colonne
  latérale sous le contenu.
- `role="tablist"/"tab"/"tabpanel"`, `aria-selected`, `aria-controls`, focus
  clavier sur les onglets et les lignes cliquables, actions `tel:`/`mailto:`
  explicites, boutons de copie avec `aria-label`.

## Performance

Une requête par table (`clients`, `Projects`, `Devis`,
`project_appointments`, `Activity`, `ProjectClientEvents`), agrégation en
mémoire côté route. Pas de `.in(..., [])`, pas de requête par projet, pas de
PDF/photo dans le payload.

## Logs

`[CLIENTS_V2][DETAIL_LOADED]`, `[CLIENTS_V2][DETAIL_NOT_FOUND]`,
`[CLIENTS_V2][DETAIL_FAILED]`, `[CLIENTS_V2][ORPHAN_RELATED_ROW]` avec
`tenantId`, `clientId`, `projectCount`, `durationMs` — jamais d'email,
téléphone, adresse ou contenu de message en clair. `DETAIL_FORBIDDEN` n'est
pas émis séparément : un accès inter-tenant est traité comme
`DETAIL_NOT_FOUND` (même log, même réponse) pour ne pas révéler qu'un id
existe dans un autre tenant.

## Tests

- `src/lib/clients/__tests__/client-detail-aggregation.test.ts` (10 tests) :
  identité particulier/entreprise (jamais de libellé dupliqué), tri des
  dossiers, filtrage des devis/orphelins, passé/futur des RDV, agrégats
  gagné/actif/perdu, synthèse commerciale (ratios masqués si dénominateur
  nul), priorité de la prochaine action, absence d'action si rien à traiter.
- `src/lib/clients/__tests__/client-timeline.test.ts` (6 tests) : tri, rejet
  des lignes orphelines, rejet des dates invalides, déduplication
  multi-source, traduction des codes techniques, libellé générique pour un
  type inconnu.
- `npm run test:client-detail` exécute les deux.
- Non-régression vérifiée : `test:clients-action-center`,
  `test:clients-v2-list`, `test:client-resolution` toujours au vert.

## Tests UI

Pas de framework React de test dans ce repo (confirmé aux lots précédents) —
aucun ajouté ici. La couverture UI passe par les fonctions pures ci-dessus
(rendu piloté par des données déjà testées) et par une relecture manuelle du
code de `ClientDetailWorkspace.tsx` (build + `tsc --noEmit` + ESLint au
vert). Recette live authentifiée non exécutée : pas de credentials Supabase
disponibles dans ce bac à sable (même limite que les lots précédents) — donc
pas de vérification effective de Michel Bernard / SCI Horizon / Jean Martin /
Claire Dupont / Élodie Petit / Sophie Leroy / Camille Laurent en conditions
réelles. Limite documentée honnêtement plutôt que simulée.

## Limites connues (documentées, hors périmètre de ce lot)

- Pas de fiche dédiée pour les contacts legacy (par design, § Legacy).
- Pas de fusion de doublons, pas de rattachement manuel legacy→client.
- Pas de multi-contact entreprise, pas d'import CSV, pas de campagnes.
- Pas d'UI de formulaire d'édition (PATCH prêt côté API, non branché dans
  cet écran — report explicite, aucun bouton "Modifier" affiché).
- Historique strictement dépendant des événements déjà enregistrés dans
  `Activity` / `ProjectClientEvents` / `Devis` / `project_appointments` —
  aucune reconstruction rétroactive.
- Timeline complète plafonnée à 200 événements par requête ; pagination
  dédiée non implémentée (volume artisan actuel jugé raisonnable).
- Aucune IA, aucune action automatique déclenchée depuis la fiche.
- Recette live non exécutée faute de credentials Supabase en sandbox.
