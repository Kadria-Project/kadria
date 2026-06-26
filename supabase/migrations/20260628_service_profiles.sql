-- Référentiel métier (V1, étape 2) : fiches détaillées par prestation —
-- comment chaque prestation doit être qualifiée, chiffrée et planifiée.
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle. Il
-- documente le schéma attendu et doit être exécuté manuellement (Supabase
-- SQL editor ou CLI) avant la mise en production de la fonctionnalité.
--
-- Convention : artisan_id est stocké en `text` (et non `uuid`), cohérent
-- avec artisan_business_profile / artisan_service_catalog / AuthPayload.artisanId.
--
-- Important : cette table ne branche rien sur le chat, le vocal, les devis,
-- les suggestions de devis, l'Action Engine, le dashboard ou Google
-- Calendar — c'est un nouveau socle, indépendant, pas encore consommé.

create table if not exists service_profiles (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  service_catalog_id uuid references artisan_service_catalog (id) on delete set null,

  -- 1. Présentation
  name text not null,
  category text,
  description text,
  is_active boolean not null default true,

  -- 2. Détection
  detection_keywords jsonb not null default '[]'::jsonb,

  -- 3. Qualification
  qualification_questions jsonb not null default '[]'::jsonb,
  required_information jsonb not null default '[]'::jsonb,
  required_photos boolean not null default false,

  -- 4. Chiffrage
  recommended_quote_lines jsonb not null default '[]'::jsonb,
  average_duration_minutes integer,
  default_vat_rate numeric,

  -- 5. Planification
  travel_required boolean not null default false,
  appointment_recommended boolean not null default false,
  emergency_supported boolean not null default false,

  related_services jsonb not null default '[]'::jsonb,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_profiles_artisan_id_idx
  on service_profiles (artisan_id);

create index if not exists service_profiles_service_catalog_id_idx
  on service_profiles (service_catalog_id);

create index if not exists service_profiles_category_idx
  on service_profiles (category);

create index if not exists service_profiles_is_active_idx
  on service_profiles (is_active);
