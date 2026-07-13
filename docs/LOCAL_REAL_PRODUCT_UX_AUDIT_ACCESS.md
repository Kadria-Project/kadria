# Local access to the real product for UX/UI audits

## Objective

Allow a local Playwright agent to log into the **real, authenticated artisan
space** (`/dashboard-v2` and below — never `/demo-dashboard`) for future
UX/UI audits, using a dedicated test account. This mechanism only builds the
access infrastructure; it does not perform any audit itself.

## Important architecture correction

The task that produced this mechanism assumed the product's real login flow
is built on Supabase Auth (GoTrue) sessions, with `supabase.auth.admin.generateLink()`
as the "official" mechanism to reuse. After reading the actual codebase,
that assumption does not hold:

- `app/api/auth/verify/route.ts` (the real magic-link verification route)
  does **not** call any Supabase Auth API. It looks up the artisan by email
  in Airtable (`getArtisanByEmail`), checks billing/status
  (`canAccessPlatformAccount`), signs a project-specific JWT with
  `createToken()` from `src/lib/auth-utils.ts`, and sets it as the
  `kadria-auth` cookie (HttpOnly, `secure` in production, `sameSite: lax`,
  7-day maxAge).
- Supabase (`src/lib/supabase/server.ts`, `getSupabaseAdmin()` /
  `supabaseAdmin`) is used purely as a Postgres data store (e.g. `tenants`,
  `tenant_members`) — not as the session/auth provider.

So "reuse the existing official mechanism instead of inventing a new session
format" means, in this codebase, reusing `createToken()` + the `kadria-auth`
cookie — the actual mechanism the real product already uses in production —
not a Supabase GoTrue flow that does not exist here.

## Architecture

```
GET /dev/ux-audit-login              (page, src: app/dev/ux-audit-login/page.tsx)
  -> server-side guard check (src/lib/dev/ux-audit-guard.ts)
  -> if disabled: notFound() (plain 404, indistinguishable from a missing route)
  -> if enabled: minimal page, "Accéder au produit réel" button

GET /api/dev/ux-audit-login          (route, src: app/api/dev/ux-audit-login/route.ts)
  -> server-side guard check (same guard util)
  -> if disabled: 404, no session, no cookie
  -> if enabled:
       - getArtisanByEmail(KADRIA_AUDIT_USER_EMAIL)   [same call as real verify route]
       - canAccessPlatformAccount(...)                 [same call as real verify route]
       - createToken(...)                              [same call as real verify route]
       - Set-Cookie: kadria-auth (same options as real verify route)
       - redirect to /onboarding or /dashboard-v2 (same logic as real verify route)
```

Shared guard logic lives in `src/lib/dev/ux-audit-guard.ts`
(`isUxAuditModeConfigured`, `isLocalHostHeader`,
`assertUxAuditRequestAllowed`, `getConfiguredAuditEmail`).

`middleware.ts` was **not modified**. Its `matcher` only covers
`/dashboard-v2`, `/onboarding`, `/login`, `/admin`, `/demo-dashboard`,
`/demo-parametres` — it never covers `/dev/*` or `/api/dev/*` — so no
middleware change was needed or made. Both the page and the API route
perform their own independent, fail-closed checks before doing anything.

## Vercel deployment assumption (read before use)

This mechanism is designed for, and only reasonably safe under, **this
project's current Vercel deployment architecture**. The Host-header check in
`isLocalHostHeader()` is the load-bearing per-request control, and it is only
trustworthy because:

- Vercel's edge/routing layer does not let a remote client freely set the
  `Host` header seen by the Next.js server/middleware to an arbitrary value
  such as `localhost` — the `Host` reaching the app reflects the actual
  request target (e.g. `*.vercel.app` or the production domain), not a
  client-supplied override.
- `X-Forwarded-Host` and `Forwarded` are deliberately never read by the guard
  (see `isLocalHostHeader` / `assertUxAuditRequestAllowed` in
  `src/lib/dev/ux-audit-guard.ts`), so even if an intermediary added those
  headers, they have no effect.

