create extension if not exists pgcrypto;

alter table if exists public.demo_access_requests
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.demo_access_requests
  add column if not exists last_access_at timestamptz;

alter table if exists public.demo_access_requests
  add column if not exists internal_note text;

alter table if exists public.demo_access_requests
  add column if not exists approved_by text;

alter table if exists public.demo_access_requests
  add column if not exists access_sent_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demo_access_requests'
      and column_name = 'id'
      and data_type <> 'uuid'
  ) then
    update public.demo_access_requests
    set id = gen_random_uuid()::text
    where nullif(btrim(id), '') is null;

    with duplicated_ids as (
      select ctid
      from (
        select ctid,
               row_number() over (partition by id order by created_at nulls first, ctid) as rn
        from public.demo_access_requests
        where nullif(btrim(id), '') is not null
      ) ranked
      where rn > 1
    )
    update public.demo_access_requests
    set id = gen_random_uuid()::text
    where ctid in (select ctid from duplicated_ids);

    alter table public.demo_access_requests
      alter column id set default gen_random_uuid()::text;

    alter table public.demo_access_requests
      alter column id set not null;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demo_access_requests'
      and column_name = 'consent_contact'
      and data_type <> 'boolean'
  ) then
    alter table public.demo_access_requests
      alter column consent_contact drop default;

    alter table public.demo_access_requests
      alter column consent_contact type boolean
      using case
        when consent_contact is null then false
        when lower(btrim(consent_contact::text)) in ('true', '1', 'yes', 'oui', 'on') then true
        else false
      end;

    alter table public.demo_access_requests
      alter column consent_contact set default false;

    alter table public.demo_access_requests
      alter column consent_contact set not null;
  end if;
end
$$;

do $$
declare
  col_name text;
begin
  foreach col_name in array array[
    'created_at',
    'updated_at',
    'approved_at',
    'revoked_at',
    'expires_at',
    'access_sent_at',
    'last_access_at'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'demo_access_requests'
        and column_name = col_name
        and data_type <> 'timestamp with time zone'
    ) then
      execute format(
        'alter table public.demo_access_requests alter column %I type timestamptz using nullif(btrim(%1$I::text), '''')::timestamptz',
        col_name
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'demo_access_requests'
      and column_name = 'access_count'
      and data_type <> 'integer'
  ) then
    alter table public.demo_access_requests
      alter column access_count type integer
      using case
        when access_count is null then 0
        when btrim(access_count::text) = '' then 0
        when btrim(access_count::text) ~ '^-?\d+$' then btrim(access_count::text)::integer
        else 0
      end;
  end if;

  alter table public.demo_access_requests
    alter column access_count set default 0;

  update public.demo_access_requests
  set access_count = 0
  where access_count is null;

  alter table public.demo_access_requests
    alter column access_count set not null;
end
$$;

do $$
declare
  current_pkey text;
begin
  select tc.constraint_name
  into current_pkey
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name = 'demo_access_requests'
    and tc.constraint_type = 'PRIMARY KEY';

  if current_pkey is not null and current_pkey <> 'demo_access_requests_pkey' then
    execute format('alter table public.demo_access_requests drop constraint %I', current_pkey);
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name = 'demo_access_requests'
      and tc.constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.demo_access_requests
      add constraint demo_access_requests_pkey primary key (id);
  end if;
end
$$;

create unique index if not exists demo_access_requests_id_uidx
  on public.demo_access_requests (id);

create index if not exists demo_access_requests_email_idx
  on public.demo_access_requests (lower(email));

create index if not exists demo_access_requests_status_idx
  on public.demo_access_requests (status);

create unique index if not exists demo_access_requests_token_hash_uidx
  on public.demo_access_requests (access_token_hash)
  where access_token_hash is not null;

create index if not exists demo_access_requests_expires_at_idx
  on public.demo_access_requests (expires_at);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'demo_access_requests'
      and constraint_name = 'demo_access_requests_status_check'
  ) and not exists (
    select 1
    from public.demo_access_requests
    where status not in ('pending', 'approved', 'rejected', 'revoked', 'expired')
  ) then
    alter table public.demo_access_requests
      add constraint demo_access_requests_status_check
      check (status in ('pending', 'approved', 'rejected', 'revoked', 'expired'));
  end if;
end
$$;

create or replace function public.set_demo_access_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_demo_access_requests_updated_at on public.demo_access_requests;

create trigger trg_demo_access_requests_updated_at
before update on public.demo_access_requests
for each row
execute function public.set_demo_access_requests_updated_at();
