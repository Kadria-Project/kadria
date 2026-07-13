-- Lot 5.5 - Pilotage et supervision des automatisations.
-- Migration additive, idempotente et NON executee automatiquement.
-- A appliquer manuellement dans Supabase SQL Editor ou via la CLI.

alter table public.tenants
  add column if not exists automation_paused boolean not null default false,
  add column if not exists automation_paused_at timestamptz,
  add column if not exists automation_paused_by uuid references public."Users"(id) on delete set null,
  add column if not exists automation_pause_reason text,
  add column if not exists automation_last_cron_at timestamptz,
  add column if not exists automation_last_cron_success_at timestamptz,
  add column if not exists automation_last_cron_error_at timestamptz,
  add column if not exists automation_last_cron_error_message text;

create index if not exists tenants_automation_paused_idx
  on public.tenants (automation_paused);
