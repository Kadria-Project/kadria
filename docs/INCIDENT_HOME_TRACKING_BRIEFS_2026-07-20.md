# Incident P0 — Accueil et Suivi

## Impact et symptômes

Après les commits d’autonomisation `8d0bec3` et `d921102`, `/api/home-brief` et `/api/tracking-brief` répondaient 500 en production. Les logs réduisaient l’erreur à `[object Object]`, empêchant toute identification de la source.

## Cause racine étayée

Les deux endpoints sélectionnaient directement des colonnes projet optionnelles (`quote_sent_at`, `accepted_at`, `last_follow_up_at`, et selon l’écran `devis_amount` ou `completion_completed_at`). Une erreur Supabase est un objet, et le logging `String(error)` la réduisait à `[object Object]`. Cette combinaison explique le symptôme observé ; les nouveaux logs exposeront désormais le code et le message de l’erreur sans données métier.

## Correctif

- ajout d’un sérialiseur d’erreur sûr : type, message, code, details, hint, stack pour une instance `Error` ;
- ajout d’une étape structurée (`session`, `tenant`, `schema`, `projects_query`, `data_load`, `normalize`, `build`, `contract`) dans chaque endpoint ;
- interrogation des colonnes optionnelles via `tableHasColumn` avant de composer le `select` ;
- Suivi signale une qualité `partial` quand ces sources optionnelles sont indisponibles ;
- aucune donnée client, token, cookie ou contenu de projet n’est journalisé.

## Diagnostics et format Vercel

Ancien format inutilisable : `[HOME_BRIEF] Unable to build home brief { error: '[object Object]' }`.

Nouveau format, sur une ligne : `[HOME_BRIEF] requestId=a91c4e27 stage=projects_query diagnostic=DATABASE_COLUMN_MISSING type=PostgrestError code=42703 message="column Projects.quote_sent_at does not exist"`.

Les diagnostics stables comprennent `DATABASE_COLUMN_MISSING`, `DATABASE_PERMISSION_DENIED`, `DATABASE_TABLE_MISSING`, `DATABASE_ROW_NOT_FOUND`, `DATABASE_COLUMN_NOT_EXPOSED`, `AUTHENTICATION_REQUIRED`, `ACCESS_FORBIDDEN`, `SESSION_RESOLUTION_FAILED`, `TENANT_RESOLUTION_FAILED`, `SCHEMA_INSPECTION_FAILED`, `DATA_LOAD_FAILED`, `NORMALIZATION_FAILED`, `CONTRACT_VALIDATION_FAILED` et `UNEXPECTED_ERROR`.

Chaque requête reçoit un `requestId` court, présent dans la ligne de log et la réponse 500. La réponse ne contient aucun détail technique. Dans Vercel, rechercher ce `requestId` permet de corréler l’écran et le log.

Seuls scope, requestId, étape, diagnostic, type, code, message, details et hint sont journalisés. Les sauts de ligne, valeurs longues, e-mails et motifs de token sont nettoyés ; cookies, en-têtes, identifiants de tenant/utilisateur et données métier ne sont jamais inclus. En production aucune stack n’est ajoutée.

## Tests et validations

Les tests couvrent le sérialiseur Supabase, l’exclusion des colonnes optionnelles absentes, les contrats Home/Suivi, les états vides et partiels, les preuves, les erreurs 401/500 et les gardes `ArtisanDashboard`.

`npx tsc --noEmit`, lint ciblé, `git diff --check` et `npm run build` réussissent. Build observé : compilation 42 s, TypeScript 63 s, génération statique 2,9 s.

## Runtime et décision

La reproduction authentifiée n’est pas possible localement sans session et tenant de production ; elle n’est donc pas déclarée validée. La tentative de prévisualisation du 20 juillet avec Vercel CLI 56.3.2 a été bloquée avant déploiement par `The specified token is not valid. Use vercel login to generate a new token.`

Décision de livraison : ce commit pousse le hotfix sur `origin/main` afin de restaurer l’observabilité en production. La validation runtime finale doit être effectuée immédiatement après le déploiement, avec une session et un tenant représentatif. Les nouveaux logs permettront de confirmer la cause racine étayée ou d’orienter son correctif si une autre erreur persiste. Aucun rollback n’est exécuté : le correctif est ciblé et préserve les architectures autonomes.

## Risques résiduels

Une colonne obligatoire réellement absente, une permission Supabase ou une résolution tenant défaillante restera une 500, mais avec l’étape et l’erreur observables nécessaires pour un correctif précis. Une indisponibilité de colonne optionnelle ne fait plus tomber Suivi.
