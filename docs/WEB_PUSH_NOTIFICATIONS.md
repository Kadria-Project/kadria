# Notifications Web Push

Kadria envoie des notifications navigateur pour les rendez-vous créés ou confiés à un collaborateur, leurs modifications, leurs annulations et le rappel fixe une heure avant leur début.

## Déploiement

1. Appliquer `supabase/migrations/20260722_appointment_web_push.sql` dans l'environnement concerné. Cette migration n'est pas appliquée automatiquement par le dépôt.
2. Générer une paire VAPID : `npx web-push generate-vapid-keys`.
3. Configurer `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (une URI `mailto:` valide) et `CRON_SECRET` dans Vercel.
4. Déployer afin de publier `public/kadria-push-sw.js` et le cron `/api/cron/appointment-reminders` toutes les cinq minutes.
5. Ouvrir `/parametres/notifications`, activer un appareil et envoyer une notification de test.

## Fonctionnement et sécurité

- Un abonnement est associé au tenant, à l'utilisateur et à l'endpoint navigateur. Plusieurs appareils actifs d'un même utilisateur reçoivent chacun leur notification.
- Les clés d'abonnement ne sont jamais renvoyées au navigateur : seules les routes serveur authentifiées les lisent via le client Supabase server-only.
- Les tables Push ont RLS activée sans politique Data API : l'accès passe exclusivement par les routes Kadria authentifiées, qui scope chaque opération au tenant et à l'utilisateur courants.
- Les envois sont journalisés avec une clé unique par événement, rendez-vous, version et appareil. Un redéclenchement du cron ne double pas le rappel.
- Les réponses 404/410 des services Push révoquent automatiquement l'appareil concerné.

## Limites V1

- Le rappel est fixé à une heure avant le rendez-vous; aucun délai personnalisable n'est exposé.
- La notification de qualification après rendez-vous est volontairement désactivée : le modèle actuel ne possède pas d'état fiable indiquant qu'un compte rendu ou une qualification est attendu.
- Sur iPhone/iPad, les notifications nécessitent Kadria installé depuis l'écran d'accueil. Les navigateurs incompatibles affichent un état explicite sans bloquer l'application.
- Les notifications ne contiennent ni adresse complète, ni budget, ni notes privées.

## Vérification production

- Vérifier que HTTPS est actif et que le service worker est accessible à `/kadria-push-sw.js`.
- Tester Chrome, Edge et Firefox avec un appareil par navigateur.
- Vérifier le clic d'une notification : il ouvre l'Agenda via `/dashboard-v2?workspace=calendar&appointment=...`.
- Créer, réaffecter, modifier et annuler un rendez-vous de test, puis déclencher un rappel dans la fenêtre H-1.
