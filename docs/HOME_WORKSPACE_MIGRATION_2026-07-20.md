# Migration de l’accueil autonome

## Architecture

Avant : `/dashboard-v2` montait `ArtisanDashboard`, qui chargeait les projets, événements, usage, configuration et Operations Center pour l’ensemble du dashboard.

Après : `/dashboard-v2` → `KadriaAppShell` → `HomeWorkspaceRoute` → `/api/home-brief` → `HomeWorkspace`.

`/dashboard-v2` et `/api/home-brief` déclarent `dynamic = 'force-dynamic'`. La session, le tenant, Supabase et le calcul du brief ne peuvent donc être exécutés ni à la compilation ni à la génération statique. Le client appelle l’endpoint après hydratation ; son bundle importe uniquement le composant et les types de contrat.

## Contrat final

`HomeBrief` ne contient que `generatedAt`, `situation`, `attention` (trois éléments maximum), `opportunity`, `risk` et `canWait`. Chaque situation contient le fait observé, le niveau de preuve, l’explication, la conséquence, la recommandation et la destination.

Le contrat interdit les listes de projets, KPI, événements, données Performance, historiques complets et données Clients ou Agenda hors besoin du brief.

## Performance structurelle

L’endpoint sélectionne uniquement les colonnes de dossiers utiles à la recommandation, au plus 80 dossiers et 80 rendez-vous. Il ne renvoie ni liste de projets, ni événements, ni KPI, ni données d’usage, ni agrégat Performance. Les calculs de priorité restent côté serveur.

## Garde architecturale

`src/components/workspace/home/__tests__/autonomous-home-route.test.ts` parcourt les imports de l’accueil et échoue si `ArtisanDashboard` redevient une dépendance. Le même test contrôle que le client ne consomme que `/api/home-brief`.

`home-brief-contract.test.ts` vérifie le payload nominal (clés strictes et trois priorités maximum), le contrat vide, une analyse partielle, ainsi que les branches d’absence de session (401) et d’erreur serveur (500).

## Validations du 20 juillet 2026

- Tests Home : 9/9 réussis.
- Garde architecturale : 2/2 réussis.
- `npx tsc --noEmit` : réussi.
- Lint ciblé : réussi.
- `git diff --check` : réussi.
- `npm run build` : réussi après suppression de `.next`, en 70,58 s au total : compilation Turbopack 25,4 s ; vérification TypeScript 39,3 s ; génération des 161 pages statiques 1,5 s ; finalisation réussie.

## Limites restantes

Aucune recette authentifiée ni validation visuelle navigateur n’a été exécutée. Les validations automatisées et le build production complet sont réussis.
