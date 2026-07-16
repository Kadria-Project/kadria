-- CLIENTS V2 TEST DATA RESET - SQL Editor compatible.
-- Destructive only for the fixed test tenant below. Do not run in production.
-- For a rehearsal, replace the final COMMIT with ROLLBACK.

begin;

do $$
declare
  target_tenant constant uuid := '6392ae57-f34b-48ac-92ca-7faf848b5582';
  expected_projects constant integer := 11;
  expected_appointments constant integer := 12;
  expected_devis constant integer := 38;
  expected_activities constant integer := 77;
  expected_events constant integer := 10;
  expected_notifications constant integer := 2;
  expected_vapi_calls constant integer := 1;
  actual_count integer;
  project_ids text[];
begin
  if not exists (select 1 from public.tenants where id = target_tenant) then
    raise exception 'CLIENTS_V2_RESET_TARGET_TENANT_NOT_FOUND';
  end if;

  select array_agg(id::text) into project_ids
  from public."Projects" where tenant_id = target_tenant;
  actual_count := cardinality(coalesce(project_ids, array[]::text[]));
  if actual_count <> expected_projects then
    raise exception 'CLIENTS_V2_RESET_PROJECT_COUNT_MISMATCH: expected %, got %', expected_projects, actual_count;
  end if;

  select count(*) into actual_count from public.project_appointments where tenant_id = target_tenant and project_id = any(project_ids);
  if actual_count <> expected_appointments then raise exception 'CLIENTS_V2_RESET_APPOINTMENT_COUNT_MISMATCH'; end if;
  select count(*) into actual_count from public."Devis" where tenant_id = target_tenant and project_id = any(project_ids);
  if actual_count <> expected_devis then raise exception 'CLIENTS_V2_RESET_DEVIS_COUNT_MISMATCH'; end if;
  select count(*) into actual_count from public."Activity" where project_id = any(project_ids);
  if actual_count <> expected_activities then raise exception 'CLIENTS_V2_RESET_ACTIVITY_COUNT_MISMATCH'; end if;
  select count(*) into actual_count from public."ProjectClientEvents" where project_id::text = any(project_ids);
  if actual_count <> expected_events then raise exception 'CLIENTS_V2_RESET_PORTAL_EVENT_COUNT_MISMATCH'; end if;
  select count(*) into actual_count from public."ArtisanNotifications" where tenant_id = target_tenant and project_id::text = any(project_ids);
  if actual_count <> expected_notifications then raise exception 'CLIENTS_V2_RESET_NOTIFICATION_COUNT_MISMATCH'; end if;
  select count(*) into actual_count from public."VapiCalls" where tenant_id = target_tenant and project_id = any(project_ids);
  if actual_count <> expected_vapi_calls then raise exception 'CLIENTS_V2_RESET_VAPI_COUNT_MISMATCH'; end if;

  -- All deletes use the explicit pre-collected project IDs; no tenant-wide event deletion.
  delete from public."ArtisanNotifications" where tenant_id = target_tenant and project_id::text = any(project_ids);
  delete from public."ProjectClientEvents" where project_id::text = any(project_ids);
  delete from public.project_appointments where tenant_id = target_tenant and project_id = any(project_ids);
  delete from public."Devis" where tenant_id = target_tenant and project_id = any(project_ids);
  delete from public."VapiCalls" where tenant_id = target_tenant and project_id = any(project_ids);
  delete from public."Activity" where project_id = any(project_ids);
  delete from public."Projects" where tenant_id = target_tenant and id::text = any(project_ids);

  if exists (select 1 from public."Projects" where tenant_id = target_tenant)
     or exists (select 1 from public.project_appointments where tenant_id = target_tenant and project_id = any(project_ids))
     or exists (select 1 from public."Devis" where tenant_id = target_tenant and project_id = any(project_ids))
     or exists (select 1 from public."Activity" where project_id = any(project_ids))
     or exists (select 1 from public."ProjectClientEvents" where project_id::text = any(project_ids))
     or exists (select 1 from public."ArtisanNotifications" where tenant_id = target_tenant and project_id::text = any(project_ids))
     or exists (select 1 from public."VapiCalls" where tenant_id = target_tenant and project_id = any(project_ids)) then
    raise exception 'CLIENTS_V2_RESET_POSTCONDITION_FAILED';
  end if;
end;
$$;

-- Use ROLLBACK for rehearsal. Change only this line to COMMIT for the approved reset.
rollback;
