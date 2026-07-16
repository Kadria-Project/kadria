# Clients V2 test data reset

**TEST DATA ONLY - destructive for the fixed test tenant.**

Run [20260729_reset_clients_v2_test_tenant.sql](../supabase/tests/20260729_reset_clients_v2_test_tenant.sql) in the Supabase SQL Editor. It is deliberately limited to tenant `6392ae57-f34b-48ac-92ca-7faf848b5582` and fails if any audited precondition changes.

The script removes only project-scoped notifications, portal events, appointments, quotes, Vapi calls, Activities and Projects. It does not touch users, tenants, configuration, plans, quotas, catalogues, integrations or external assets. Canonical clients are not removed by this initial reset.

For a rehearsal, keep the final `ROLLBACK`. After exporting optional snapshots from the SQL Editor, replace only the final statement with `COMMIT` to apply. The script verifies every expected count before deletion and every dependent count afterwards.

Suggested optional exports before a commit: `clients`, `Projects`, `project_appointments`, `Devis`, `Activity`, `ProjectClientEvents`, `ArtisanNotifications`, and `VapiCalls`, filtered using the same target tenant and project IDs as the reset script.

Next step: seed the Clients V2 reference dataset in a separate lot.
