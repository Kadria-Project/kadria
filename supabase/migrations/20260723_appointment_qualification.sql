-- Qualification post-rendez-vous V1. Migration additive, à appliquer manuellement.
-- Les identifiants utilisateurs et Activity restent textuels, conformément au schéma existant.

alter table public.project_appointments
  add column if not exists qualification_status text,
  add column if not exists qualification_outcome text,
  add column if not exists qualification_note text,
  add column if not exists qualification_next_action text,
  add column if not exists qualified_at timestamptz,
  add column if not exists qualified_by text,
  add column if not exists qualification_version integer not null default 0,
  add column if not exists qualification_updated_at timestamptz,
  add column if not exists qualification_activity_id text,
  add column if not exists qualification_request_id text;

alter table public.project_appointments
  drop constraint if exists project_appointments_qualification_status_check,
  add constraint project_appointments_qualification_status_check check (
    qualification_status is null or qualification_status in ('completed', 'client_absent', 'reschedule', 'cancelled')
  ),
  drop constraint if exists project_appointments_qualification_outcome_check,
  add constraint project_appointments_qualification_outcome_check check (
    qualification_outcome is null or qualification_outcome in (
      'quote_to_prepare', 'missing_information', 'intervention_confirmed',
      'client_decision_pending', 'project_not_retained', 'no_action_required'
    )
  ),
  drop constraint if exists project_appointments_qualification_version_check,
  add constraint project_appointments_qualification_version_check check (qualification_version >= 0);

create index if not exists project_appointments_qualification_tenant_idx
  on public.project_appointments (tenant_id, qualification_status)
  where qualification_status is not null;

create or replace function public.qualify_project_appointment(
  p_appointment_id uuid,
  p_tenant_id uuid,
  p_actor_user_id text,
  p_status text,
  p_outcome text default null,
  p_note text default null,
  p_next_action text default null,
  p_expected_version integer default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.project_appointments%rowtype;
  v_activity_id text;
  v_activity_description text;
  v_activity_action text := 'APPOINTMENT_QUALIFICATION';
begin
  select * into v_appointment
  from public.project_appointments
  where id = p_appointment_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_status not in ('completed', 'client_absent', 'reschedule', 'cancelled') then
    raise exception 'INVALID_QUALIFICATION_STATUS' using errcode = 'P0001';
  end if;
  if p_outcome is not null and p_outcome not in (
    'quote_to_prepare', 'missing_information', 'intervention_confirmed',
    'client_decision_pending', 'project_not_retained', 'no_action_required'
  ) then
    raise exception 'INVALID_QUALIFICATION_OUTCOME' using errcode = 'P0001';
  end if;

  if p_request_id is not null and p_request_id <> '' and p_request_id = v_appointment.qualification_request_id then
    return jsonb_build_object(
      'appointment_id', v_appointment.id,
      'project_id', v_appointment.project_id,
      'activity_id', v_appointment.qualification_activity_id,
      'qualification_version', v_appointment.qualification_version,
      'idempotent', true
    );
  end if;

  if p_expected_version is not null and p_expected_version <> v_appointment.qualification_version then
    raise exception 'QUALIFICATION_VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  update public.project_appointments
  set qualification_status = p_status,
      qualification_outcome = p_outcome,
      qualification_note = nullif(btrim(coalesce(p_note, '')), ''),
      qualification_next_action = nullif(btrim(coalesce(p_next_action, '')), ''),
      qualified_at = now(),
      qualified_by = p_actor_user_id,
      qualification_updated_at = now(),
      qualification_version = v_appointment.qualification_version + 1,
      qualification_request_id = nullif(p_request_id, '')
  where id = v_appointment.id;

  if v_appointment.project_id is not null then
    v_activity_description := concat_ws(' | ',
      case p_status
        when 'completed' then 'Rendez-vous réalisé'
        when 'client_absent' then 'Client absent au rendez-vous'
        when 'reschedule' then 'Rendez-vous à replanifier'
        when 'cancelled' then 'Rendez-vous annulé'
      end,
      case when p_outcome is not null then 'Résultat : ' || replace(p_outcome, '_', ' ') end,
      nullif(btrim(coalesce(p_note, '')), ''),
      case when nullif(btrim(coalesce(p_next_action, '')), '') is not null then 'Prochaine décision : ' || btrim(p_next_action) end
    );

    if v_appointment.qualification_activity_id is not null then
      update public."Activity"
      set action = v_activity_action,
          description = v_activity_description,
          created_at = now()
      where id::text = v_appointment.qualification_activity_id
        and project_id = v_appointment.project_id;
    end if;

    if not found then
      insert into public."Activity" (project_id, action, description, created_at)
      values (v_appointment.project_id, v_activity_action, v_activity_description, now())
      returning id::text into v_activity_id;

      update public.project_appointments
      set qualification_activity_id = v_activity_id
      where id = v_appointment.id;
    else
      v_activity_id := v_appointment.qualification_activity_id;
    end if;
  end if;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'project_id', v_appointment.project_id,
    'activity_id', v_activity_id,
    'qualification_version', v_appointment.qualification_version + 1,
    'idempotent', false
  );
end;
$$;

revoke all on function public.qualify_project_appointment(uuid, uuid, text, text, text, text, text, integer, text) from public;
grant execute on function public.qualify_project_appointment(uuid, uuid, text, text, text, text, text, integer, text) to service_role;