If this project ever moves off Vercel to a **self-hosted reverse proxy**
(Docker, Nginx, a custom Node server behind another proxy, etc.), this
assumption must be re-evaluated before relying on this mechanism again: a
misconfigured self-hosted proxy could forward a client-controlled `Host`
value as-is, which would let a remote client satisfy the local-host check
that is otherwise unspoofable on Vercel. This is documented as residual risk
**M-1** in `docs/SECURITY_REVIEW_LOCAL_UX_AUDIT_AUTH.md`.

Additional hard rules, regardless of deployment target:

- **Never** expose a local development server with `KADRIA_LOCAL_REAL_AUDIT=true`
  set to the public Internet (e.g. binding to `0.0.0.0` on an open network,
  or running it on a machine with a public IP and no firewall).
- **Never** use this mechanism through a public tunnel (ngrok, Cloudflare
  Tunnel, `localhost.run`, VS Code port forwarding set to "public", etc.).
  Any such tunnel would present a `Host` header that could plausibly be
  `localhost`-like or otherwise satisfy the guard while being reachable from
  the public Internet, defeating the entire point of the check.

## Required environment variables (server-only, never `NEXT_PUBLIC_`)

| Variable | Purpose |
|---|---|
| `KADRIA_LOCAL_REAL_AUDIT` | Must be exactly `"true"` to enable the mechanism at all. |
| `KADRIA_AUDIT_USER_EMAIL` | The exact email of the dedicated test account, e.g. `ux-audit@kadria.test`. |

Both are read only from `process.env` in `src/lib/dev/ux-audit-guard.ts` —
never hardcoded elsewhere. In addition to these two variables, access
requires:

- `process.env.NODE_ENV !== "production"` (checked in code, not just by
  relying on how the app is deployed — see "fail-closed in production"
  below).
- The request's `Host` header must resolve to `localhost`, `127.0.0.1`, or
  `::1` (checked strictly, no wildcard, no trusting
  `X-Forwarded-Host`, so a crafted header on a proxied/deployed environment
  such as Vercel Preview cannot satisfy this).
- The requested email (via `?email=` query param, defaulting to the
  configured value) must match `KADRIA_AUDIT_USER_EMAIL` **exactly**.

All four conditions are independent; missing any one of them keeps the
mechanism fully inert (plain 404 on both the page and the API route, no
session ever created, no cookie ever set).

## Test account expected in Supabase / Airtable

This mechanism does **not** create the test account. It must already exist
before use. Because the real login flow reads from Airtable (via
`getArtisanByEmail`) and the tenant system reads from Supabase Postgres
(`users`, `tenant_members`, `tenants`), the account needs to exist in both
places:

1. **Airtable `Users` table** (or equivalent underlying the `Users` sheet
   used by `getArtisanByEmail`/`TABLES.users`): a row with
   - `email` = the value of `KADRIA_AUDIT_USER_EMAIL` (e.g.
     `ux-audit@kadria.test`)
   - `active` = true
   - `role` != `Admin` (must not carry any global admin role)
   - `statut` = `actif` (or `billingStatus` = `active`/`trialing`) so
     `canAccessPlatformAccount` allows it
   - `companyName`, `firstName`, `lastName`: clearly fictional test values
     (e.g. "Audit UX Kadria (compte de test)")
   - `artisanId`: a dedicated test artisan id, never shared with a real
     artisan's data
2. **Supabase Postgres `users` table**: a row with the same `email`,
   linked via `record_id`/`id` to the Airtable row as the rest of the app
   already expects (see `resolveSessionUser` in
   `src/lib/tenant-context.ts`, which resolves by `session.id`, then
   `email` (`ilike`), then `record_id`).
3. **Supabase Postgres `tenant_members` table**: an `active` membership row
   linking that `users.id` to a **dedicated test tenant** (not a real
   artisan's tenant) in `tenants`, with a non-admin `role` (e.g. `owner` of
   the test tenant only).
4. **Supabase Postgres `tenants` table**: a tenant clearly named/flagged as
   a test tenant (e.g. `slug: 'ux-audit-test'`), containing only fictional
   projects/devis/clients — never real artisan data.

