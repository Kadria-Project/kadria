-- Fondation planning d'equipe multi-utilisateur (Lot multi-user, Phase 1).
-- Cette migration est idempotente et purement additive : elle etend la
-- table existante `project_appointments` (rendez-vous lies a un projet,
-- migration 20260626_project_appointments.sql) pour supporter
-- l'affectation a un collaborateur au sein d'un tenant, sans supprimer ni
-- renommer aucune colonne existante et sans casser le mode mono-utilisateur
-- actuel ni la creation de RDV depuis la fiche projet.
--
-- IMPORTANT : cette migration n'a PAS ete executee automatiquement contre la
-- base Supabase de production. Aucun outil MCP Supabase (apply_migration /
-- execute_sql) n'etait disponible dans cette session pour l'appliquer. Elle
-- doit etre executee manuellement (Supabase SQL editor ou CLI) par
-- quelqu'un disposant d'un acces direct a la base, en suivant la meme
-- convention que les migrations precedentes de ce depot.
--
-- Portee (Phase 1 uniquement) :
--   - tenant_id (uuid, reference public.tenants) pour rattacher chaque
--     rendez-vous a un workspace, en reprenant la fondation multi-tenant
--     posee par 20260715_multi_tenant_foundation.sql ;
--   - assigned_user_id / created_by_user_id (reference public."Users") pour
--     l'affectation multi-utilisateur ;
--   - event_type couvrant les 10 types prevus (dont certains, comme
--     time_off/training/sick_leave, ne sont pas encore exposes dans l'UI de
--     cette phase mais sont prepares pour les phases 2/3) ;
--   - end_time/all_day/description deja partiellement couverts par la table
--     existante (start_time/end_time) : on ajoute uniquement ce qui manque ;
--   - retro-compatibilite stricte : toutes les lignes existantes recoivent
--     par defaut le tenant du dossier et l'utilisateur proprietaire/
--     principal du workspace comme assigned_user_id, sans jamais modifier
--     start_time/end_time/project_id/artisan_id existants.

-- 1. Nouvelles colonnes sur project_appointments (additive uniquement).
alter table public.project_appointments
  add column if not exists tenant_id uuid,
  add column if not exists assigned_user_id text,
  add column if not exists created_by_user_id text,
  add column if not exists event_type text not null default 'appointment',
  add column if not exists all_day boolean not null default false,
  add column if not exists description text,
  add column if not exists source text not null default 'legacy',
  add column if not exists is_unassigned boolean not null default false;

-- 2. Contrainte de reference vers tenants (best effort : ne bloque pas la
--    migration si public.tenants n'existe pas encore dans l'environnement
--    cible, mais dans ce depot elle a deja ete creee par la migration
--    20260715_multi_tenant_foundation.sql).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tenants'
  ) then
    begin
      alter table public.project_appointments
        add constraint project_appointments_tenant_id_fkey
        foreign key (tenant_id) references public.tenants(id) on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'Users'
  ) then
    begin
      alter table public.project_appointments
        add constraint project_appointments_assigned_user_id_fkey
        foreign key (assigned_user_id) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public.project_appointments
        add constraint project_appointments_created_by_user_id_fkey
        foreign key (created_by_user_id) references public."Users"(id) on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

do $$
begin
  alter table public.project_appointments
    drop constraint if exists project_appointments_event_type_check;

  alter table public.project_appointments
    add constraint project_appointments_event_type_check
    check (event_type in (
      'appointment',
      'intervention',
      'site_visit',
      'estimate',
      'administrative',
      'time_off',
      'training',
      'sick_leave',
      'travel',
      'other'
    ));
end $$;

create index if not exists project_appointments_tenant_id_idx
  on public.project_appointments (tenant_id);

create index if not exists project_appointments_assigned_user_id_idx
  on public.project_appointments (assigned_user_id);

create index if not exists project_appointments_tenant_assigned_idx
  on public.project_appointments (tenant_id, assigned_user_id);

-- 3. Backfill : rattacher les rendez-vous existants a leur tenant (via
--    legacy_artisan_id) et affecter par defaut au proprietaire du
--    workspace, sans jamais toucher aux colonnes historiques.
update public.project_appointments pa
set tenant_id = t.id
from public.tenants t
where pa.tenant_id is null
  and t.legacy_artisan_id = pa.artisan_id;

update public.project_appointments pa
set assigned_user_id = t.owner_user_id::text,
    created_by_user_id = coalesce(pa.created_by_user_id, t.owner_user_id::text)
from public.tenants t
where pa.assigned_user_id is null
  and pa.tenant_id = t.id
  and t.owner_user_id is not null;

update public.project_appointments
set is_unassigned = true
where assigned_user_id is null;

-- 4. RLS : activer et poser des policies coherentes avec la fondation
--    multi-tenant (public.is_tenant_member / is_platform_admin), sans
--    bloquer les routes serveur existantes qui utilisent la service role
--    key (RLS ne s'applique pas a la service role).
alter table public.project_appointments enable row level security;

drop policy if exists project_appointments_tenant_select on public.project_appointments;
create policy project_appointments_tenant_select
  on public.project_appointments
  for select
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

drop policy if exists project_appointments_tenant_write on public.project_appointments;
create policy project_appointments_tenant_write
  on public.project_appointments
  for all
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id is not null and public.is_tenant_member(tenant_id))
  );

comment on column public.project_appointments.tenant_id is
  'Workspace proprietaire du rendez-vous (fondation multi-tenant). Backfill automatique depuis artisan_id.';
comment on column public.project_appointments.assigned_user_id is
  'Utilisateur (public."Users".id) affecte a ce rendez-vous. Backfill: proprietaire du tenant.';
comment on column public.project_appointments.created_by_user_id is
  'Utilisateur ayant cree le rendez-vous.';
comment on column public.project_appointments.event_type is
  'Type d''evenement. Certaines valeurs (time_off, training, sick_leave) sont preparees pour les phases 2/3 et ne sont pas encore exposees dans l''UI.';
comment on column public.project_appointments.is_unassigned is
  'Vrai si aucun collaborateur n''est affecte. Maintenu par l''application a la creation/modification.';
