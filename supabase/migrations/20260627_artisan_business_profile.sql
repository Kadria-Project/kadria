-- Socle "Profil métier" (V1) : identité métier, zone d'intervention, horaires,
-- chiffrage, marques/préférences, et catalogue simple de prestations.
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle. Il
-- documente le schéma attendu et doit être exécuté manuellement (Supabase
-- SQL editor ou CLI) avant la mise en production de la fonctionnalité.
--
-- Convention : artisan_id est stocké en `text` (et non `uuid`), cohérent
-- avec calendar_integrations / project_appointments / AuthPayload.artisanId
-- (compatibilité Airtable/legacy, jamais un uuid Postgres strict).
--
-- Important : ces deux tables sont un nouveau socle, indépendant. Elles ne
-- modifient en rien les devis existants, le chat, le vocal, ni l'Action
-- Engine — aucune table existante n'est altérée.

create table if not exists artisan_business_profile (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null unique,

  -- 1. Identité métier
  primary_trade text,
  specialties text[] not null default '{}',
  excluded_services text[] not null default '{}',

  -- 2. Zone d'intervention
  base_city text,
  intervention_radius_km numeric,
  travel_fee_ht numeric,
  travel_fee_per_km numeric,

  -- 3. Horaires
  working_days text[] not null default '{}',
  work_start_time text,
  work_end_time text,
  urgent_available boolean not null default false,

  -- 4. Chiffrage
  default_vat_rate numeric,
  hourly_rate_ht numeric,
  diagnostic_fee_ht numeric,
  default_margin_percent numeric,
  payment_terms text,

  -- 5. Marques / préférences
  preferred_brands text[] not null default '{}',
  avoided_brands text[] not null default '{}',
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artisan_business_profile_artisan_id_idx
  on artisan_business_profile (artisan_id);

-- 6. Catalogue simple de prestations
create table if not exists artisan_service_catalog (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  name text not null,
  category text,
  price_ht numeric,
  unit text,
  estimated_duration_minutes integer,
  vat_rate numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artisan_service_catalog_artisan_id_idx
  on artisan_service_catalog (artisan_id);
