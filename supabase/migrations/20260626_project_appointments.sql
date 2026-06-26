-- Table de stockage des rendez-vous pris via l'assistant de prise de
-- rendez-vous Google Calendar (V1), rattachés à un projet/dossier.
-- NOTE: ce fichier n'a PAS été exécuté contre une base Supabase réelle. Il
-- documente le schéma attendu et doit être exécuté manuellement (Supabase
-- SQL editor ou CLI) avant la mise en production de la fonctionnalité.
--
-- Convention : artisan_id et project_id sont stockés en `text` (et non
-- `uuid`) pour rester cohérent avec calendar_integrations et le reste du
-- code existant (src/lib/airtable.ts, AuthPayload.artisanId), qui traite
-- ces identifiants comme des chaînes (compatibilité Airtable/legacy).
--
-- Important : cette table ne modifie en rien la table `projects` ni son
-- enum `status` — le rendez-vous est simplement rattaché via `project_id`.

create table if not exists project_appointments (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  project_id text not null,
  provider text not null default 'google',
  google_event_id text,
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  client_name text,
  client_email text,
  client_phone text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_appointments_artisan_project_idx
  on project_appointments (artisan_id, project_id);
