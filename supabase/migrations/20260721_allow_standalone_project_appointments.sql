-- Project linkage is optional; tenant_id and artisan_id keep the appointment isolated.
alter table public.project_appointments
  alter column project_id drop not null;
