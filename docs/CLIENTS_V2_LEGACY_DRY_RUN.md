# Clients V2 legacy dry-run

Run only on a trusted server with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`:

```powershell
npm run clients:dry-run -- --dry-run
```

The command refuses to run without `--dry-run`. It uses only Supabase `select` calls, paginates projects by `(created_at, id)`, limits resolution concurrency to four, and writes anonymized local reports to ignored `reports/clients/`.

`client_first_name` is mapped as first name and `client_name` is kept whole as legacy last-name/display context: no unreliable full-name split is attempted. `site_address` is never used as a client address. Existing `client_id` links are counted and skipped.

Reports never contain raw names, contacts, addresses, tokens, or production identifiers. GO requires zero scan errors and no tenant anomaly; shared contacts, cross-identifier conflicts, name-plus-city results, and insufficient identities require human review. No client, project link, Activity, notification, or backfill is written.

When `clients` is empty, `no_match` only describes resolution against existing clients. Legacy clustering is reported separately with disjoint categories: coherent multi-project contact groups, ambiguous contact groups, isolated projects, and insufficient projects. The report exposes `clientsCertainToCreate` plus a bounded estimate: `estimatedClientsMin` counts each ambiguous group once, while `estimatedClientsMax` treats every project in an ambiguous group as distinct. These estimates never include `no_match` a second time.
