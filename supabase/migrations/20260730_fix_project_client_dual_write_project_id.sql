-- Fix the dual-write RPC for legacy Projects tables whose id has no default.
create or replace function public.create_project_with_canonical_client(
  p_tenant_id uuid, p_request_id text, p_payload_hash text, p_source text,
  p_client_mode text, p_existing_client_id uuid, p_client_payload jsonb,
  p_project_payload jsonb, p_outcome text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_request public.project_creation_requests%rowtype; v_client_id uuid; v_project_id uuid;
begin
  if p_tenant_id is null or coalesce(length(trim(p_request_id)),0)=0 or p_payload_hash !~ '^[a-f0-9]{64}$' or coalesce(length(trim(p_source)),0)=0 then raise exception 'PROJECT_CREATION_PAYLOAD_INVALID' using errcode='P0001'; end if;
  if p_client_mode not in ('existing_client','create_client','no_client') or p_outcome not in ('exact_match','no_match','ambiguous_match','insufficient_identity','resolver_error') then raise exception 'PROJECT_CREATION_MODE_INVALID' using errcode='P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_request_id, 0));
  select * into v_request from public.project_creation_requests where tenant_id=p_tenant_id and request_id=p_request_id for update;
  if found then
    if v_request.payload_hash <> p_payload_hash then raise exception 'PROJECT_CREATION_IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
    return jsonb_build_object('project_id',v_request.project_id,'client_id',v_request.client_id,'outcome',v_request.outcome,'idempotent',true);
  end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id) then raise exception 'PROJECT_CREATION_TENANT_NOT_FOUND' using errcode='P0001'; end if;
  if p_client_mode='existing_client' then
    select id into v_client_id from public.clients where id=p_existing_client_id and tenant_id=p_tenant_id;
    if not found then raise exception 'PROJECT_CREATION_CLIENT_TENANT_MISMATCH' using errcode='P0001'; end if;
  elsif p_client_mode='create_client' then
    if p_client_payload is null then raise exception 'PROJECT_CREATION_CLIENT_REQUIRED' using errcode='P0001'; end if;
    insert into public.clients(tenant_id,first_name,last_name,company_name,email,normalized_email,phone,normalized_phone,address_line1,postal_code,city,country_code,status,acquisition_source,created_from)
    values(p_tenant_id,nullif(trim(p_client_payload->>'firstName'),''),nullif(trim(p_client_payload->>'lastName'),''),nullif(trim(p_client_payload->>'companyName'),''),nullif(trim(p_client_payload->>'email'),''),nullif(trim(p_client_payload->>'normalizedEmail'),''),nullif(trim(p_client_payload->>'phone'),''),nullif(trim(p_client_payload->>'normalizedPhone'),''),nullif(trim(p_client_payload->>'addressLine1'),''),nullif(trim(p_client_payload->>'postalCode'),''),nullif(trim(p_client_payload->>'city'),''),coalesce(nullif(trim(p_client_payload->>'countryCode'),''),'FR'),'prospect',nullif(trim(p_client_payload->>'acquisitionSource'),''),coalesce(nullif(trim(p_client_payload->>'createdFrom'),''),'project_creation')) returning id into v_client_id;
  end if;
  v_project_id := gen_random_uuid();
  insert into public."Projects"(id,tenant_id,client_id,artisan_id,client_name,client_first_name,client_phone,client_email,site_address,city,postal_code,latitude,longitude,trade,project_type,budget,desired_timeline,maturity,ai_summary,project_title,chat_history,trade_answers,completeness_score,status,lead_status,contacted,source,call_id,assigned_to,responsible_user_id,responsible_assigned_at,responsible_assigned_by,photos,created_at)
  values(v_project_id,p_tenant_id,v_client_id,p_project_payload->>'artisan_id',p_project_payload->>'client_name',p_project_payload->>'client_first_name',p_project_payload->>'client_phone',p_project_payload->>'client_email',p_project_payload->>'site_address',p_project_payload->>'city',nullif(p_project_payload->>'postal_code',''),nullif(p_project_payload->>'latitude','')::numeric,nullif(p_project_payload->>'longitude','')::numeric,p_project_payload->>'trade',p_project_payload->>'project_type',p_project_payload->>'budget',p_project_payload->>'desired_timeline',p_project_payload->>'maturity',p_project_payload->>'ai_summary',p_project_payload->>'project_title',coalesce(p_project_payload->'chat_history','[]'::jsonb),coalesce(p_project_payload->'trade_answers','[]'::jsonb),coalesce(nullif(p_project_payload->>'completeness_score','')::int,0),coalesce(p_project_payload->>'status','Nouveau'),coalesce(p_project_payload->>'lead_status','Nouveau'),coalesce(nullif(p_project_payload->>'contacted','')::boolean,false),p_source,p_project_payload->>'call_id',p_project_payload->>'assigned_to',nullif(p_project_payload->>'responsible_user_id','')::uuid,nullif(p_project_payload->>'responsible_assigned_at','')::timestamptz,nullif(p_project_payload->>'responsible_assigned_by','')::uuid,coalesce(p_project_payload->'photos','[]'::jsonb)::text,now());
  insert into public.project_creation_requests(tenant_id,request_id,project_id,client_id,source,payload_hash,outcome) values(p_tenant_id,p_request_id,v_project_id,v_client_id,p_source,p_payload_hash,p_outcome);
  return jsonb_build_object('project_id',v_project_id,'client_id',v_client_id,'outcome',p_outcome,'idempotent',false);
end; $$;
