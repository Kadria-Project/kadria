create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  artisan_id text not null,
  user_id uuid not null references public."Users"(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  revoked_at timestamptz,
  unique (tenant_id, user_id, endpoint)
);

create table if not exists public.push_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  artisan_id text not null,
  user_id uuid not null references public."Users"(id) on delete cascade,
  new_appointment_enabled boolean not null default true,
  appointment_reminder_enabled boolean not null default true,
  appointment_changed_enabled boolean not null default true,
  appointment_cancelled_enabled boolean not null default true,
  appointment_qualification_enabled boolean not null default false,
  reminder_minutes_before integer not null default 60 check (reminder_minutes_before = 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  artisan_id text not null,
  user_id uuid not null references public."Users"(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  appointment_id text,
  notification_type text not null check (notification_type in ('appointment_created', 'appointment_assigned', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder', 'test')),
  dedupe_key text not null unique,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_active_user_idx on public.push_subscriptions (tenant_id, user_id) where revoked_at is null;
create index if not exists push_deliveries_reminder_idx on public.push_notification_deliveries (appointment_id, notification_type, scheduled_for);

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_preferences enable row level security;
alter table public.push_notification_deliveries enable row level security;

-- Push records are accessed only through authenticated Kadria server routes.
-- No client-facing Data API policy is granted; this prevents key material exposure.
