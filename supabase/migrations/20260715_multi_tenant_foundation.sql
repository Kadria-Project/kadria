-- Fondation multi-tenant V1.
-- Cette migration est idempotente et pensée pour cohabiter avec le legacy
-- `artisan_id` texte, sans le supprimer. Le code applicatif continue donc à
-- renseigner `artisan_id` pendant la transition, tout en ajoutant `tenant_id`
-- dès qu'il est disponible.
--
-- IMPORTANT :
-- - le projet ne s'appuie pas aujourd'hui sur Supabase Auth côté app ;
-- - l'identifiant utilisateur réellement exploité est la ligne `public."Users".id`
--   embarquée dans le cookie applicatif `kadria-auth` ;
-- - les policies RLS ci-dessous constituent une première couche de protection
--   pour un futur usage direct Supabase côté client, sans bloquer les routes
--   serveur actuelles qui utilisent la service role key.

do $$
declare
  users_id_type text := 'text';
begin
  select format_type(a.atttypid, a.atttypmod)
    into users_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'Users'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped
  limit 1;

  if users_id_type is null then
    users_id_type := 'text';
  end if;

  execute format($sql$
    create table if not exists public.tenants (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text not null,
      owner_user_id %1$s,
      legacy_artisan_id text,
      status text not null default 'active',
      plan text,
      timezone text not null default 'Europe/Paris',
      locale text not null default 'fr-FR',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  $sql$, users_id_type);

  execute format($sql$
    create table if not exists public.tenant_members (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references public.tenants(id) on delete cascade,
      user_id %1$s not null,
      role text not null default 'member',
      status text not null default 'active',
      job_title text,
      invited_by %1$s,
      invited_at timestamptz,
      joined_at timestamptz,
      last_active_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  $sql$, users_id_type);
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_slug_unique'
  ) then
    alter table public.tenants
      add constraint tenants_slug_unique unique (slug);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_legacy_artisan_id_unique'
  ) then
    alter table public.tenants
      add constraint tenants_legacy_artisan_id_unique unique (legacy_artisan_id);
  end if;

  alter table public.tenants
    drop constraint if exists tenants_status_check;

  alter table public.tenants
    add constraint tenants_status_check check (status in ('active', 'inactive', 'suspended', 'archived'));

  alter table public.tenant_members
    drop constraint if exists tenant_members_role_check;

  alter table public.tenant_members
    add constraint tenant_members_role_check
    check (role in ('owner', 'admin', 'manager', 'member', 'viewer'));

  alter table public.tenant_members
    drop constraint if exists tenant_members_status_check;

  alter table public.tenant_members
    add constraint tenant_members_status_check
    check (status in ('invited', 'active', 'suspended', 'revoked'));

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_members_tenant_user_unique'
  ) then
    alter table public.tenant_members
      add constraint tenant_members_tenant_user_unique unique (tenant_id, user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Users'
  ) then
    begin
      alter table public.tenants
        add constraint tenants_owner_user_id_fkey
        foreign key (owner_user_id) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public.tenant_members
        add constraint tenant_members_user_id_fkey
        foreign key (user_id) references public."Users"(id) on delete cascade;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public.tenant_members
        add constraint tenant_members_invited_by_fkey
        foreign key (invited_by) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'Users'
        and column_name = 'active_tenant_id'
    ) then
      alter table public."Users"
        add column active_tenant_id uuid;
    end if;

    begin
      alter table public."Users"
        add constraint users_active_tenant_id_fkey
        foreign key (active_tenant_id) references public.tenants(id) on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists tenants_slug_idx
  on public.tenants (slug);

create index if not exists tenants_legacy_artisan_id_idx
  on public.tenants (legacy_artisan_id);

create index if not exists tenants_owner_user_id_idx
  on public.tenants (owner_user_id);

create index if not exists tenant_members_tenant_id_idx
  on public.tenant_members (tenant_id);

