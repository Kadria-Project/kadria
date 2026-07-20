# Suppression contrôlée d’`ArtisanDashboard`

Date : 20 juillet 2026.

## Résultat

`src/components/ArtisanDashboard.tsx` est supprimé. Aucune route produit ne le monte et aucun import runtime vers le monolithe ou ses vues mobiles legacy ne subsiste.

## Fichiers supprimés

- `src/components/ArtisanDashboard.tsx` ;
- `src/components/dashboard/MobileDashboardView.tsx` ;
- `src/components/dashboard/MobileDevisView.tsx` ;
- `src/components/dashboard/MobileDossiersView.tsx` ;
- `src/components/dashboard/MobilePipelineView.tsx` ;
- `src/components/dashboard/MobileValueReportView.tsx` ;
- `src/components/dashboard/MobileAgendaView.tsx` ;
- `src/components/dashboard/OperationsCenterSection.tsx` ;
- `src/components/workspace/tracking/LivingPipeline.tsx` ;
- `src/components/workspace/tracking/CommercialStatusBadges.tsx` ;
- `src/components/workspace/tracking/tracking-utils.ts` ;
- `src/components/workspace/tracking/tracking-types.ts` ;
- `src/components/workspace/tracking/commercial-situations.ts` ;
- `tracking-rich-pipeline.test.ts` et `commercial-situations.test.ts` ;
- les modules temporaires d’extraction `project-presentation.ts`, `value-source.ts` et `dashboard-filter-types.ts` : ils n’avaient plus de consommateur après retrait des vues mobiles et ne sont donc pas conservés comme compatibilité legacy.

`CalendarWorkspace`, `ClientsV2List`, `TasksWorkspace`, les APIs et `.dashboard-shell` sont conservés : ils ont des consommateurs produits hors monolithe.

## Dépendances extraites puis retirées

Le premier commit a isolé `Project`, `DashboardMode`, `FilterState`, `formatCurrency`, `normalizeValueSource`, `BADGE_STYLES`, `opportunityScore` et `calcDelta` afin de détacher les vues mobiles compilées du monolithe. Ces vues n’avaient aucun parent de route actif ; elles ont ensuite été supprimées, donc aucune couche de compatibilité n’est laissée dans le dépôt.

## Règles Suivi conservées

Le builder `tracking-brief-builder.ts` conserve les règles compatibles avec le contrat compact : devis envoyé sans décision, rappel manquant, dossier incomplet et inactivité. La règle legacy fondée sur plusieurs ouvertures de devis (`confirm_interest`) n’est pas migrée : le compteur d’ouvertures ne fait pas partie du contrat Tracking et ne doit pas être présenté comme une conclusion commerciale certaine.

## Tests et gardes adaptés

- `agenda-plan-access.test.ts` ne lit plus le fichier supprimé ; il contrôle uniquement l’entrée Agenda active.
- Les gardes Home, À faire et Suivi vérifient maintenant l’absence physique de `ArtisanDashboard.tsx` ainsi que l’absence dans leurs graphes d’imports.
- Le test de pipeline historique a été supprimé : il attendait encore `deriveCommercialSituations` dans `TrackingWorkspace`, incompatible avec le contrat Tracking autonome.
- Un test Home vérifie la normalisation statique de `?mode=calendar` et `?agenda=` vers Agenda.

## Redirections legacy

`/dashboard-v2` conserve les redirections `?view=` et `?tab=`. Les paramètres `?mode=calendar` et `?agenda=` sont désormais normalisés vers `/dashboard-v2/agenda`, sans recréer un mode legacy dans Accueil.

## Validations

À exécuter avant livraison : tests Home, Tasks, Tracking et Agenda ; lint ciblé ; `npx tsc --noEmit` ; `git diff --check` ; build production. La compilation TypeScript a passé après suppression avant la validation finale complète.

## Occurrences résiduelles

Les seules occurrences `ArtisanDashboard` restantes sont les gardes architecturales, les documents historiques/audits et un commentaire historique dans `DesktopAgendaView.tsx`. Aucune occurrence runtime n’est admise.

## Limites de recette

La preuve statique et les validations automatisées ne remplacent pas une session authentifiée. Après déploiement, vérifier `/dashboard-v2`, `/a-faire`, `/suivi`, `/agenda`, `/clients`, `/performance`, les navigations desktop/mobile et les redirections legacy. Aucune recette authentifiée n’est exécutée par ce lot local.
