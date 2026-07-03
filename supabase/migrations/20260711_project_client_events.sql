-- Timeline client V1 (lot 2 messagerie/portail) : table dédiée pour les
-- événements visibles côté client (messages client, réponses artisan,
-- complétion d'informations, et futurs événements RDV/devis/statut
-- réservés mais pas encore produits dans ce lot).
--
-- Pourquoi une table dédiée plutôt que d'étendre "Activity" : Activity est
-- un journal interne plat (project_id, action, description) utilisé dans de
-- très nombreux endroits (relances, Stripe, SMS, devis...) sans notion de
-- visibilité. Le rendre "client-safe" obligerait à auditer/filtrer chaque
-- écriture existante, ce qui est risqué. ProjectClientEvents isole
-- proprement les données lisibles par le client final, sans toucher à
-- Activity.
--
-- Rétrocompatibilité : les colonnes existantes Projects.client_messages /
-- client_last_update_at / client_update_count (migration
-- 20260703_client_portal_token.sql) restent écrites en parallèle pour ne
-- rien casser côté affichage existant ; cette nouvelle table devient la
-- source "propre" pour la timeline à l'avenir.
--
-- IMPORTANT : cette migration n'est PAS appliquée automatiquement. À
-- appliquer manuellement (même convention que les migrations précédentes de
-- cette session).

create table if not exists public."ProjectClientEvents" (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  artisan_id text not null,
  event_type text not null,
  visibility text not null default 'client',
  source text not null,
  title text not null,
  message text,
  metadata jsonb,
  created_at timestamptz default now(),
  created_by text,
  constraint project_client_events_event_type_check check (
    event_type in (
      'client_message',
      'artisan_reply',
      'client_info_updated',
      'appointment_scheduled',
      'appointment_updated',
      'quote_sent',
      'quote_accepted',
      'quote_declined',
      'project_status_updated'
    )
  ),
  constraint project_client_events_visibility_check check (
    visibility in ('client', 'internal')
  ),
  constraint project_client_events_source_check check (
    source in ('client', 'artisan', 'system')
  )
);

create index if not exists project_client_events_project_id_idx
  on public."ProjectClientEvents" (project_id, created_at);

create index if not exists project_client_events_artisan_id_idx
  on public."ProjectClientEvents" (artisan_id);
