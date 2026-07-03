-- Fondation du portail client V1 (lot 1) : lien public sécurisé par token
-- opaque permettant au client final de consulter et compléter sa demande
-- sans création de compte. Suit la même convention que sms_completion_token
-- (colonne text unique, générée paresseusement côté serveur au premier accès
-- si absente) déjà utilisée pour /completer/[token].
--
-- client_messages : stocke les messages du client à l'artisan, distinct de
-- artisan_notes (notes internes, jamais visibles côté client). Simple texte
-- concaténé horodaté, cohérent avec le pattern déjà utilisé pour ai_summary
-- dans app/api/completer/[token]/route.ts (pas de table dédiée, pour rester
-- simple en V1).
--
-- client_last_update_at / client_update_count : traçabilité minimale des
-- mises à jour faites par le client via le portail, sans dupliquer un
-- mécanisme d'historique complet (Activity existe déjà et est utilisé pour
-- le log d'action, cf. route.ts).

alter table public."Projects"
  add column if not exists client_portal_token text unique,
  add column if not exists client_messages text,
  add column if not exists client_last_update_at timestamptz,
  add column if not exists client_update_count integer not null default 0;
