-- Automatisations metier configurables (Lot 5.4).
-- Migration additive, idempotente et NON executee automatiquement.
-- A appliquer manuellement dans Supabase SQL Editor ou via la CLI.

create table if not exists public.business_automations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null,
  enabled boolean not null default false,
  mode text not null default 'approval_required',
  delay_value integer,
  delay_unit text,
  channel text,
  requires_approval boolean not null default true,
  conditions jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public."Users"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  constraint business_automations_tenant_type_unique unique (tenant_id, type),
  constraint business_automations_type_check check (
    type in (
      'quote_followup',
      'review_request',
      'won_project_followup',
      'unassigned_project_alert',
      'appointment_reminder',
      'assignment_notification'
    )
  ),
  constraint business_automations_mode_check check (
    mode in ('manual', 'approval_required', 'automatic')
  ),
  constraint business_automations_delay_check check (
    delay_value is null or delay_value >= 0
  ),
  constraint business_automations_channel_check check (
    channel is null or channel in ('email', 'internal')
  )
);

create index if not exists business_automations_tenant_idx
  on public.business_automations (tenant_id);

create index if not exists business_automations_enabled_idx
  on public.business_automations (enabled, mode);

create table if not exists public.business_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.business_automations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  status text not null default 'pending',
  trigger_reason text not null,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  executed_by uuid references public."Users"(id) on delete set null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ignored_at timestamptz,
  constraint business_automation_runs_idempotency_unique unique (idempotency_key),
  constraint business_automation_runs_status_check check (
    status in ('pending', 'prepared', 'executing', 'succeeded', 'failed', 'ignored')
  )
);

create index if not exists business_automation_runs_tenant_idx
  on public.business_automation_runs (tenant_id, status, created_at desc);

create index if not exists business_automation_runs_automation_idx
  on public.business_automation_runs (automation_id, created_at desc);

create index if not exists business_automation_runs_entity_idx
  on public.business_automation_runs (entity_type, entity_id);

alter table public.business_automations enable row level security;
alter table public.business_automation_runs enable row level security;

drop policy if exists business_automations_tenant_select on public.business_automations;
create policy business_automations_tenant_select
  on public.business_automations
  for select
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

drop policy if exists business_automations_tenant_write on public.business_automations;
create policy business_automations_tenant_write
  on public.business_automations
  for all
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

drop policy if exists business_automation_runs_tenant_select on public.business_automation_runs;
create policy business_automation_runs_tenant_select
  on public.business_automation_runs
  for select
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

drop policy if exists business_automation_runs_tenant_write on public.business_automation_runs;
create policy business_automation_runs_tenant_write
  on public.business_automation_runs
  for all
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );
