# Clients V2 test data reset

**TEST DATA ONLY - destructive for the fixed test tenant.**

Run [20260729_reset_clients_v2_test_tenant.sql](../supabase/tests/20260729_reset_clients_v2_test_tenant.sql) in the Supabase SQL Editor. It is deliberately limited to tenant `6392ae57-f34b-48ac-92ca-7faf848b5582` and fails if any audited precondition changes.

The script removes only project-scoped notifications, portal events, quotes, Vapi calls, Activities and Projects. It removes all appointments in the fixed tenant: the audited data contains 12 appointments, including 7 linked to the 11 projects and 5 standalone/orphan appointments. It does not touch appointments in any other tenant, users, tenants, configuration, plans, quotas, catalogues, integrations or external assets. Canonical clients are not removed by this initial reset.

For a rehearsal, keep the final `ROLLBACK`. After exporting optional snapshots from the SQL Editor, replace only the final statement with `COMMIT` to apply. The script verifies every expected count before deletion and every dependent count afterwards.

Suggested optional exports before a commit: `clients`, `Projects`, `project_appointments`, `Devis`, `Activity`, `ProjectClientEvents`, `ArtisanNotifications`, and `VapiCalls`, filtered using the same target tenant and project IDs as the reset script.

Next step: seed the Clients V2 reference dataset in a separate lot.