Recommended safety properties for this account:
- No global admin role anywhere.
- Owns/accesses only its own dedicated test tenant — never another
  artisan's data (this falls out naturally from `tenant_members` scoping
  already enforced by `getCurrentTenantContext`).
- Disable at any time by either: deleting/deactivating the Airtable row
  (`active = false`), revoking the `tenant_members` row (`status =
  'revoked'`), or simply removing the `KADRIA_LOCAL_REAL_AUDIT` /
  `KADRIA_AUDIT_USER_EMAIL` env vars, which fully disables the mechanism
  regardless of account state.

**This account was not created as part of this change** — no Supabase or
Airtable credentials are available in the sandbox this change was built in
(no `.env.local`, no service role key). Creating it is left to whoever runs
this locally with real credentials, following the steps above.

## Usage

1. Set the two env vars locally (e.g. in `.env.local`, never committed):
   ```
   KADRIA_LOCAL_REAL_AUDIT=true
   KADRIA_AUDIT_USER_EMAIL=ux-audit@kadria.test
   ```
2. Run `npm run dev`.
3. Visit `http://localhost:3000/dev/ux-audit-login`.
4. Click "Accéder au produit réel". This calls
   `GET /api/dev/ux-audit-login`, which creates a real `kadria-auth` session
   cookie for the configured test account and redirects to `/onboarding` or
   `/dashboard-v2`, exactly like the real magic-link flow would for that
   account.

## Disabling

Remove or unset `KADRIA_LOCAL_REAL_AUDIT` (or set it to anything other than
`"true"`) and/or `KADRIA_AUDIT_USER_EMAIL`. Either alone is sufficient to
make both `/dev/ux-audit-login` and `/api/dev/ux-audit-login` return a plain
404 with no session created. No code change or redeploy is required beyond
the env var change.

## `KADRIA_LOCAL_UX_AUDIT` vs `KADRIA_LOCAL_REAL_AUDIT` — these are two different mechanisms

The names are intentionally similar but they gate **two unrelated
mechanisms**. Do not confuse them; neither variable name was changed by this
document (renaming was explicitly out of scope).

| | `KADRIA_LOCAL_UX_AUDIT` | `KADRIA_LOCAL_REAL_AUDIT` |
|---|---|---|
| Where enforced | `middleware.ts` (inline check inside the `/demo-dashboard`/`/demo-parametres` branch) | `src/lib/dev/ux-audit-guard.ts`, called from `app/dev/ux-audit-login/page.tsx` and `app/api/dev/ux-audit-login/route.ts` |
| What it grants access to | `/demo-dashboard`, `/demo-parametres` — the **demo** product surface (fixture/demo data, no real artisan account) | `/dashboard-v2` and below — the **real, authenticated** artisan product surface |
| Uses a real artisan account | No — bypasses the demo-access approval flow only | Yes — the single, explicitly-configured test account named by `KADRIA_AUDIT_USER_EMAIL` |
| Creates a `kadria-auth` session | No — no cookie is set by this flag; it only skips the demo-access gate in middleware | Yes — sets the real `kadria-auth` JWT cookie via `createToken()`, identical to the production magic-link flow |
| Host/IP check | None beyond `NODE_ENV !== 'production'` | Strict `Host` header check (`isLocalHostHeader`) on every request, in addition to `NODE_ENV !== 'production'` |
| Additional required variable | None | `KADRIA_AUDIT_USER_EMAIL` (exact account email) |
| Purpose | Let a local agent view demo/fixture screens without going through the demo-access request/approval flow | Let a local Playwright agent log into the real product as a dedicated, harmless test account, for UX/UI audits against real screens/data |

If you only need to look at demo/fixture screens, use `KADRIA_LOCAL_UX_AUDIT`.
If you need to audit the real, authenticated product experience
(`/dashboard-v2`), use `KADRIA_LOCAL_REAL_AUDIT` as documented in this file.
Setting one does not enable the other — they are independent flags checked
by independent code paths.

## Security tests performed

