-- Multi-user lot 2: invitations collaborateurs, journal d'activite et garde-fous
-- IMPORTANT : cette migration doit etre appliquee manuellement sur Supabase.

create extension if not exists pgcrypto;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."Users" u
    where u.id = public.current_app_user_id()
      and lower(coalesce(u.role, '')) = 'admin'
  )
$$;

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = public.current_app_user_id()
      and tm.status = 'active'
  )
$$;

create or replace function public.is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = public.current_app_user_id()
      and tm.status = 'active'
      and tm.role in ('owner', 'admin')
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  first_name text null,
  last_name text null,
  role text not null,
  job_title text null,
  token_hash text not null,
  status text not null default 'pending',
  invited_by uuid not null references public."Users"(id) on delete restrict,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  last_sent_at timestamptz not null default timezone('utc', now()),
  send_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tenant_invitations_role_check
    check (role in ('owner', 'admin', 'manager', 'member', 'viewer')),
  constraint tenant_invitations_status_check
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  constraint tenant_invitations_send_count_check
    check (send_count >= 1),
  constraint tenant_invitations_email_lowercase_check
    check (email = lower(email))
);

create unique index if not exists tenant_invitations_pending_email_unique
  on public.tenant_invitations (tenant_id, email)
  where status = 'pending';

create index if not exists tenant_invitations_tenant_idx
  on public.tenant_invitations (tenant_id);

create index if not exists tenant_invitations_email_idx
  on public.tenant_invitations (email);

create index if not exists tenant_invitations_status_idx
  on public.tenant_invitations (status);

create index if not exists tenant_invitations_expires_at_idx
  on public.tenant_invitations (expires_at);

create unique index if not exists tenant_invitations_token_hash_unique
  on public.tenant_invitations (token_hash);

drop trigger if exists tenant_invitations_updated_at on public.tenant_invitations;
create trigger tenant_invitations_updated_at
before update on public.tenant_invitations
for each row
execute function public.set_updated_at();

create table if not exists public.tenant_activity_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid null references public."Users"(id) on delete set null,
  target_user_id uuid null references public."Users"(id) on delete set null,
  target_email text null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tenant_activity_logs_tenant_idx
  on public.tenant_activity_logs (tenant_id, created_at desc);

create index if not exists tenant_activity_logs_event_type_idx
  on public.tenant_activity_logs (event_type);

create unique index if not exists tenant_members_unique_tenant_user
  on public.tenant_members (tenant_id, user_id);

create or replace function public.prevent_last_owner_mutation()
returns trigger
language plpgsql
as $$
declare
  owner_count integer;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  select count(*)
  into owner_count
  from public.tenant_members tm
  where tm.tenant_id = old.tenant_id
    and tm.role = 'owner'
    and tm.status = 'active';

  if owner_count <= 1 then
    if tg_op = 'DELETE' then
      raise exception 'Le dernier owner ne peut pas etre supprime.';
    end if;

    if new.role <> 'owner' or new.status <> 'active' then
      raise exception 'Le dernier owner ne peut pas etre suspendu, revoque ou retrograde.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tenant_members_prevent_last_owner_update on public.tenant_members;
create trigger tenant_members_prevent_last_owner_update
before update on public.tenant_members
for each row
execute function public.prevent_last_owner_mutation();

drop trigger if exists tenant_members_prevent_last_owner_delete on public.tenant_members;
create trigger tenant_members_prevent_last_owner_delete
before delete on public.tenant_members
for each row
execute function public.prevent_last_owner_mutation();

alter table public.tenant_invitations enable row level security;
alter table public.tenant_activity_logs enable row level security;

drop policy if exists tenant_invitations_select on public.tenant_invitations;
create policy tenant_invitations_select
on public.tenant_invitations
for select
using (
  public.is_platform_admin()
  or public.is_tenant_admin(tenant_id)
);

drop policy if exists tenant_invitations_insert on public.tenant_invitations;
create policy tenant_invitations_insert
on public.tenant_invitations
for insert
with check (
  public.is_platform_admin()
  or public.is_tenant_admin(tenant_id)
);

drop policy if exists tenant_invitations_update on public.tenant_invitations;
create policy tenant_invitations_update
on public.tenant_invitations
for update
using (
  public.is_platform_admin()
  or public.is_tenant_admin(tenant_id)
)
with check (
  public.is_platform_admin()
  or public.is_tenant_admin(tenant_id)
);

drop policy if exists tenant_activity_logs_select on public.tenant_activity_logs;
create policy tenant_activity_logs_select
on public.tenant_activity_logs
for select
using (
  public.is_platform_admin()
  or public.is_tenant_member(tenant_id)
);

drop policy if exists tenant_activity_logs_insert on public.tenant_activity_logs;
create policy tenant_activity_logs_insert
on public.tenant_activity_logs
for insert
with check (
  public.is_platform_admin()
  or public.is_tenant_admin(tenant_id)
);
