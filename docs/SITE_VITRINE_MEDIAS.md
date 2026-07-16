# Site vitrine artisan — photos et médias à fournir (vrai client)

Le démonstrateur utilise des placeholders éditoriaux (schémas SVG façon plan électrique, `SchematicVisual.tsx`). Pour un vrai site client, fournir :

## Prioritaires
1. **Photo hero** — l'artisan en situation (tableau ouvert, pose de borne), lumière naturelle, format paysage ≥ 2000 px.
2. **Portrait de l'artisan** — pour la section confiance/méthode, fond neutre ou atelier.
3. **6 photos de réalisations** (une par fiche galerie) : tableau rénové (avant/après idéalement), éclairage intérieur, éclairage extérieur, borne posée, chantier de mise aux normes, rénovation complète.
4. **Étude de cas** — 3 à 5 photos du chantier phare (avant, en cours, résultat, détail technique).

## Secondaires
5. **Véhicule floqué** — ancrage local.
6. **Équipe** — si plusieurs personnes.
7. **Avant/après** — paires cadrées identiquement (très efficace pour tableau et rénovation).
8. **Logo** vectoriel (sinon, le wordmark typographique du site suffit).

## Contraintes techniques
- JPEG/WebP, ≥ 1600 px de large pour les pleines largeurs, ≥ 800 px pour les cartes.
- Pas de photos stock : elles cassent la crédibilité locale et sont explicitement exclues de la DA.
- Prévoir les autorisations clients pour les photos de chantiers (RGPD / droit à l'image si personnes visibles).
- Intégration via `next/image` (le projet le supporte) en remplacement de `SchematicVisual` dans `Gallery.tsx`, `Hero.tsx`, `CaseStudy.tsx`.
