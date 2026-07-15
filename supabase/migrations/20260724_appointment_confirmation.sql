-- Confirmation client distincte du statut technique du rendez-vous.
-- Migration additive : a appliquer manuellement apres 20260723.
alter table public.project_appointments
  add column if not exists confirmation_status text not null default 'pending',
  add column if not exists confirmation_source text,
  add column if not exists confirmation_note text,
  add column if not exists confirmation_updated_at timestamptz,
  add column if not exists confirmation_updated_by text,
  add column if not exists confirmation_version integer not null default 0,
  add column if not exists confirmation_activity_id text,
  add column if not exists confirmation_request_id text;

alter table public.project_appointments
  add constraint project_appointments_confirmation_status_check check (confirmation_status in ('pending', 'confirmed', 'change_requested', 'cancelled')),
  add constraint project_appointments_confirmation_source_check check (confirmation_source is null or confirmation_source in ('artisan', 'client', 'system', 'external_calendar')),
  add constraint project_appointments_confirmation_version_check check (confirmation_version >= 0);

create or replace function public.confirm_project_appointment(
  p_appointment_id uuid, p_tenant_id uuid, p_status text, p_source text,
  p_note text default null, p_expected_version integer default null, p_request_id text default null,
  p_actor_user_id text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_appointment public.project_appointments%rowtype; v_activity_id text; v_description text; v_activity_updated boolean := false;
begin
  select * into v_appointment from public.project_appointments where id = p_appointment_id and tenant_id = p_tenant_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_status not in ('pending', 'confirmed', 'change_requested', 'cancelled') or p_source not in ('artisan', 'client', 'system', 'external_calendar') then raise exception 'INVALID_CONFIRMATION' using errcode = 'P0001'; end if;
  if p_request_id is not null and p_request_id <> '' and p_request_id = v_appointment.confirmation_request_id then
    return jsonb_build_object('appointment_id', v_appointment.id, 'confirmation_version', v_appointment.confirmation_version, 'idempotent', true);
  end if;
  if p_expected_version is not null and p_expected_version <> v_appointment.confirmation_version then raise exception 'CONFIRMATION_VERSION_CONFLICT' using errcode = 'P0001'; end if;
  update public.project_appointments set confirmation_status = p_status, confirmation_source = p_source, confirmation_note = nullif(btrim(coalesce(p_note, '')), ''), confirmation_updated_at = now(), confirmation_updated_by = nullif(p_actor_user_id, ''), confirmation_version = v_appointment.confirmation_version + 1, confirmation_request_id = nullif(p_request_id, '') where id = v_appointment.id;
  if v_appointment.project_id is not null then
    v_description := concat_ws(' | ', case p_status when 'confirmed' then 'Rendez-vous confirmé' when 'change_requested' then 'Changement de rendez-vous demandé' when 'cancelled' then 'Rendez-vous annulé' else 'Rendez-vous à confirmer' end, nullif(btrim(coalesce(p_note, '')), ''));
    if v_appointment.confirmation_activity_id is not null then
      update public."Activity" set action = 'APPOINTMENT_CONFIRMATION', description = v_description, created_at = now() where id::text = v_appointment.confirmation_activity_id and project_id = v_appointment.project_id;
      v_activity_updated := found;
    end if;
    if not v_activity_updated then
      insert into public."Activity" (project_id, action, description, created_at) values (v_appointment.project_id, 'APPOINTMENT_CONFIRMATION', v_description, now()) returning id::text into v_activity_id;
      update public.project_appointments set confirmation_activity_id = v_activity_id where id = v_appointment.id;
    else
      v_activity_id := v_appointment.confirmation_activity_id;
    end if;
  end if;
  return jsonb_build_object('appointment_id', v_appointment.id, 'project_id', v_appointment.project_id, 'activity_id', v_activity_id, 'confirmation_version', v_appointment.confirmation_version + 1, 'idempotent', false);
end; $$;
revoke all on function public.confirm_project_appointment(uuid, uuid, text, text, text, integer, text, text) from public;
grant execute on function public.confirm_project_appointment(uuid, uuid, text, text, text, integer, text, text) to service_role;
