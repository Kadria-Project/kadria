-- Centre de notifications artisan V1 : table dédiée, séparée de
-- "ProjectClientEvents" (timeline client/portail, un concept différent) et
-- de "Activity" (journal interne plat sans notion de lu/non-lu par
-- artisan). "Activité dossier" = historique par dossier. "Notifications" =
-- boîte de réception globale et transverse de l'artisan (lu/non-lu, action
-- rapide), tous dossiers confondus. D'où une table à part plutôt qu'une
-- extension de l'une des deux tables existantes.
--
-- Sécurité : aucune RLS ici, comme "ProjectClientEvents" et "Activity"
-- (aucune des tables Supabase de ce projet n'a de politique RLS à ce jour) —
-- l'accès est strictement contrôlé côté serveur (routes /api/notifications*,
-- artisan_id toujours dérivé de la session, jamais du front). Si RLS est
-- introduit un jour sur ce projet, ajouter une politique
-- "artisan_id = auth.jwt() ->> 'artisan_id'" ici en cohérence avec le reste.
--
-- IMPORTANT : cette migration n'est PAS appliquée automatiquement. À
-- appliquer manuellement (même convention que toutes les migrations
-- précédentes de cette session).

create table if not exists public."ArtisanNotifications" (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  project_id uuid,
  type text not null,
  title text not null,
  message text not null,
  priority text not null default 'medium',
  status text not null default 'unread',
  read_at timestamptz,
  action_url text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint artisan_notifications_type_check check (
    type in (
      'new_project',
      'client_message',
      'client_info_updated',
      'quote_sent',
      'quote_accepted',
      'quote_declined',
      'deposit_requested',
      'deposit_paid',
      'followup_due',
      'appointment_due',
      'status_changed',
      'system'
    )
  ),
  constraint artisan_notifications_priority_check check (
    priority in ('high', 'medium', 'low')
  ),
  constraint artisan_notifications_status_check check (
    status in ('unread', 'read')
  )
);

create index if not exists artisan_notifications_artisan_id_idx
  on public."ArtisanNotifications" (artisan_id);

create index if not exists artisan_notifications_artisan_status_idx
  on public."ArtisanNotifications" (artisan_id, status);

create index if not exists artisan_notifications_artisan_created_idx
  on public."ArtisanNotifications" (artisan_id, created_at desc);

create index if not exists artisan_notifications_project_id_idx
  on public."ArtisanNotifications" (project_id);
