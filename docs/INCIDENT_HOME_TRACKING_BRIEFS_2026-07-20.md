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

## Correctif final : colonnes optionnelles

La cause racine est confirmée par les logs de production du 20 juillet : les deux endpoints ont reçu `42703` pour `Projects.quote_sent_at`. Le probe `tableHasColumn` produisait un faux positif, car une erreur de vérification autre qu’une absence de colonne était interprétée comme une existence.

La règle est maintenant *fail closed* : une colonne n’est retenue que si le probe PostgREST se termine explicitement avec `error: null`. Une colonne absente, une permission insuffisante, une réponse ambiguë ou toute erreur de vérification produisent `false`, sans bloquer un champ optionnel.

Les requêtes `Projects` d’Accueil et Suivi appliquent ensuite un seul retry ciblé. Si le premier `select` retourne `42703` et que le nom extrait est dans la liste blanche (`quote_sent_at`, `accepted_at`, `last_follow_up_at`, `devis_amount`, `completion_completed_at`), cette seule colonne est retirée et la requête est rejouée une fois. Une erreur sur une colonne obligatoire, un code différent ou l’échec du retry reste une 500 structurée.

Suivi retourne alors `dataQuality.level = "partial"` avec une réserve générique, sans nom de colonne technique. Accueil continue sans les signaux secondaires qui dépendent de la colonne absente. Un retry réussi écrit seulement une ligne serveur compacte `OPTIONAL_COLUMN_REMOVED`; aucun détail technique n’est ajouté au payload utilisateur.

## Diagnostics et format Vercel

Ancien format inutilisable : `[HOME_BRIEF] Unable to build home brief { error: '[object Object]' }`.

Nouveau format, sur une ligne : `[HOME_BRIEF] requestId=a91c4e27 stage=projects_query diagnostic=DATABASE_COLUMN_MISSING type=PostgrestError code=42703 message="column Projects.quote_sent_at does not exist"`.

Les diagnostics stables comprennent `DATABASE_COLUMN_MISSING`, `DATABASE_PERMISSION_DENIED`, `DATABASE_TABLE_MISSING`, `DATABASE_ROW_NOT_FOUND`, `DATABASE_COLUMN_NOT_EXPOSED`, `AUTHENTICATION_REQUIRED`, `ACCESS_FORBIDDEN`, `SESSION_RESOLUTION_FAILED`, `TENANT_RESOLUTION_FAILED`, `SCHEMA_INSPECTION_FAILED`, `DATA_LOAD_FAILED`, `NORMALIZATION_FAILED`, `CONTRACT_VALIDATION_FAILED` et `UNEXPECTED_ERROR`.

Chaque requête reçoit un `requestId` court, présent dans la ligne de log et la réponse 500. La réponse ne contient aucun détail technique. Dans Vercel, rechercher ce `requestId` permet de corréler l’écran et le log.

Seuls scope, requestId, étape, diagnostic, type, code, message, details et hint sont journalisés. Les sauts de ligne, valeurs longues, e-mails et motifs de token sont nettoyés ; cookies, en-têtes, identifiants de tenant/utilisateur et données métier ne sont jamais inclus. En production aucune stack n’est ajoutée.

## Tests et validations

Les tests couvrent le sérialiseur Supabase, l’exclusion des colonnes optionnelles absentes, les contrats Home/Suivi, les états vides et partiels, les preuves, les erreurs 401/500 et les gardes `ArtisanDashboard`.

Les tests ajoutés couvrent le probe en erreur ou ambigu, le retry `42703` sur `quote_sent_at`, son succès, son unique échec, l’absence de retry pour une colonne obligatoire et l’exclusion de la colonne au second `select`. La validation finale est verte : 32 tests Home/Suivi/helpers/logger/gardes, lint ciblé, `npx tsc --noEmit` et `git diff --check`. Le build du 20 juillet réussit en 84,2 s (compilation 24,3 s, TypeScript 44 s, génération statique 1,8 s).

## Runtime et décision

La reproduction authentifiée n’est pas possible localement sans session et tenant de production ; elle n’est donc pas déclarée validée. La tentative de prévisualisation du 20 juillet avec Vercel CLI 56.3.2 a été bloquée avant déploiement par `The specified token is not valid. Use vercel login to generate a new token.`

Décision de livraison : ce commit pousse le hotfix sur `origin/main` afin de restaurer les deux briefs. La validation runtime finale doit être effectuée immédiatement après le déploiement, avec une session et un tenant représentatif : `200` pour les deux endpoints, Accueil et Suivi affichés, et aucun nouveau `42703` non traité. Aucun rollback n’est exécuté : le correctif est ciblé et préserve les architectures autonomes.

## Risques résiduels

Une colonne obligatoire réellement absente, une permission Supabase ou une résolution tenant défaillante restera une 500, mais avec l’étape et l’erreur observables nécessaires pour un correctif précis. Une indisponibilité de colonne optionnelle ne fait plus tomber Suivi.