create index if not exists tenant_members_user_id_idx
  on public.tenant_members (user_id);

create index if not exists tenant_members_tenant_role_idx
  on public.tenant_members (tenant_id, role);

create or replace function public.normalize_tenant_slug(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.current_app_user_id()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'app_user_id', ''),
    nullif(auth.jwt() ->> 'user_id', ''),
    nullif(auth.jwt() ->> 'sub', '')
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public."Users" u
    where u.id::text = public.current_app_user_id()
      and lower(coalesce(u.role, '')) = 'admin'
  );
$$;

create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.status = 'active'
      and tm.user_id::text = public.current_app_user_id()
  );
$$;

create or replace function public.is_tenant_admin(target_tenant_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.status = 'active'
      and tm.user_id::text = public.current_app_user_id()
      and tm.role in ('owner', 'admin')
  );
$$;

with normalized_users as (
  select
    u.id,
    nullif(btrim(coalesce(u.artisan_id, '')), '') as artisan_id,
    nullif(
      btrim(
        coalesce(
          u.company_name,
          trim(concat_ws(' ', nullif(u.first_name, ''), nullif(u.last_name, '')))
        )
      ),
      ''
    ) as display_name,
    nullif(btrim(coalesce(u.plan, '')), '') as plan,
    case
      when lower(coalesce(u.statut, '')) in ('inactive', 'inactif', 'suspendu', 'suspended') then 'inactive'
      else 'active'
    end as tenant_status
  from public."Users" u
  where nullif(btrim(coalesce(u.artisan_id, '')), '') is not null
    and lower(coalesce(u.role, '')) <> 'admin'
),
tenant_source as (
  select distinct on (nu.artisan_id)
    nu.artisan_id,
    coalesce(
      nullif(ac.company_name, ''),
      nu.display_name,
      'Entreprise ' || nu.artisan_id
    ) as tenant_name,
    nu.plan,
    nu.tenant_status,
    nu.id as owner_user_id
  from normalized_users nu
  left join public."Artisan_config" ac
    on ac.artisan_id = nu.artisan_id
  order by
    nu.artisan_id,
    case when lower(coalesce(nu.tenant_status, 'active')) = 'active' then 0 else 1 end,
    nu.id
),
prepared_tenants as (
  select
    gen_random_uuid() as id,
    ts.artisan_id,
    ts.tenant_name,
    ts.plan,
    ts.tenant_status,
    ts.owner_user_id,
    coalesce(
      nullif(public.normalize_tenant_slug(ts.tenant_name), ''),
      'tenant-' || lower(regexp_replace(ts.artisan_id, '[^a-zA-Z0-9]+', '-', 'g'))
    ) as base_slug
  from tenant_source ts
),
slugged_tenants as (
  select
    pt.*,
    case
      when row_number() over (partition by pt.base_slug order by pt.artisan_id) = 1 then pt.base_slug
      else pt.base_slug || '-' || row_number() over (partition by pt.base_slug order by pt.artisan_id)
    end as resolved_slug
  from prepared_tenants pt
)
insert into public.tenants (
  id,
  name,
  slug,
  owner_user_id,
  legacy_artisan_id,
  status,
  plan,
  timezone,
  locale
)
select
  st.id,
  st.tenant_name,
  st.resolved_slug,
  st.owner_user_id,
  st.artisan_id,
  st.tenant_status,
  st.plan,
  'Europe/Paris',
  'fr-FR'
