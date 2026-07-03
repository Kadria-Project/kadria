-- Journalisation des actions contrôlées de l'Assistant Kadria (V1).
-- Table dédiée : proposée/exécutée/annulée/échouée. Journalisation
-- best-effort côté application (ne bloque jamais l'exécution réelle d'une
-- action) — voir src/lib/assistant/actions.ts (logAssistantAction).
--
-- IMPORTANT : cette migration N'EST PAS appliquée automatiquement. Elle doit
-- être exécutée manuellement (ex: via le SQL editor Supabase ou la CLI).

create table if not exists assistant_action_logs (
  id uuid primary key default gen_random_uuid(),
  artisan_id text not null,
  user_id text,
  action_type text not null,
  status text not null, -- proposed | executed | cancelled | failed
  target_type text, -- project | widget_config | service_profile
  target_id text,
  summary text,
  old_value jsonb,
  new_value jsonb,
  payload jsonb,
  error_message text,
  created_at timestamptz default now(),
  executed_at timestamptz
);

create index if not exists assistant_action_logs_artisan_id_idx
  on assistant_action_logs (artisan_id);

create index if not exists assistant_action_logs_created_at_idx
  on assistant_action_logs (created_at desc);
