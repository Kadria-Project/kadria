-- Bibliothèque métier évolutive : enregistre les métiers saisis via "Autre
-- métier..." mais non encore supportés par la taxonomie (src/config/trade-taxonomy.ts),
-- afin de constituer automatiquement une liste de métiers à intégrer dans les
-- prochaines versions. Nouveau socle indépendant, ne modifie aucune table
-- existante.
--
-- Convention : artisan_id en `text` (cohérent avec artisan_business_profile,
-- calendar_integrations, AuthPayload.artisanId).

create table if not exists unknown_trade_reports (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null,
  normalized_name text not null unique,
  occurrence_count integer not null default 1,
  specialties jsonb not null default '[]'::jsonb,
  last_artisan_id text,
  first_reported_at timestamptz not null default now(),
  last_reported_at timestamptz not null default now()
);

create index if not exists unknown_trade_reports_occurrence_idx
  on unknown_trade_reports (occurrence_count desc);
