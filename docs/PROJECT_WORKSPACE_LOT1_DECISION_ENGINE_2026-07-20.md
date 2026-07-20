# Fiche Projet — Lot 1 : moteur de décision

Date : 20 juillet 2026.

## Objectif livré

Le Lot 1 introduit la première zone décisionnelle autonome de `/dashboard-v2/projet/[id]`. Elle explique, à partir d'un contrat compact : ce que Kadria comprend, les faits qui l'étayent, le niveau de preuve, l'incertitude éventuelle, la recommandation et un seul CTA.

## Architecture avant / après

```text
Avant
page client Projet (7 140 lignes)
  → projet complet + activités + devis + rendez-vous + config + équipe + session
  → règles et conclusion côté navigateur
  → ProjectActionCenter

Après le Lot 1
page client Projet (fonctions historiques conservées)
  → ProjectWorkspaceRoute
     → GET /api/projects/[id]/workspace
        → autorisation projet/tenant côté serveur
        → lectures ciblées parallèles
        → buildProjectWorkspaceBrief
        → ProjectDecisionWorkspace
```

`ProjectWorkspaceRoute` ne charge ni projet complet, ni session, ni Supabase, ni règle commerciale. Il appelle uniquement l'endpoint workspace. La route historique reste temporairement chargée pour les panneaux et mutations hors périmètre ; le nouveau `decisionSlot` remplace visuellement l'ancien `ProjectActionCenter` afin de ne pas afficher deux centres de décision.

## Contrat

`src/lib/projects/project-workspace-contract.ts` expose uniquement :

- date de génération et qualité (`complete`, `partial`, `insufficient`) ;
- identité minimale du dossier (id, titre, stade, libellé client, métier, ville) ;
- décision (faits, compréhension, preuve, réserve, recommandation, pourquoi, CTA) ;
- capacités booléennes.

La validation rejette toute clé non autorisée, les niveaux invalides, plus de cinq faits, et notamment les clés PII ou collections interdites : e-mail, téléphone, adresse, notes, messages, documents, photos, devis, rendez-vous, activité exhaustive, équipe, configuration, profils, score et client Supabase.

## Sources et règles de preuve

Le builder utilise uniquement le projet autorisé avec des colonnes ciblées, le dernier devis, le prochain rendez-vous et trois faits d'activité au maximum. Les trois sources secondaires sont lancées en parallèle. Une indisponibilité de source optionnelle devient une réserve et `dataQuality.partial`; elle ne déclenche pas d'affirmation positive.

- devis accepté ou rendez-vous enregistré : preuve forte ;
- devis envoyé depuis au moins sept jours sans acceptation enregistrée : preuve modérée, avec réserve explicite sur l'intention client ;
- qualification incomplète ou absence de fait déterminant : conclusion limitée ou insuffisante ;
- aucun score brut ni règle métier interne n'est envoyé au navigateur.

## États

Le lecteur possède un chargement local, une erreur avec retry, un état partiel et un état insuffisant. En insuffisant, aucune recommandation forte n'est affichée : seule une action de complétion peut être proposée lorsqu'elle est autorisée et justifiée.

## Éléments reportés

Historique complet, documents/photos, communications, portail, PDF, acompte, avis, édition du projet/client, édition de devis, planification détaillée, liste complète de rendez-vous, équipe, configuration et profils restent inchangés dans le contrôleur existant. Le code legacy post-`return` n'est ni supprimé ni nettoyé dans ce lot.

## Fichiers du lot

- `src/lib/projects/project-workspace-contract.ts`
- `src/lib/projects/project-workspace-builder.ts`
- `app/api/projects/[id]/workspace/route.ts`
- `app/dashboard-v2/projet/[id]/ProjectWorkspaceRoute.tsx`
- `src/components/projects/workspace/ProjectDecisionWorkspace.tsx`
- `src/components/projects/workspace/ProjectWorkspace.tsx`
- `src/components/projects/workspace/ProjectWorkspace.types.ts`
- `app/dashboard-v2/projet/[id]/page.tsx`
- tests Projet workspace et ce rapport.

## Validations

Exécutées avec succès le 20 juillet 2026 :

- tests Projet (contrat, builder, endpoint statique, garde et situations existantes) : **26/26** ;
- lint ciblé : **0 erreur**. La page legacy conserve 13 avertissements préexistants (imports/états inutilisés, dépendances d'effets et images), hors périmètre du Lot 1 ;
- `npx tsc --noEmit` : succès ;
- `git diff --check` : succès ;
- `npm run build` final : succès en **110,9 s** (compilation Turbopack 38,5 s ; TypeScript 58 s ; génération statique 3,4 s).
