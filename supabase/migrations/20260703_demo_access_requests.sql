create table if not exists public.demo_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  first_name text not null,
  last_name text not null,
  company_name text,
  email text not null,
  phone text,
  trade text,
  website text,
  monthly_requests_volume text,
  current_tool text,
  main_need text,
  objective text,
  message text,
  consent_contact boolean not null default false,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked', 'expired')),

  approved_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,

  access_token_hash text,
  access_sent_at timestamptz,
  last_access_at timestamptz,
  access_count integer not null default 0,

  approved_by text,
  internal_note text
);

create index if not exists demo_access_requests_email_idx
  on public.demo_access_requests (lower(email));

create index if not exists demo_access_requests_status_idx
  on public.demo_access_requests (status);

create unique index if not exists demo_access_requests_token_hash_uidx
  on public.demo_access_requests (access_token_hash)
  where access_token_hash is not null;

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
