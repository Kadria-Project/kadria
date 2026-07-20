# Fiche Projet — Lot 3 : engagements, preuves et historique utile

Le contrat compact enrichit le brief avec `nextEngagement`, cinq `recentFacts` au maximum et `evidence`.

- Le prochain engagement est le prochain rendez-vous confirmé, puis une relance devis prudente, sinon aucun engagement identifié.
- Les faits sont sélectionnés côté serveur par catégorie métier ; les descriptions libres et logs techniques sont exclus.
- Les preuves distinguent photos et devis. Les documents administratifs ne sont pas interrogés dans l’aperçu, ce qui est explicitement signalé.
- `GET /api/projects/[id]/workspace/facts?offset=` fournit une lecture différée paginée, autorisée par projet et sans description libre.

Les détails de documents, photos, devis et rendez-vous restent reportés au Lot 4 ; aucune mutation, modal ou contrôleur legacy n’est modifié.

## Validations

- tests builder : succès ;
- `npx tsc --noEmit` : succès ;
- lint ciblé et `git diff --check` : succès ;
- build final : succès en 134,9 s (compilation 43 s, TypeScript 62 s).
