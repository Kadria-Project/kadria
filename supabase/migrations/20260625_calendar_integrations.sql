-- Table de stockage des connexions Google Calendar (V1) par artisan.
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle. Il
-- documente le schéma attendu et doit être exécuté manuellement (Supabase
-- SQL editor ou CLI) avant la mise en production de l'intégration agenda.
--
-- Convention : artisan_id est stocké en `text` (et non `uuid`) car
-- l'ensemble du code existant (src/lib/airtable.ts, AuthPayload.artisanId)
-- traite les identifiants artisan comme des chaînes (compatibilité
-- Airtable/legacy), jamais comme des uuid Postgres stricts.

create table if not exists calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  provider text not null default 'google',
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  calendar_email text,
  is_connected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_integrations_artisan_provider_unique unique (artisan_id, provider)
);

create index if not exists calendar_integrations_artisan_id_idx
  on calendar_integrations (artisan_id);
