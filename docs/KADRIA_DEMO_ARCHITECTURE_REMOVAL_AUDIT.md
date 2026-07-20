# Audit et retrait de l'architecture de démonstration

**Date :** 20 juillet 2026
**Décision :** supprimée. Kadria ne conserve qu'une implémentation applicative : le produit réel.

## Cartographie avant retrait

## Périmètre exact du lot

### Fichiers supprimés

```text
app/admin/demo-access/page.tsx
app/api/admin/demo-access/[id]/route.ts
app/api/admin/demo-access/approve/route.ts
app/api/admin/demo-access/reject/route.ts
app/api/admin/demo-access/revoke/route.ts
app/api/admin/demo-access/route.ts
app/api/demo-access/approve/route.ts
app/api/demo-access/request/route.ts
app/api/demo-access/verify/route.ts
app/dashboard-demo/page.tsx
app/demo-dashboard/layout.tsx
app/demo-dashboard/page.tsx
app/demo-dashboard/onboarding/page.tsx
app/demo-dashboard/client/projet/[id]/page.tsx
app/demo-dashboard/projet/[id]/page.tsx
app/demo-dashboard/projet/[id]/devis/new/page.tsx
app/demo-dashboard/projet/[id]/devis/[devisId]/page.tsx
app/demo-parametres/page.tsx
app/demo/acces/page.tsx
app/site-demo/electricien/layout.tsx
app/site-demo/electricien/page.tsx
docs/SITE_VITRINE_ADDON.md
src/components/DemoArtisanDashboard.tsx
src/components/DemoCalendar.tsx
src/components/DemoToast.tsx
src/components/kadria-assistant/DemoKadriaAssistantWidget.tsx
src/components/notifications/DemoNotificationBell.tsx
src/components/site-vitrine/{CaseStudy,Faq,FinalCta,Gallery,Hero,Method,Prestations,ProjectIntake,Reviews,SchematicVisual,SectionShell,SiteFooter,SiteHeader,TrustBand,VitrineSite,Zone,motion}.tsx
src/components/ux-audit/LocalUxAuditToolbar.tsx
src/contexts/DemoModeContext.tsx
src/lib/demo-access.ts
src/lib/demo-assistant-data.ts
src/lib/demo-data.ts
src/lib/providers/{action-provider,data-provider,index,route-provider,types}.ts
src/lib/site-vitrine/{configs/ad-electricite,demo-context,theme,types}.ts
```

### Fichiers modifiés

```text
app/api/projects/route.ts
app/projet/page.tsx
app/robots.ts
middleware.ts
src/components/ArtisanDashboard.tsx
src/components/KadriaPages.tsx
src/components/admin/AdminSidebar.tsx
src/components/chat/ChatWidgetInline.tsx
src/components/dashboard/MobileDashboardView.tsx
src/components/settings/SettingsPageShell.tsx
src/config/__tests__/agenda-plan-access.test.ts
```

### Documents créés par ce lot

```text
docs/KADRIA_DEMO_ARCHITECTURE_REMOVAL_AUDIT.md
docs/KADRIA_RECETTE_TARGET_ARCHITECTURE.md
```

### Modifications exclues du commit

```text
src/components/workspace/KadriaAppShell.tsx
instrumentation-client.ts
src/components/workspace/NavigationPerformanceProbe.tsx
app/api/operations-center/route.ts
app/dashboard-v2/a-faire/page.tsx
app/dashboard-v2/a-faire/TasksWorkspaceRoute.tsx
app/dashboard-v2/a-faire/loading.tsx
src/components/workspace/tasks/TasksWorkspace.tsx
src/components/workspace/tasks/work-situations.ts
src/lib/tenant-context.ts
docs/NAVIGATION_PERFORMANCE_AUDIT_2026-07-20.md
docs/KADRIA_DESIGN_SYSTEM_CONFORMITY_MAP.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V1_1_SIGNATURE_EMOTION_LOIS_GRAMMAIRE.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V1_CONSTITUTION_VISUELLE.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V2_FOUNDATIONS.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V3_PRIMITIVES.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V4_PATTERNS.md
docs/KADRIA_PREMIUM_DESIGN_SYSTEM_V5_ARCHITECTURE_IMPLEMENTATION.md
```

### Routes supprimées puis redirigées

- `/dashboard-demo`
- `/demo-dashboard` et tous ses sous-chemins : onboarding, projet, devis et portail client de fixtures.
- `/demo/acces`, ancien portail d'accès au dashboard fictif.
- `/demo-parametres` et ses sous-chemins.
- `/site-demo/electricien` et ses sous-chemins : site artisan fictif et qualification simulée.

