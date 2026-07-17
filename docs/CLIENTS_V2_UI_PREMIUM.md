# Clients V2 - Interface premium

Le workspace Clients s'appuie exclusivement sur `GET /api/clients`. Le Lot 9 ajoute un cockpit CRM clair : en-tête, cinq KPI, recherche serveur, vues rapides, filtres secondaires, tri serveur, pagination et vues liste/cartes.

Les badges de statut et d'attention sont séparés. Les contacts non liés restent visibles avec une explication non technique ; aucune fusion n'est proposée. Les lignes et cartes ouvrent le dernier dossier disponible, tandis qu'un client sans projet reste visible sans lien cassé.

La vue liste est la valeur par défaut desktop. La vue cartes est privilégiée sur mobile et le choix local est mémorisé. Les états de chargement, erreur, vide et recherche sans résultat ont un rendu spécifique. Le Lot 10 ajoutera la fiche Client V2, sans modifier cette source de données.

## Lot 9.5 — Centre d'actions CRM

Le Lot 9.5 ajoute, au-dessus de la liste, un Centre d'actions ("Priorités du jour") et des KPI désormais cliquables, toujours à partir de `GET /api/clients` (champ `actions`, calculé côté serveur sur l'ensemble tenant-scopé, jamais sur la seule page courante). Voir `docs/CLIENTS_V2_ACTION_CENTER.md` pour l'architecture complète, la hiérarchie des priorités, les catégories, le nouveau filtre `attentionReason` et les limites de la recette.
