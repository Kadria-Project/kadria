-- Clients V2: atomic project creation with optional canonical client creation.
create table public.project_creation_requests (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  request_id text not null check (char_length(request_id) between 1 and 160),
  project_id uuid not null references public."Projects"(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  source text not null check (char_length(source) between 1 and 80),
  payload_hash text not null check (char_length(payload_hash) = 64),
  outcome text not null check (outcome in ('exact_match', 'no_match', 'ambiguous_match', 'insufficient_identity', 'resolver_error')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, request_id)
);

alter table public.project_creation_requests enable row level security;
revoke all on table public.project_creation_requests from public, anon, authenticated;

create or replace function public.create_project_with_canonical_client(
  p_tenant_id uuid,
  p_request_id text,
  p_payload_hash text,
  p_source text,
  p_client_mode text,
  p_existing_client_id uuid,
  p_client_payload jsonb,
  p_project_payload jsonb,
  p_outcome text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.project_creation_requests%rowtype;
  v_client_id uuid;
  v_project_id uuid;
  v_project_payload jsonb;
begin
  if p_tenant_id is null or coalesce(length(trim(p_request_id)), 0) = 0
    or p_payload_hash !~ '^[a-f0-9]{64}$' or coalesce(length(trim(p_source)), 0) = 0 then
    raise exception 'PROJECT_CREATION_PAYLOAD_INVALID' using errcode = 'P0001';
  end if;

  if p_client_mode not in ('existing_client', 'create_client', 'no_client')
    or p_outcome not in ('exact_match', 'no_match', 'ambiguous_match', 'insufficient_identity', 'resolver_error') then
    raise exception 'PROJECT_CREATION_MODE_INVALID' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_request_id, 0));
  select * into v_request
  from public.project_creation_requests
  where tenant_id = p_tenant_id and request_id = p_request_id
  for update;

  if found then
    if v_request.payload_hash <> p_payload_hash then
      raise exception 'PROJECT_CREATION_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return jsonb_build_object('project_id', v_request.project_id, 'client_id', v_request.client_id,
      'outcome', v_request.outcome, 'idempotent', true);
  end if;

  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    raise exception 'PROJECT_CREATION_TENANT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_client_mode = 'existing_client' then
    select id into v_client_id from public.clients
    where id = p_existing_client_id and tenant_id = p_tenant_id;
    if not found then raise exception 'PROJECT_CREATION_CLIENT_TENANT_MISMATCH' using errcode = 'P0001'; end if;
  elsif p_client_mode = 'create_client' then
    if p_client_payload is null then raise exception 'PROJECT_CREATION_CLIENT_REQUIRED' using errcode = 'P0001'; end if;
    insert into public.clients (
      tenant_id, first_name, last_name, company_name, email, normalized_email,
      phone, normalized_phone, address_line1, postal_code, city, country_code,
      status, acquisition_source, created_from
    ) values (
      p_tenant_id, nullif(trim(p_client_payload->>'firstName'), ''), nullif(trim(p_client_payload->>'lastName'), ''),
      nullif(trim(p_client_payload->>'companyName'), ''), nullif(trim(p_client_payload->>'email'), ''),
      nullif(trim(p_client_payload->>'normalizedEmail'), ''), nullif(trim(p_client_payload->>'phone'), ''),
      nullif(trim(p_client_payload->>'normalizedPhone'), ''), nullif(trim(p_client_payload->>'addressLine1'), ''),
      nullif(trim(p_client_payload->>'postalCode'), ''), nullif(trim(p_client_payload->>'city'), ''),
      coalesce(nullif(trim(p_client_payload->>'countryCode'), ''), 'FR'), 'prospect',
      nullif(trim(p_client_payload->>'acquisitionSource'), ''), coalesce(nullif(trim(p_client_payload->>'createdFrom'), ''), 'project_creation')
    ) returning id into v_client_id;
  end if;

  -- Keep the established insert payload intact while server-authoritatively setting tenancy and client link.
  v_project_payload := (coalesce(p_project_payload, '{}'::jsonb) - 'id' - 'tenant_id' - 'client_id' - 'created_at' - 'updated_at')
    || jsonb_build_object('tenant_id', p_tenant_id, 'client_id', v_client_id);
  insert into public."Projects"
  select (jsonb_populate_record(null::public."Projects", v_project_payload)).*
  returning id into v_project_id;

  insert into public.project_creation_requests (tenant_id, request_id, project_id, client_id, source, payload_hash, outcome)
  values (p_tenant_id, p_request_id, v_project_id, v_client_id, p_source, p_payload_hash, p_outcome);

  return jsonb_build_object('project_id', v_project_id, 'client_id', v_client_id, 'outcome', p_outcome, 'idempotent', false);
end;
$$;

revoke all on function public.create_project_with_canonical_client(uuid, text, text, text, text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_project_with_canonical_client(uuid, text, text, text, text, uuid, jsonb, jsonb, text) to service_role;
