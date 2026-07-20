# Fiche Projet — Lot 4 : commandes métier

## Sous-lot livré : noyau projet

Ce sous-lot isole deux intentions déjà présentes dans le contrôleur historique sans modifier leurs règles : le changement de statut (qui continue de marquer le dossier comme contacté et d’écrire l’activité `STATUS_UPDATED`) et la mise à jour des coordonnées. Les mutations passent désormais par des endpoints spécialisés et ne retournent ni projet, ni client, ni historique complet.

```text
Contrôleur Projet → client de commande typé → endpoint autorisé → mutation ciblée
                                                ↓
                                     résultat minimal + fragments à relire
                                                ↓
                              événement local → relecture du ProjectWorkspace brief
```

Les deux endpoints vérifient côté serveur la session, le tenant, l’accès au projet et `projects.update`. Les identifiants, tenant, rôle et capacités ne viennent jamais du navigateur.

## Contrat commun

`ProjectCommandResult` contient uniquement `ok`, une donnée minimale optionnelle, les fragments à rafraîchir (`brief`, `facts`, `commercial`, `engagement`, `documents`) et une erreur structurée (`code`, message utilisateur, `requestId`). Les erreurs serveur sont loggées avec le scope, l’étape, le code et un message borné ; aucun payload, identifiant client ou coordonnées n’est journalisé.

## Inventaire des mutations observées

| Commande | Déclencheur / endpoint actuel | Permission | Rechargement actuel | Risque | État |
| --- | --- | --- | --- | --- | --- |
| Changement de statut | actions commerciales, ancien `PATCH /api/projects/[id]` | `projects.update` | activité + projet complet | faible | migrée vers `/commands/status` |
| Coordonnées client | deux modales, ancien `PATCH /api/projects/[id]` | `projects.update` | une modale faisait `window.location.reload()` | moyen | une modal active migrée vers `/commands/contact`; doublon legacy à extraire |
| Responsable | carte responsable, `PATCH /responsible` | `projects.assign`, puis `projects.reassign` | mise à jour locale | moyen | reportée : automatisations et résolution d’équipe couplées |
| Archivage | action dossier, ancien `PATCH /api/projects/[id]` | `projects.update` | projet complet + activité | faible | reporté avec les autres commandes cœur |
| Note interne | zone de note, ancien `PATCH /api/projects/[id]` | `projects.update` | projet complet + activité | moyen | reportée : donnée interne hors brief |
| Date de rappel | zone de rappel, ancien `PATCH /api/projects/[id]` | `projects.update` | projet complet + activité | élevé | reportée : synchronisation Agenda existante |
| Rendez-vous | modales et endpoints appointments | permissions rendez-vous | relectures locales variables | élevé | reportée |
| Relance / devis / PDF | actions spécialisées devis | permissions devis | états locaux variables | élevé | reportée |
| Portail, acompte, avis, SMS | actions spécialisées existantes | permissions/fonctionnalités propres | relecture projet | élevé | reportée |

## Revalidation et état utilisateur

La commande de statut invalide `brief`, `facts`, `commercial` et `engagement`; la commande de coordonnées invalide `brief`. Après succès, le workspace relit uniquement son brief via l’événement local `project-workspace:refresh`. La modale ferme et la page conserve son état. Les boutons gardent leur état `submitting` existant et les échecs affichent un message utilisateur non technique.

## Sous-lot 4B : responsable et rendez-vous

La fiche utilise désormais les commandes typées `assignProjectOwnerCommand` et `scheduleProjectAppointmentCommand`. Elles ne prennent jamais de tenant, rôle ou capacité depuis le navigateur. Elles délèguent aux endpoints existants, qui conservent leurs vérifications serveur : `projects.assign` / `projects.reassign` pour le responsable, puis session, accès au projet, tenant et autorisations de rendez-vous dans `/api/appointments/book`.

| Commande | Déclencheur | Endpoint | Réponse client normalisée | Refresh |
| --- | --- | --- | --- | --- |
| Responsable | carte responsable | `PATCH /api/projects/[id]/responsible` | identifiant et libellé du responsable | `brief` |
| Création de rendez-vous | modal Projet | `POST /api/appointments/book` | identifiant, début, fin, lieu, statut, affectation | `brief`, `engagement`, `facts` |
| Modification / annulation | aucune dans la fiche Projet | parcours Agenda existant | non migrée, hors périmètre | — |

La fiche ne modifie ni les règles de disponibilité, ni les conflits, ni Google Calendar. Elle conserve seulement la saisie du formulaire et son état de soumission. Les endpoints existants restent propriétaires de la validation finale, de l’accès au projet, de l’affectation et des effets Agenda.

## Limites et suite

Le contrôleur legacy reste volontairement propriétaire des commandes non migrées. Son premier doublon de modal coordonnées conserve encore son ancien reload : il est documenté, non masqué, et sera traité uniquement avec l’extraction complète de cette modal. Les rendez-vous, relances, devis, documents, portail, acompte et avis ne sont pas migrés à moitié.

## Validations du sous-lot

Le 20 juillet 2026 :

- tests Projet, contrat de commande et garde : **15/15 réussis** ;
- lint ciblé : **0 erreur** ; 13 avertissements préexistants du contrôleur legacy, sans nouvel avertissement de ce sous-lot ;
- `npx tsc --noEmit` : **réussi** ;
- `git diff --check` : **réussi** ;
- `npm run build` : **réussi en 69 s** (compilation Turbopack 26,9 s, TypeScript 31,8 s, génération statique 2,3 s).
