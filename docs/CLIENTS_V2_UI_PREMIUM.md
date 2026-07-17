# Clients V2 - Interface premium

Le workspace Clients s'appuie exclusivement sur `GET /api/clients`. Le Lot 9 ajoute un cockpit CRM clair : en-tête, cinq KPI, recherche serveur, vues rapides, filtres secondaires, tri serveur, pagination et vues liste/cartes.

Les badges de statut et d'attention sont séparés. Les contacts non liés restent visibles avec une explication non technique ; aucune fusion n'est proposée. Les lignes et cartes ouvrent le dernier dossier disponible, tandis qu'un client sans projet reste visible sans lien cassé.

La vue liste est la valeur par défaut desktop. La vue cartes est privilégiée sur mobile et le choix local est mémorisé. Les états de chargement, erreur, vide et recherche sans résultat ont un rendu spécifique. Le Lot 10 ajoutera la fiche Client V2, sans modifier cette source de données.