All tests below were run against real local builds/servers of this exact
codebase (not a mirror or simulation), using `curl` with explicit `Host`
headers, in this sandbox (no Supabase/Airtable credentials available):

| # | Scenario | Result |
|---|---|---|
| 1 | `npm run build` (production build) | **Succeeded**, both `/dev/ux-audit-login` and `/api/dev/ux-audit-login` compiled as dynamic routes, no errors. |
| 2 | `next start` (NODE_ENV=production), no env vars set | `GET /dev/ux-audit-login` → **404**. `GET /api/dev/ux-audit-login` → **404**. |
| 3 | `next start` (NODE_ENV=production), `KADRIA_LOCAL_REAL_AUDIT=true` and `KADRIA_AUDIT_USER_EMAIL` both set, `Host: localhost` | `GET /dev/ux-audit-login` → **404**. `GET /api/dev/ux-audit-login` → **404**. Confirms `NODE_ENV !== "production"` is enforced in code and cannot be bypassed by setting the other two variables. |
| 4 | `next dev` (NODE_ENV=development), both vars set, `Host: localhost:PORT` | `GET /dev/ux-audit-login` → **200**, renders the minimal "Mode audit local Kadria" page. |
| 5 | Same dev server, `Host: evil.example.com` | `GET /dev/ux-audit-login` → **404**. `GET /api/dev/ux-audit-login` → **404**. Confirms the local-host check is enforced per-request, not just by environment. |
| 6 | Same dev server, `Host: localhost`, `?email=attacker@example.com` (does not match `KADRIA_AUDIT_USER_EMAIL`) | `GET /api/dev/ux-audit-login?email=attacker@example.com` → **404**. Confirms the exact-email check. |
| 7 | Same dev server, `Host: localhost`, correct email | `GET /api/dev/ux-audit-login?email=<configured>` → guard passed, then **500** ("Erreur serveur") because Airtable/Supabase credentials are not configured in this sandbox. **No `Set-Cookie` header was present in the response**, and the JSON body contained no secret/key/token — only a generic error message. |
| 8 | `.next/static` client bundle | `grep -rl "SUPABASE_SECRET_KEY\|AUTH_SECRET\|RESEND_API_KEY" .next/static` → **no matches**. No server secret name/value found in client-shipped code. |

## Honest limitations — not verified in this sandbox

This sandbox has **no Supabase project and no Airtable API key configured**
(no `.env.local`, no service role key). As a direct consequence, the
following could **not** be verified end-to-end here, and must be verified
by whoever runs this locally with real credentials:

- That a correctly-configured test account (existing in both Airtable and
  Supabase as described above) actually results in a successful
  `kadria-auth` cookie being set and a redirect to `/dashboard-v2` or
  `/onboarding`.
- The real cookie's exact flags in a live browser session (`HttpOnly`,
  `SameSite=Lax`, `Secure` off in dev) — the code path is byte-identical to
  the already-shipped `app/api/auth/verify/route.ts`, which does set these
  flags, but this specific route was only exercised up to the point where
  Airtable/Supabase calls fail in this sandbox.
- That `/dashboard-v2/parametres/equipe` (Team) and Planning routes are
  reachable with the resulting session and show real (not demo) data —
  this requires an actual DB-backed account and could not be exercised
  here.
- That `/demo-dashboard` is not touched by this session — this is true by
  construction (this mechanism never sets any demo-access cookie and never
  imports any demo component), but was not observed via a live click-through
  because there is no working session to click through with in this sandbox.

No secret value or cookie value is reproduced anywhere in this document or
in the final report — only whether checks passed or failed.

## File scope of this change

- `app/dev/ux-audit-login/page.tsx` (new)
- `app/api/dev/ux-audit-login/route.ts` (new)
- `src/lib/dev/ux-audit-guard.ts` (new)
- `docs/LOCAL_REAL_PRODUCT_UX_AUDIT_ACCESS.md` (new, this file)

No business pages, Planning/Team components, demo components/fixtures,
existing UX reports, plan rules, or business data were modified.
`middleware.ts` was read but not modified (not needed — see Architecture
above).
