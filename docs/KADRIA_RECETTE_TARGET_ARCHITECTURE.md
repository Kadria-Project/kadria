# Architecture cible de recette Kadria

## Principe

La recette utilise **le même dépôt et le même build applicatif que la production**. Elle n'ajoute ni route, ni composant, ni provider, ni comportement de démonstration. La différence est exclusivement opérationnelle : infrastructure, données, comptes et intégrations.

## Environnement cible

- Projet Vercel distinct, avec variables d'environnement propres à la recette.
- Projet Supabase distinct, sans réseau ni secret partagé avec la production.
- Comptes artisans testeurs réels et tenants de recette isolés.
- Données initialisées par seed contrôlé ou procédure serveur explicitement versionnée.
- Intégrations externes configurées en sandbox lorsqu'elles existent ; sinon neutralisées ou remplacées par des adaptateurs serveur contrôlés et documentés.
- Aucun accès aux données, buckets, clés ou webhooks de production.

## Contrats de sécurité et d'exploitation

1. Le code de la recette passe par les mêmes routes, permissions, règles métier et composants que la production.
2. Les comptes et tenants de recette portent une marque de données de test uniquement côté infrastructure/serveur, jamais via une branche UI `demo`.
3. Les webhooks sortants, e-mails, SMS, paiements, calendrier et assistant sont sandboxés, neutralisés ou routés vers des destinataires/adaptateurs de test approuvés.
4. Les secrets recette ne sont jamais exposés au client ni réutilisés en production.
5. Les captures, tests de parcours et audits utilisent un tenant recette connu et des données reproductibles.

## Réinitialisation future d'un tenant

Prévoir une procédure serveur authentifiée et journalisée qui cible un tenant de recette identifié, réinitialise ses données à un jeu seed approuvé, recrée ses relations minimales et vérifie l'isolement. Cette procédure ne doit jamais accepter un identifiant de production et ne doit pas être accessible depuis l'interface artisan.

## Hors périmètre de ce lot

La création du projet Vercel, du projet Supabase, des seeds, des adaptateurs externes, des comptes testeurs et de la procédure de reset n'est pas implémentée ici. Cette note fixe seulement l'architecture : une recette est un environnement du produit réel, jamais une application parallèle.

Les fichiers de performance et les documents Design System externes au retrait de l'architecture de démonstration ne font pas partie de cette décision d'architecture ni de son commit.
