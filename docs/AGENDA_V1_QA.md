# Agenda V1 - recette manuelle

Cette recette se joue sur Preview ou sur un environnement de test avec des comptes de test. Ne jamais modifier les cles Resend ou les donnees de production pour provoquer une erreur.

## Prerequis

- Un artisan standard, un manager ou administrateur du tenant, un viewer si disponible, et un administrateur global sans tenant.
- Un projet avec trois rendez-vous futurs lies, dont un `pending`, un `confirmed` et un `cancelled`.
- Deux membres actifs du meme tenant, un membre desactive, et un rendez-vous historique sans affectation si possible.
- Acces au portail client du projet et au journal applicatif Preview.

## Cycle client et multi-rendez-vous

1. Ouvrir le portail puis confirmer le rendez-vous `pending`.
2. Verifier que seule sa carte devient `Confirme`, que sa source est `client`, et que les deux autres rendez-vous ne changent pas.
3. Depuis un rendez-vous `confirmed`, demander un changement puis refuser un autre rendez-vous. Verifier les libelles portail et les activites correspondantes.
4. Annuler un rendez-vous depuis l'artisan et verifier le libelle `Annule par l'artisan` dans le portail.

## Reconfirmation, idempotence et rollback

1. Depuis l'Agenda, deplacer puis redimensionner un rendez-vous `confirmed`. Puis le reaffecter a un autre membre actif.
2. A chaque mutation, verifier le retour a `pending`, une seule reconfirmation, une seule version supplementaire et les activites append-only attendues.
3. Rejouer une requete avec le meme `requestId` depuis DevTools Network ou un client authentifie. La seconde reponse doit etre idempotente, sans email, Push, Activity ou version supplementaire.
4. Provoquer uniquement en Preview une erreur autorisee (permission insuffisante ou conflit de version). Verifier le retour visuel a l'horaire, la duree ou l'affectation precedente et un message clair.
5. Avec une cle Resend invalide uniquement en Preview, modifier un rendez-vous confirme. La mutation doit rester enregistree et `pending`, avec avertissement et sans Activity d'email envoye. Verifier le log `RECONFIRMATION_EMAIL_FAILED`, puis restaurer la configuration Preview.

## Permissions et donnees historiques

1. Verifier les droits de lecture, modification et reaffectation pour les roles reels du tenant. Un membre d'un autre tenant et un administrateur global sans tenant ne doivent jamais apparaitre comme collaborateurs.
2. Desactiver un membre de test : il doit disparaitre des selecteurs et filtres, sans masquer son historique. Verifier que le cron H-1 et les Push futurs ne le ciblent plus.
3. Verifier les fallbacks pour `assigned_user_id`, `confirmation_status`, `confirmation_source`, `confirmation_version` et `end_time` nuls ou absents : aucun crash, aucun texte `undefined`, et un etat `Non affecte` quand pertinent.

## React et performance

1. En build production, dans Chrome ou Edge, recharger directement Agenda Jour, Semaine, Equipe et le portail multi-rendez-vous, sur desktop et mobile.
2. Verifier la console : aucune erreur React #418 ou erreur d'hydratation. Tester aussi le bouton Maintenant, le retour de focus et le polling.
3. Avec 8 a 10 collaborateurs et 100 a 300 rendez-vous sur une semaine, tester scroll, filtres, drag, resize et changements de vue. Verifier dans Network qu'il n'y a pas de N+1 manifeste et que le polling s'arrete dans un onglet masque.

## SQL de verification

Remplacer les placeholders avant execution :

```sql
select
  id,
  project_id,
  assigned_user_id,
  start_time,
  end_time,
  confirmation_status,
  confirmation_source,
  confirmation_version,
  confirmation_request_id,
  confirmation_updated_at,
  updated_at
from public.project_appointments
where id = '<APPOINTMENT_ID>';

select
  project_id,
  action,
  description,
  created_at
from public."Activity"
where project_id = '<PROJECT_ID>'
order by created_at desc
limit 30;
```
