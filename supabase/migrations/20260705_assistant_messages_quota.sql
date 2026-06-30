-- Adds a monthly counter column for the internal Kadria Assistant (chat
-- interne artisan) to the existing UsageMonthly table, following the same
-- convention as the existing vapi_calls / projects_created counters.
--
-- This file is a PROPOSAL ONLY: it has not been applied against the live
-- database from this session (no active Supabase MCP connection). Apply it
-- manually via the Supabase SQL editor or your migration pipeline.
--
-- Adjust the table name below to match whichever of "UsageMonthly" /
-- "usage_monthly" actually exists in the target environment.

alter table if exists "UsageMonthly"
  add column if not exists assistant_messages integer not null default 0;

-- If your environment uses the lowercase/snake_case variant instead, run:
-- alter table if exists usage_monthly
--   add column if not exists assistant_messages integer not null default 0;