Toutes redirigent temporairement vers `/demander-une-demo` dans `middleware.ts`. Les chemins dynamiques sont couverts par préfixe. Cette compatibilité doit être réévaluée après mesure des liens entrants et du trafic ; elle pourra alors être supprimée avec les matchers correspondants.

### Éléments supprimés directement

- Le dashboard parallèle, le calendrier local, les fiches projet/devis/portail client de démonstration et le contexte `DemoModeContext`.
- Les fixtures `demo-data`, données assistant, providers de données/actions/routes démo et notifications/assistant/outils d'audit dépendant de la démo.
- Le mécanisme d'accès démo : page, APIs publiques et admin, bibliothèque de jetons/cookies, entrée de navigation admin et garde middleware.
- Le site vitrine fictif `AD Électricité`, ses composants/configurations et la branche `demoMode` qui simulait un dossier dans `/projet` et `/api/projects`.
- Le test qui inspectait le composant de démonstration et la documentation active du site vitrine fictif.

### Fonctionnalités uniquement présentes dans la démo

Les scénarios de fixtures, le calendrier local simplifié, les mutations en mémoire, le portail client fictif et le plan commercial artificiel ne sont pas portés dans le produit réel. Ils ne constituent pas une perte fonctionnelle : ils ne reposaient ni sur les données, ni sur les permissions, ni sur les intégrations de production.

### Éléments conservés intentionnellement

- `/demo`, `/demo-request`, `/demander-une-demo` et `/api/demo-request` : pages/formulaire marketing de demande de démonstration ; ils ne montent pas le produit simulé.
- `AssistantWebDemo` et `AssistantVocalDemo` : illustrations autonomes de landing, sans dashboard, fixture, mutation, provider ou route démo.
- `previewMode` de `ChatWidgetInline` : aperçu local de configuration de widget utilisé par les réglages du produit, distinct d'un parcours démo et sans accès aux données fictives.
- Les rapports UX historiques et la carte de conformité : ils documentent des faits passés. Leurs références à la démo ne sont ni des liens actifs ni des destinations applicatives.

## Risques de régression traités

- Les redirections sont exécutées avant toute authentification ou garde historique ; un ancien lien ne peut plus monter une page de fixtures.
- Les routes authentifiées `/dashboard-v2/*` et `/parametres/*` conservent la même protection middleware.
- La création de projet ne reconnaît plus le header ou le champ `demoMode` : elle suit le flux réel, avec tenant issu de session ou artisan public.
- La page marketing `/site-vitrine-artisan` reste présente ; seul le site fictif public a été retiré.

## Occurrences « demo » conservées après retrait

| Occurrence | Justification |
| --- | --- |
| `/demo`, `/demo-request`, `/demander-une-demo`, `/api/demo-request` | acquisition commerciale, sans produit alternatif |
| `AssistantWebDemo`, `AssistantVocalDemo` | illustration marketing statique/interne, sans dépendance au dashboard |
| Rapports `UX_UI_AUDIT_*`, `LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS`, `SECURITY_REVIEW_LOCAL_UX_AUDIT_AUTH`, carte de conformité | archives d'audit ; aucune route, import ni code actif |
| Mot `demo` dans cette note | traçabilité de la suppression |

## Validations effectuées

- `npx tsc --noEmit` : réussi après régénération des validateurs Next obsolètes.
- `npm run build` : réussi sur l'état final. Le manifeste ne contient plus aucune route ou API de dashboard, paramétrage, accès ou site fictif de démonstration.
- Requêtes HTTP de contrôle : `/dashboard-demo`, `/demo-dashboard`, `/demo-dashboard/onboarding`, `/demo-dashboard/projet/example`, `/demo-dashboard/projet/example/devis/new`, `/demo-dashboard/client/projet/example`, `/demo/acces`, `/demo-parametres`, `/demo-parametres/entreprise` et `/site-demo/electricien` répondent toutes `307` avec `Location: /demander-une-demo`; `/demander-une-demo` répond `200`.
- Recherche source : aucune route, fixture, contexte, provider, composant, API ou branche `demoMode` applicative ne subsiste. Les occurrences restantes sont celles justifiées ci-dessus.
- ESLint ciblé sur les 11 fichiers TypeScript modifiés : 109 problèmes existants (65 erreurs, 44 avertissements), concentrés dans les monolithes `ArtisanDashboard`, `KadriaPages`, `ChatWidgetInline` et `MobileDashboardView`. Le lot ne fait que retirer des branches, imports et valeurs de démonstration dans ces fichiers ; TypeScript et la build finale réussissent sans erreur liée au retrait.
