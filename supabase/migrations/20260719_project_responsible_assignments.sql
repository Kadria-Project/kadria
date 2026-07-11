-- Lot 4 multi-user : responsable commercial de dossier.
-- Cette migration est additive, idempotente et distincte de la fondation
-- planning (project_appointments.assigned_user_id) : le nouveau champ
-- `Projects.responsible_user_id` represente UNIQUEMENT le responsable
-- commercial du dossier.
--
-- IMPORTANT :
-- - aucun rename / aucune suppression ;
-- - ne jamais confondre avec project_appointments.assigned_user_id ;
-- - la migration n'a pas ete executee automatiquement dans cette session :
--   elle doit etre appliquee manuellement via Supabase SQL editor ou CLI.

alter table public."Projects"
  add column if not exists responsible_user_id text,
  add column if not exists responsible_assigned_at timestamptz,
  add column if not exists responsible_assigned_by text;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Users'
  ) then
    begin
      alter table public."Projects"
        add constraint projects_responsible_user_id_fkey
        foreign key (responsible_user_id) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public."Projects"
        add constraint projects_responsible_assigned_by_fkey
        foreign key (responsible_assigned_by) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists projects_responsible_user_id_idx
  on public."Projects" (responsible_user_id);

create index if not exists projects_tenant_responsible_idx
  on public."Projects" (tenant_id, responsible_user_id);

-- Backfill prudent :
-- - seulement si le tenant du projet est connu ;
-- - seulement si aucun responsable n'est deja present ;
-- - rattachement au owner du tenant, ce qui couvre proprement le mode
--   mono-utilisateur historique sans deviner un collaborateur.
update public."Projects" p
set responsible_user_id = t.owner_user_id::text,
    responsible_assigned_at = coalesce(p.responsible_assigned_at, now()),
    responsible_assigned_by = coalesce(p.responsible_assigned_by, t.owner_user_id::text)
from public.tenants t
where p.responsible_user_id is null
  and p.tenant_id = t.id
  and t.owner_user_id is not null;

alter table public."Projects" enable row level security;

drop policy if exists projects_tenant_select on public."Projects";
create policy projects_tenant_select
  on public."Projects"
  for select
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

drop policy if exists projects_tenant_write on public."Projects";
create policy projects_tenant_write
  on public."Projects"
  for all
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

comment on column public."Projects".responsible_user_id is
  'Responsable commercial du dossier (public."Users".id). Distinct de project_appointments.assigned_user_id.';
comment on column public."Projects".responsible_assigned_at is
  'Horodatage de la derniere affectation du responsable commercial.';
comment on column public."Projects".responsible_assigned_by is
  'Utilisateur ayant defini ou modifie le responsable commercial du dossier.';