from slugged_tenants st
on conflict (legacy_artisan_id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  owner_user_id = coalesce(public.tenants.owner_user_id, excluded.owner_user_id),
  status = excluded.status,
  plan = coalesce(public.tenants.plan, excluded.plan),
  updated_at = now();

with ranked_users as (
  select
    u.id,
    u.artisan_id,
    coalesce(t.id, t_owner.id) as tenant_id,
    row_number() over (
      partition by u.artisan_id
      order by
        case when lower(coalesce(u.statut, '')) in ('actif', 'active') then 0 else 1 end,
        u.created_at nulls last,
        u.id
    ) as rank_in_artisan
  from public."Users" u
  left join public.tenants t
    on t.legacy_artisan_id = u.artisan_id
  left join public.tenants t_owner
    on t_owner.owner_user_id = u.id
  where nullif(btrim(coalesce(u.artisan_id, '')), '') is not null
    and lower(coalesce(u.role, '')) <> 'admin'
)
insert into public.tenant_members (
  tenant_id,
  user_id,
  role,
  status,
  joined_at,
  created_at,
  updated_at
)
select
  ru.tenant_id,
  ru.id,
  case when ru.rank_in_artisan = 1 then 'owner' else 'admin' end,
  'active',
  now(),
  now(),
  now()
from ranked_users ru
where ru.tenant_id is not null
on conflict (tenant_id, user_id) do update
set
  role = excluded.role,
  status = excluded.status,
  joined_at = coalesce(public.tenant_members.joined_at, excluded.joined_at),
  updated_at = now();

update public.tenants t
set owner_user_id = owners.user_id
from (
  select tm.tenant_id, tm.user_id
  from public.tenant_members tm
  where tm.role = 'owner'
) as owners
where owners.tenant_id = t.id
  and (t.owner_user_id is distinct from owners.user_id);

update public."Users" u
set active_tenant_id = tm.tenant_id
from public.tenant_members tm
where tm.user_id = u.id
  and tm.status = 'active'
  and (
    u.active_tenant_id is null
    or exists (
      select 1
      from public.tenants t
      where t.id = tm.tenant_id
        and t.legacy_artisan_id = u.artisan_id
    )
  );

do $$
declare
  table_name text;
  table_schema text;
  index_name text;
begin
  for table_schema, table_name in
    select *
    from (
      values
        ('public', 'Projects'),
        ('public', 'Artisan_config'),
        ('public', 'Devis'),
        ('public', 'UsageMonthly'),
        ('public', 'UsageEvents'),
        ('public', 'VapiCalls'),
        ('public', 'Activity'),
        ('public', 'Events'),
        ('public', 'ProjectClientEvents'),
        ('public', 'ArtisanNotifications'),
        ('public', 'calendar_integrations'),
        ('public', 'project_appointments'),
        ('public', 'artisan_business_profile'),
        ('public', 'artisan_service_catalog'),
        ('public', 'service_profiles'),
        ('public', 'assistant_action_logs')
    ) as candidate(table_schema, table_name)
  loop
    if exists (
      select 1
      from information_schema.tables
      where information_schema.tables.table_schema = table_schema
        and information_schema.tables.table_name = table_name
    ) then
      execute format(
        'alter table %I.%I add column if not exists tenant_id uuid references public.tenants(id) on delete set null',
        table_schema,
        table_name
      );

      if exists (
        select 1
        from information_schema.columns
        where information_schema.columns.table_schema = table_schema
          and information_schema.columns.table_name = table_name
          and information_schema.columns.column_name = 'artisan_id'
      ) then
        execute format(
          'update %I.%I target set tenant_id = t.id from public.tenants t where target.tenant_id is null and target.artisan_id = t.legacy_artisan_id',
          table_schema,
          table_name
        );
      end if;

      index_name := lower(table_name) || '_tenant_id_idx';
      execute format(
        'create index if not exists %I on %I.%I (tenant_id)',
        index_name,
        table_schema,
        table_name
      );

      if exists (
        select 1
        from information_schema.columns
        where information_schema.columns.table_schema = table_schema
          and information_schema.columns.table_name = table_name
          and information_schema.columns.column_name = 'created_at'
      ) then
        execute format(
          'create index if not exists %I on %I.%I (tenant_id, created_at)',
          lower(table_name) || '_tenant_created_at_idx',
          table_schema,
          table_name
        );
      end if;

      if exists (
        select 1
        from information_schema.columns
        where information_schema.columns.table_schema = table_schema
          and information_schema.columns.table_name = table_name
          and information_schema.columns.column_name = 'status'
      ) then
        execute format(
          'create index if not exists %I on %I.%I (tenant_id, status)',
          lower(table_name) || '_tenant_status_idx',
          table_schema,
          table_name
        );
      end if;
    end if;
  end loop;
end $$;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

drop policy if exists tenants_select_members on public.tenants;
create policy tenants_select_members
  on public.tenants
  for select
  using (public.is_platform_admin() or public.is_tenant_member(id));

drop policy if exists tenant_members_select_same_tenant on public.tenant_members;
create policy tenant_members_select_same_tenant
  on public.tenant_members
  for select
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

do $$
declare
  table_name text;
begin
  for table_name in
    select candidate.table_name
    from (
      values
        ('Projects'),
        ('Artisan_config'),
        ('Devis'),
        ('UsageMonthly'),
        ('UsageEvents'),
        ('VapiCalls'),
        ('Activity'),
        ('Events'),
        ('ProjectClientEvents'),
        ('ArtisanNotifications'),
        ('calendar_integrations'),
        ('project_appointments'),
        ('artisan_business_profile'),
        ('artisan_service_catalog'),
        ('service_profiles'),
        ('assistant_action_logs')
    ) as candidate(table_name)
    where exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = candidate.table_name
        and column_name = 'tenant_id'
    )
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', lower(table_name) || '_tenant_select', table_name);
    execute format(
      'create policy %I on public.%I for select using (public.is_platform_admin() or public.is_tenant_member(tenant_id))',
      lower(table_name) || '_tenant_select',
      table_name
    );
    execute format('drop policy if exists %I on public.%I', lower(table_name) || '_tenant_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert with check (public.is_platform_admin() or public.is_tenant_member(tenant_id))',
      lower(table_name) || '_tenant_insert',
      table_name
    );
    execute format('drop policy if exists %I on public.%I', lower(table_name) || '_tenant_update', table_name);
    execute format(
      'create policy %I on public.%I for update using (public.is_platform_admin() or public.is_tenant_member(tenant_id)) with check (public.is_platform_admin() or public.is_tenant_member(tenant_id))',
      lower(table_name) || '_tenant_update',
      table_name
    );
  end loop;
