-- Run only against a disposable database after applying the migration.
-- Replace every placeholder with fixture UUIDs. The fixtures must be currently
-- unlinked, must belong to the same tenant, and must be safe to lock briefly.
-- Each scenario ends with ROLLBACK, so no client or project link persists.

\set ON_ERROR_STOP off
\set tenant_id '00000000-0000-0000-0000-000000000000'
\set project_id_one '00000000-0000-0000-0000-000000000001'
\set project_id_two '00000000-0000-0000-0000-000000000002'
\set other_tenant_project_id '00000000-0000-0000-0000-000000000003'

-- One isolated project: one client, one linked project, then idempotent replay.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Backfill', null,
  'test-backfill@example.test', 'test-backfill@example.test',
  '+33600000000', '+33600000000',
  'Paris', '75000', 'FR', 'test', 'legacy-backfill',
  now(), now(), 'client-backfill-test-single', 'client-backfill-test-single-request'
);
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Backfill', null,
  'test-backfill@example.test', 'test-backfill@example.test',
  '+33600000000', '+33600000000',
  'Paris', '75000', 'FR', 'test', 'legacy-backfill',
  now(), now(), 'client-backfill-test-single', 'client-backfill-test-single-request'
);
rollback;

-- A certain multi-project group: one client, two linked projects.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid, :'project_id_two'::uuid],
  'Test', 'Group', null,
  'test-group@example.test', 'test-group@example.test',
  '+33600000001', '+33600000001',
  'Paris', '75000', 'FR', 'test', 'legacy-backfill',
  now(), now(), 'client-backfill-test-group', 'client-backfill-test-group-request'
);
rollback;

-- Expected failures. Each call must fail and the rollback must leave no writes.
-- A project from another tenant.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'other_tenant_project_id'::uuid],
  'Test', 'Tenant', null, 'tenant@example.test', 'tenant@example.test',
  '+33600000002', '+33600000002', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-other-tenant', 'client-backfill-test-other-tenant-request'
);
rollback;

-- Duplicate project IDs.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid, :'project_id_one'::uuid],
  'Test', 'Duplicate', null, 'duplicate@example.test', 'duplicate@example.test',
  '+33600000003', '+33600000003', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-duplicate', 'client-backfill-test-duplicate-request'
);
rollback;

-- Insufficient identity.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  null, null, null, 'identity@example.test', 'identity@example.test',
  '+33600000004', '+33600000004', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-identity', 'client-backfill-test-identity-request'
);
rollback;

-- A project already linked by a different group key.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Linked', null, 'linked@example.test', 'linked@example.test',
  '+33600000005', '+33600000005', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-linked-a', 'client-backfill-test-linked-a-request'
);
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Linked', null, 'linked@example.test', 'linked@example.test',
  '+33600000005', '+33600000005', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-linked-b', 'client-backfill-test-linked-b-request'
);
rollback;

-- The composite foreign key must reject deletion of a linked client.
begin;
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Foreign key', null, 'fk@example.test', 'fk@example.test',
  '+33600000006', '+33600000006', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-fk', 'client-backfill-test-fk-request'
);
delete from public.clients
where tenant_id = :'tenant_id'::uuid
  and legacy_group_key = 'client-backfill-test-fk';
rollback;

-- The row locks prevent a normal concurrent mismatch. This isolated fault
-- injection verifies the defensive update-count guard and full rollback.
begin;
create function public.client_backfill_skip_link_for_test()
returns trigger
language plpgsql
as $$
begin
  return null;
end;
$$;
create trigger skip_client_link_for_test
before update of client_id on public."Projects"
for each row execute function public.client_backfill_skip_link_for_test();
select public.backfill_canonical_client_for_projects(
  :'tenant_id'::uuid, array[:'project_id_one'::uuid],
  'Test', 'Rollback', null, 'rollback@example.test', 'rollback@example.test',
  '+33600000007', '+33600000007', null, null, 'FR', 'test', 'legacy-backfill',
  null, null, 'client-backfill-test-rollback', 'client-backfill-test-rollback-request'
);
rollback;
