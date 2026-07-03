-- Colonne de "vu" pour la nouvelle colonne "Activité" du suivi commercial
-- (liste des projets). Permet de calculer le nombre de nouveautés client
-- non lues sur un projet : tout événement significatif de
-- "ProjectClientEvents" créé après cette date est compté comme "à lire".
--
-- Rétrocompatibilité / robustesse : nullable, pas de valeur par défaut. Si
-- null, le calcul cote application considère les événements significatifs
-- récents comme non lus (voir src/lib/client-events.ts,
-- getClientActivitySummaries). Aucune donnée existante n'est modifiée.
--
-- IMPORTANT : cette migration n'est PAS appliquée automatiquement. À
-- appliquer manuellement (même convention que les migrations précédentes de
-- cette session, cf. 20260711_project_client_events.sql).

alter table public."Projects"
  add column if not exists client_activity_last_seen_at timestamptz;
