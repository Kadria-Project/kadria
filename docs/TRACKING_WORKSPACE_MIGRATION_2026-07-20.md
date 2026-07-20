# Migration du workspace Suivi

## Architecture

Avant : `/dashboard-v2/suivi` montait `ArtisanDashboard`, chargeait les projets complets et Operations Center, puis reconstruisait et filtrait le suivi commercial dans le navigateur.

Après : `/dashboard-v2/suivi` → `KadriaAppShell` → `TrackingWorkspaceRoute` → `/api/tracking-brief` → `TrackingWorkspace`.

La page et l’endpoint déclarent `dynamic = 'force-dynamic'`. La session, le tenant, Supabase et les règles de sélection restent exécutés au runtime serveur.

## Mission et frontières

Suivi aide à faire progresser des dossiers concrets. Il ne reprend ni le workbench immédiat d’À faire, ni la synthèse quotidienne d’Accueil, ni les KPI, tendances ou graphiques de Performance.

## Contrat final

`TrackingBrief` contient uniquement `generatedAt`, `dataQuality` et `opportunities`. Une opportunité contient les faits observés, le niveau de preuve, les réserves, le blocage, les informations manquantes, la recommandation et une destination.

Sont exclus : projets, clients, devis, rendez-vous et historiques complets ; KPI ; graphiques ; données Performance ; règles métier brutes et scores opaques.

## Règles de sélection

Les opportunités sont calculées côté serveur à partir de champs projet ciblés : devis envoyé sans acceptation, dossier qualifié sans rappel, complétude inférieure à 60 %, ou absence d’activité commerciale depuis au moins dix jours. Le classement privilégie la force de preuve puis la durée de stagnation ; il est limité à 12 opportunités.

Les faits directement datés ou enregistrés sont `strong`. Une complétude insuffisante est `moderate`. L’inactivité est `weak` et toujours accompagnée d’une réserve : elle peut signaler un ralentissement sans démontrer un abandon. Aucun score commercial n’est exposé comme conclusion.

## Isolation et performance

L’endpoint sélectionne seulement les colonnes nécessaires à ces règles, au plus 120 projets, applique session, tenant et permissions côté serveur, et ne charge ni événements, ni Performance, ni workbench Tasks, ni clients exhaustifs. Les données partielles et permissions réduites sont déclarées dans `dataQuality`.

## Garde et validations

`autonomous-tracking-route.test.ts` parcourt le graphe d’imports de `/dashboard-v2/suivi`, interdit `ArtisanDashboard` et vérifie l’appel exclusif à `/api/tracking-brief`.

`tracking-brief.test.ts` couvre contrat strict, réponse nominale, réponse vide, état partiel, état insuffisant, preuve, absence de données interdites et limite de 12 opportunités. L’absence de session (401) et l’erreur serveur (500) sont gérées par l’endpoint ; elles restent à tester avec un mock de route authentifiée.

Limites de recette : aucune recette authentifiée ni validation visuelle navigateur n’a été réalisée.
