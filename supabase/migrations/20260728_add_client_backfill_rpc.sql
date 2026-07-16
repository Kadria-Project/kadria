-- Transactional, service-role-only primitive for the controlled Clients V2 backfill.
-- This migration deliberately does not execute any backfill.

do $$
declare
  projects_id_type text;
  projects_tenant_id_type text;
  projects_client_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into projects_id_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname = 'Projects'
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

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

  select format_type(attribute.atttypid, attribute.atttypmod)
    into projects_client_id_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace schema on schema.oid = relation.relnamespace
  where schema.nspname = 'public'
    and relation.relname = 'Projects'
    and attribute.attname = 'client_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if projects_id_type is distinct from 'uuid'
    or projects_tenant_id_type is distinct from 'uuid'
    or projects_client_id_type is distinct from 'uuid' then
    raise exception 'Preflight failed: Projects.id, tenant_id, and client_id must be uuid.';
  end if;
end;
$$;

create unique index if not exists clients_tenant_legacy_group_key_unique
  on public.clients (tenant_id, legacy_group_key)
  where legacy_group_key is not null;

create or replace function public.backfill_canonical_client_for_projects(
  p_tenant_id uuid,
  p_project_ids uuid[],
  p_first_name text,
  p_last_name text,
  p_company_name text,
  p_email text,
  p_normalized_email text,
  p_phone text,
  p_normalized_phone text,
  p_city text,
  p_postal_code text,
  p_country_code text,
  p_acquisition_source text,
  p_created_from text,
  p_first_contact_at timestamptz,
  p_last_contact_at timestamptz,
  p_legacy_group_key text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_count integer;
  v_updated_count integer;
  v_existing_client_id uuid;
  v_client_id uuid;
  v_group_key text := nullif(btrim(coalesce(p_legacy_group_key, '')), '');
  v_request_id text := nullif(btrim(coalesce(p_request_id, '')), '');
  v_first_name text := nullif(btrim(coalesce(p_first_name, '')), '');
  v_last_name text := nullif(btrim(coalesce(p_last_name, '')), '');
  v_company_name text := nullif(btrim(coalesce(p_company_name, '')), '');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_normalized_email text := nullif(btrim(coalesce(p_normalized_email, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_normalized_phone text := nullif(btrim(coalesce(p_normalized_phone, '')), '');
  v_created_from text := nullif(btrim(coalesce(p_created_from, '')), '');
begin
  if p_tenant_id is null then
    raise exception 'BACKFILL_TENANT_REQUIRED' using errcode = 'P0001';
  end if;
  if cardinality(p_project_ids) is null or cardinality(p_project_ids) = 0 then
    raise exception 'BACKFILL_PROJECTS_REQUIRED' using errcode = 'P0001';
  end if;
  if (select count(distinct project_id) from unnest(p_project_ids) as project_id(project_id)) <> cardinality(p_project_ids) then
    raise exception 'BACKFILL_DUPLICATE_PROJECT_IDS' using errcode = 'P0001';
  end if;
  if v_group_key is null or length(v_group_key) > 160 then
    raise exception 'BACKFILL_LEGACY_GROUP_KEY_INVALID' using errcode = 'P0001';
  end if;
  if v_request_id is null or length(v_request_id) > 160 then
    raise exception 'BACKFILL_REQUEST_ID_INVALID' using errcode = 'P0001';
  end if;
  if v_first_name is null and v_last_name is null and v_company_name is null then
    raise exception 'BACKFILL_CLIENT_IDENTITY_REQUIRED' using errcode = 'P0001';
  end if;
  if v_normalized_email is null and v_normalized_phone is null then
    raise exception 'BACKFILL_CLIENT_CONTACT_REQUIRED' using errcode = 'P0001';
  end if;
  if v_email is not null and v_normalized_email is null then
    raise exception 'BACKFILL_NORMALIZED_EMAIL_REQUIRED' using errcode = 'P0001';
  end if;
  if v_phone is not null and v_normalized_phone is null then
    raise exception 'BACKFILL_NORMALIZED_PHONE_REQUIRED' using errcode = 'P0001';
  end if;
  if v_created_from is distinct from 'legacy-backfill' then
    raise exception 'BACKFILL_CREATED_FROM_INVALID' using errcode = 'P0001';
  end if;
  if p_first_contact_at is not null and p_last_contact_at is not null and p_first_contact_at > p_last_contact_at then
    raise exception 'BACKFILL_CONTACT_TIMESTAMPS_INVALID' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || '|' || v_group_key, 0));

  select client.id
    into v_existing_client_id
  from public.clients client
  where client.tenant_id = p_tenant_id
    and client.legacy_group_key = v_group_key
  for update;

  if found then
    select count(*)
      into v_project_count
    from public."Projects" project
    where project.tenant_id = p_tenant_id
      and project.id = any(p_project_ids)
      and project.client_id = v_existing_client_id;

    if v_project_count = cardinality(p_project_ids) then
      return jsonb_build_object(
        'success', true,
        'client_id', v_existing_client_id,
        'projects_linked', v_project_count,
        'idempotent', true,
        'legacy_group_key', v_group_key
      );
    end if;

    raise exception 'BACKFILL_LEGACY_GROUP_CONFLICT' using errcode = 'P0001';
  end if;

  perform 1
  from public."Projects" project
  where project.tenant_id = p_tenant_id
    and project.id = any(p_project_ids)
  order by project.id
  for update;

  select count(*)
    into v_project_count
  from public."Projects" project
  where project.tenant_id = p_tenant_id
    and project.id = any(p_project_ids);

  if v_project_count <> cardinality(p_project_ids) then
    raise exception 'BACKFILL_PROJECT_NOT_FOUND_OR_TENANT_MISMATCH' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public."Projects" project
    where project.tenant_id = p_tenant_id
      and project.id = any(p_project_ids)
      and project.client_id is not null
  ) then
    raise exception 'BACKFILL_PROJECT_ALREADY_LINKED' using errcode = 'P0001';
  end if;

  insert into public.clients (
    tenant_id, first_name, last_name, company_name, email, normalized_email,
    phone, normalized_phone, city, postal_code, country_code, status,
    acquisition_source, created_from, preferred_contact_channel,
    first_contact_at, last_contact_at, legacy_group_key
  ) values (
    p_tenant_id, v_first_name, v_last_name, v_company_name, v_email, v_normalized_email,
    v_phone, v_normalized_phone, nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''), nullif(upper(btrim(coalesce(p_country_code, ''))), ''),
    'customer', nullif(btrim(coalesce(p_acquisition_source, '')), ''), v_created_from,
    case when v_normalized_email is not null then 'email' when v_normalized_phone is not null then 'phone' else null end,
    p_first_contact_at, p_last_contact_at, v_group_key
  ) returning id into v_client_id;

  update public."Projects"
  set client_id = v_client_id
  where tenant_id = p_tenant_id
    and id = any(p_project_ids)
    and client_id is null;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> cardinality(p_project_ids) then
    raise exception 'BACKFILL_PROJECT_LINK_COUNT_MISMATCH' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'success', true,
    'client_id', v_client_id,
    'projects_linked', v_updated_count,
    'idempotent', false,
    'legacy_group_key', v_group_key
  );
end;
$$;

revoke all on function public.backfill_canonical_client_for_projects(uuid, uuid[], text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, text, text) from public;
revoke all on function public.backfill_canonical_client_for_projects(uuid, uuid[], text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, text, text) from anon, authenticated;
grant execute on function public.backfill_canonical_client_for_projects(uuid, uuid[], text, text, text, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, text, text) to service_role;
