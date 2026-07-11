alter table public."Users"
  add column if not exists professional_phone text;

create table if not exists public.user_vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public."Users"(id) on delete cascade,
  vehicle_type text,
  motorization text,
  fiscal_power numeric(6,2),
  license_plate text,
  ownership_type text,
  is_default boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_vehicle_profiles_tenant_user_unique unique (tenant_id, user_id),
  constraint user_vehicle_profiles_vehicle_type_check
    check (
      vehicle_type is null
      or vehicle_type in ('car', 'van', 'truck', 'motorbike', 'other')
    ),
  constraint user_vehicle_profiles_ownership_type_check
    check (
      ownership_type is null
      or ownership_type in ('company_owned', 'personal', 'leased', 'rented', 'other')
    )
);

create index if not exists user_vehicle_profiles_tenant_id_idx
  on public.user_vehicle_profiles (tenant_id);

create index if not exists user_vehicle_profiles_user_id_idx
  on public.user_vehicle_profiles (user_id);

create index if not exists user_vehicle_profiles_tenant_user_idx
  on public.user_vehicle_profiles (tenant_id, user_id);

create or replace function public.touch_user_vehicle_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_vehicle_profiles_set_updated_at on public.user_vehicle_profiles;
create trigger user_vehicle_profiles_set_updated_at
before update on public.user_vehicle_profiles
for each row
execute function public.touch_user_vehicle_profiles_updated_at();

alter table public.user_vehicle_profiles enable row level security;

drop policy if exists user_vehicle_profiles_select_self on public.user_vehicle_profiles;
create policy user_vehicle_profiles_select_self
  on public.user_vehicle_profiles
  for select
  using (
    public.is_platform_admin()
    or (
      user_id::text = public.current_app_user_id()
      and public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists user_vehicle_profiles_insert_self on public.user_vehicle_profiles;
create policy user_vehicle_profiles_insert_self
  on public.user_vehicle_profiles
  for insert
  with check (
    public.is_platform_admin()
    or (
      user_id::text = public.current_app_user_id()
      and public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists user_vehicle_profiles_update_self on public.user_vehicle_profiles;
create policy user_vehicle_profiles_update_self
  on public.user_vehicle_profiles
  for update
  using (
    public.is_platform_admin()
    or (
      user_id::text = public.current_app_user_id()
      and public.is_tenant_member(tenant_id)
    )
  )
  with check (
    public.is_platform_admin()
    or (
      user_id::text = public.current_app_user_id()
      and public.is_tenant_member(tenant_id)
    )
  );

drop policy if exists user_vehicle_profiles_delete_self on public.user_vehicle_profiles;
create policy user_vehicle_profiles_delete_self
  on public.user_vehicle_profiles
  for delete
  using (
    public.is_platform_admin()
    or (
      user_id::text = public.current_app_user_id()
      and public.is_tenant_member(tenant_id)
    )
  );