end $$;

comment on table public.tenants is
  'Entreprise multi-tenant Kadria. legacy_artisan_id reste la clé de compatibilité transitoire avec le mono-tenant historique.';

comment on table public.tenant_members is
  'Membership utilisateur -> tenant. user_id référence la table applicative public."Users", pas auth.users.';

comment on column public.tenants.legacy_artisan_id is
  'Identifiant artisan historique conservé pour la migration progressive des routes et des données.';

comment on column public.tenant_members.role is
  'Rôle tenant futur (owner/admin/manager/member/viewer). Tous les comptes legacy sont initialisés de façon déterministe.';

-- Contrôles à lancer après application live, selon l’environnement cible :
-- select count(distinct artisan_id) from public."Users" where coalesce(role, '') <> 'Admin' and nullif(btrim(coalesce(artisan_id, '')), '') is not null;
-- select count(*) from public.tenants;
-- select count(*) from public.tenant_members;
-- select count(*) from public."Users" u where coalesce(lower(u.role), '') <> 'admin' and nullif(btrim(coalesce(u.artisan_id, '')), '') is not null and not exists (select 1 from public.tenant_members tm where tm.user_id = u.id);
-- select 'Projects' as table_name, count(*) from public."Projects" where tenant_id is null and nullif(btrim(coalesce(artisan_id, '')), '') is not null;
-- select legacy_artisan_id, count(*) from public.tenants group by legacy_artisan_id having count(*) > 1;
-- select tenant_id, count(*) from public.tenant_members where role = 'owner' group by tenant_id having count(*) > 1;
