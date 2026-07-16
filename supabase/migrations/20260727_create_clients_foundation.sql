-- Clients V2 foundation.
-- This migration is additive: it does not backfill Projects.client_id or alter legacy fields.
-- Service-role callers bypass RLS and must derive tenant_id from trusted server context.

create extension if not exists pgcrypto;

do $$
declare
  users_id_type text;
  projects_tenant_id_type text;
  tenants_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into users_id_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname = 'Users'
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if users_id_type is null then
    raise exception 'Preflight failed: public."Users".id was not found.';
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
    into projects_tenant_id_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname = 'Projects'
    and attribute.attname = 'tenant_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if projects_tenant_id_type is distinct from 'uuid' then
    raise exception 'Preflight failed: public."Projects".tenant_id must be uuid, found %.', projects_tenant_id_type;
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
    into tenants_id_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname = 'tenants'
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if tenants_id_type is distinct from 'uuid' then
    raise exception 'Preflight failed: public.tenants.id must be uuid, found %.', tenants_id_type;
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Preflight failed: public.set_updated_at() is required.';
  end if;

  if to_regprocedure('public.is_platform_admin()') is null
    or to_regprocedure('public.is_tenant_member(uuid)') is null then
    raise exception 'Preflight failed: tenant RLS helpers are required.';
  end if;

  execute format($sql$
    create table public.clients (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references public.tenants(id) on delete restrict,
      first_name text,
      last_name text,
      company_name text,
      email text,
      normalized_email text,
      phone text,
      normalized_phone text,
      address_line1 text,
      address_line2 text,
      postal_code text,
      city text,
      country_code text,
      status text not null default 'prospect',
      acquisition_source text,
      created_from text not null default 'legacy',
      created_by_user_id %1$s references public."Users"(id) on delete set null,
      preferred_contact_channel text,
      first_contact_at timestamptz,
      last_contact_at timestamptz,
      legacy_group_key text,
      merged_into_client_id uuid,
      merged_at timestamptz,
      archived_at timestamptz,
      created_at timestamptz not null default timezone('utc', now()),
      updated_at timestamptz not null default timezone('utc', now()),
      constraint clients_identity_check check (
        nullif(btrim(first_name), '') is not null
        or nullif(btrim(last_name), '') is not null
        or nullif(btrim(company_name), '') is not null
      ),
      constraint clients_country_code_check check (
        country_code is null
        or (country_code = upper(country_code) and country_code ~ '^[A-Z]{2}$')
      ),
      constraint clients_status_check check (
        status in ('prospect', 'customer', 'follow_up', 'lost', 'archived')
      ),
      constraint clients_preferred_contact_channel_check check (
        preferred_contact_channel is null
        or preferred_contact_channel in ('phone', 'sms', 'email', 'whatsapp')
      ),
      constraint clients_merge_metadata_check check (
        (merged_into_client_id is null and merged_at is null)
        or (merged_into_client_id is not null and merged_at is not null)
      ),
      constraint clients_merge_target_not_self_check check (
        merged_into_client_id is null or merged_into_client_id <> id
      ),
      constraint clients_merged_client_archived_check check (
        merged_into_client_id is null or status = 'archived'
      ),
      constraint clients_tenant_id_id_key unique (tenant_id, id),
      constraint clients_merge_target_tenant_fkey
        foreign key (tenant_id, merged_into_client_id)
        references public.clients(tenant_id, id)
        on delete restrict
    )
  $sql$, users_id_type);
end;
$$;

alter table public."Projects"
  add column client_id uuid;

alter table public."Projects"
  add constraint projects_client_id_requires_tenant_check
    check (client_id is null or tenant_id is not null);

alter table public."Projects"
  add constraint projects_tenant_client_fkey
    foreign key (tenant_id, client_id)
    references public.clients(tenant_id, id)
    on delete restrict;

create index clients_tenant_idx on public.clients (tenant_id);
create index clients_tenant_normalized_email_idx
  on public.clients (tenant_id, normalized_email)
  where normalized_email is not null and archived_at is null;
create index clients_tenant_normalized_phone_idx
  on public.clients (tenant_id, normalized_phone)
  where normalized_phone is not null and archived_at is null;
create index clients_tenant_status_idx on public.clients (tenant_id, status);
create index clients_tenant_updated_at_idx on public.clients (tenant_id, updated_at desc);
create index clients_tenant_archived_at_idx
  on public.clients (tenant_id, archived_at)
  where archived_at is not null;
create index projects_tenant_client_idx
  on public."Projects" (tenant_id, client_id)
  where client_id is not null;

create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy clients_tenant_select
  on public.clients
  for select
  using (
    public.is_platform_admin()
    or public.is_tenant_member(tenant_id)
  );

create policy clients_tenant_insert
  on public.clients
  for insert
  with check (
    public.is_platform_admin()
    or public.is_tenant_member(tenant_id)
  );

create policy clients_tenant_update
  on public.clients
  for update
  using (
    public.is_platform_admin()
    or public.is_tenant_member(tenant_id)
  )
  with check (
    public.is_platform_admin()
    or public.is_tenant_member(tenant_id)
  );

comment on table public.clients is
  'Canonical Clients V2 records. Legacy project fields remain unchanged until an explicit resolver or backfill is delivered.';
comment on column public.clients.normalized_email is
  'Nullable resolver-owned normalized email. This migration does not populate or maintain it.';
comment on column public.clients.normalized_phone is
  'Nullable resolver-owned normalized phone. This migration does not populate or maintain it.';
comment on column public.clients.legacy_group_key is
  'Optional stable key for a future legacy grouping or resolver process.';
comment on column public.clients.merged_into_client_id is
  'Optional canonical client target after a future merge workflow. Merges remain tenant-scoped.';
comment on column public.clients.preferred_contact_channel is
  'Optional preferred communication channel selected by the client or artisan.';
comment on column public."Projects".client_id is
  'Optional canonical Clients V2 reference. Existing legacy client fields remain the current source until a later resolver/backfill.';
