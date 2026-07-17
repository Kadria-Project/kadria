# Clients V2 - Liste dual read

`GET /api/clients` est la source unique de la section Clients du Dashboard. Le tenant est toujours obtenu côté serveur depuis la session : aucun `tenant_id` n'est accepté depuis le navigateur.

## Lecture et agrégations

La route charge en batch et filtre par tenant les clients canoniques, `Projects`, `Devis`, `project_appointments`, `Activity` et `ProjectClientEvents`. Les regroupements et Maps sont construits côté serveur, sans requête N+1. Les métriques couvrent projets, devis, prochain rendez-vous, dernière interaction et une unique raison d'attention prioritaire.

Les projets avec `client_id IS NULL` restent des groupes `legacy` séparés : email normalisé, puis téléphone, puis nom + ville, puis projet isolé. Aucun rapprochement automatique n'est effectué avec un client canonique. Une correspondance forte est signalée par `possibleCanonicalClientId` et le badge « À rapprocher ».

## Contrat et interface

La réponse contient `items`, `total`, `page`, `pageSize` et `summary`. L'interface utilise la recherche, les filtres `status`, `source`, `active`, `attention`, `recurring`, `hasAppointment` et `includeArchived`, le tri serveur et la pagination. Elle affiche les états chargement, erreur avec réessai, vide et recherche sans résultat. Le clic ouvre temporairement le dernier projet : aucune route `/clients/[id]` n'est créée avant le Lot 10.

Les paramètres disponibles sont `q`, `status`, `source`, `active`, `attention`, `recurring`, `hasAppointment`, `includeArchived`, `sort`, `order`, `page` et `pageSize` (maximum 100).

## Limites V1

Cette passe ne fusionne pas les données legacy, ne crée pas de fiche Client V2 et ne modifie pas le dual write. Le Lot 9 portera la finition visuelle ; le Lot 10 apportera la fiche client détaillée.

La finition UX du Lot 9 est documentée dans `CLIENTS_V2_UI_PREMIUM.md`.
