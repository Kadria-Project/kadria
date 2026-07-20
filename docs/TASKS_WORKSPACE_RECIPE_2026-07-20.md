# Recette et stabilisation — workspace A faire

## Resultat

La recette authentifiee n'a pas pu etre executee dans cet environnement : le
navigateur ne pouvait joindre aucun serveur local et aucune session de test
n'etait disponible. Aucune duree, volume, rerender ou constat utilisateur
reel n'est donc affirme ici.

## Observations verifiables

| Verification | Resultat |
| --- | --- |
| Chemin de rendu | `/dashboard-v2/a-faire` monte `TasksWorkspaceRoute`, jamais `ArtisanDashboard`. |
| Chargement client dedie | Une lecture de `/api/operations-center?scope=tasks` par montage normal. |
| Chargements historiques | Aucun appel client `/api/projects`, `/api/events` ou `/api/usage/monthly` depuis le routeur Tasks. |
| Contrat | Le navigateur recoit seulement `generatedAt`, `dataQuality` et `workbench`. |
| Etat insuffisant | Les sources indisponibles restent visibles et inhibent l'etat calme. |

## Correction issue de la revue cognitive

Le badge de carte disait seulement « Confiance ». Il a ete remplace par un
niveau de preuve explicite et une reserve lisible pour les niveaux moyen et
limite. Cela se rattache directement au besoin de distinguer preuve,
incertitude, comprehension, recommandation et action.

## Garde architecturale

`autonomous-tasks-route.test.ts` parcourt les imports locaux de la page
`/a-faire` et echoue si `ArtisanDashboard.tsx` est atteint. Il verifie aussi
le contrat compact et l'absence des appels historiques dans le routeur.

Pour Accueil et Suivi, reutiliser ce test avec leurs pages comme points
d'entree lorsqu'ils deviendront autonomes ; pendant leur migration, attendre
un remplacement explicite avant d'interdire `ArtisanDashboard`.

## Recette a rejouer avec la session de test

Tester ouverture directe, transitions depuis Accueil/Suivi/projet,
actualisation, session absente, donnees rares, etat calme, plusieurs
situations et source indisponible. Activer l'instrumentation existante, puis
relever clic->shell, clic->contenu utile, requetes, duplications, duree de
l'endpoint Tasks, octets de reponse et rerenders. Completer ce rapport avec
les valeurs observees, sans les extrapoler depuis les tests statiques.

## Responsive et accessibilite

Revue statique : structure semantique, labels, etats `aria-busy` et
`role=alert` sont presents ; les CTA restent des boutons natifs. La validation
visuelle desktop/tablette/mobile et clavier reste a faire avec une session et
un serveur accessibles.
