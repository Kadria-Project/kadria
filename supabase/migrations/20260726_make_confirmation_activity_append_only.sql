-- Keep appointment confirmation history append-only. This replaces the
-- previously deployed RPC without changing its public signature.
create or replace function public.confirm_project_appointment(
  p_appointment_id uuid,
  p_tenant_id uuid,
  p_status text,
  p_source text,
  p_note text default null,
  p_expected_version integer default null,
  p_request_id text default null,
  p_actor_user_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.project_appointments%rowtype;
  v_current_version integer;
  v_note text;
  v_description text;
begin
  select *
    into v_appointment
    from public.project_appointments
   where id = p_appointment_id
     and tenant_id = p_tenant_id
   for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_status not in ('pending', 'confirmed', 'change_requested', 'cancelled')
    or p_source not in ('artisan', 'client', 'system', 'external_calendar') then
    raise exception 'INVALID_CONFIRMATION' using errcode = 'P0001';
  end if;

  v_current_version := coalesce(v_appointment.confirmation_version, 0);
  if p_request_id is not null
    and btrim(p_request_id) <> ''
    and p_request_id = v_appointment.confirmation_request_id then
    return jsonb_build_object(
      'appointment_id', v_appointment.id,
      'project_id', v_appointment.project_id,
      'confirmation_version', v_current_version,
      'idempotent', true
    );
  end if;

  if p_expected_version is not null and p_expected_version <> v_current_version then
    raise exception 'CONFIRMATION_VERSION_CONFLICT' using errcode = 'P0001';
  end if;

  v_note := nullif(left(btrim(coalesce(p_note, '')), 1000), '');
  update public.project_appointments
     set confirmation_status = p_status,
         confirmation_source = p_source,
         confirmation_note = v_note,
         confirmation_updated_at = now(),
         confirmation_updated_by = nullif(btrim(coalesce(p_actor_user_id, '')), ''),
         confirmation_version = v_current_version + 1,
         confirmation_request_id = nullif(btrim(coalesce(p_request_id, '')), '')
   where id = v_appointment.id;

  if v_appointment.project_id is not null then
    v_description := case
      when p_status = 'confirmed' and p_source = 'client' then 'Rendez-vous confirmé par le client'
      when p_status = 'confirmed' then 'Rendez-vous confirmé par l''artisan'
      when p_status = 'change_requested' and p_source = 'client' then 'Changement demandé par le client'
      when p_status = 'change_requested' then 'Changement demandé par l''artisan'
      when p_status = 'cancelled' and p_source = 'client' then 'Rendez-vous refusé par le client'
      when p_status = 'cancelled' then 'Rendez-vous annulé par l''artisan'
      else 'Rendez-vous à confirmer'
    end;

    if v_note is not null then
      v_description := v_description || ' | ' || v_note;
    end if;

    insert into public."Activity" (project_id, action, description, created_at)
    values (v_appointment.project_id, 'APPOINTMENT_CONFIRMATION', v_description, now());
  end if;

  return jsonb_build_object(
    'appointment_id', v_appointment.id,
    'project_id', v_appointment.project_id,
    'confirmation_version', v_current_version + 1,
    'idempotent', false
  );
end;
$$;

revoke all on function public.confirm_project_appointment(uuid, uuid, text, text, text, integer, text, text) from public;
grant execute on function public.confirm_project_appointment(uuid, uuid, text, text, text, integer, text, text) to service_role;

-- Post-deployment checks (replace the placeholders and run inside BEGIN/ROLLBACK):
-- select public.confirm_project_appointment('<appointment-id>', '<tenant-id>', 'confirmed', 'client', null, 0, 'confirmation-test-1', null);
-- select public.confirm_project_appointment('<appointment-id>', '<tenant-id>', 'confirmed', 'client', null, 0, 'confirmation-test-1', null); -- idempotent
-- select public.confirm_project_appointment('<appointment-id>', '<tenant-id>', 'change_requested', 'client', 'Indisponible', 1, 'confirmation-test-2', null);
-- select public.confirm_project_appointment('<appointment-id>', '<tenant-id>', 'cancelled', 'client', null, 2, 'confirmation-test-3', null);
