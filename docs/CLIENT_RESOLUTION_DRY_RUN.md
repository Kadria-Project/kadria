# Client resolution dry-run

`resolveOrCreateClient` is a server-only analysis service. Despite its historical name, this first version never creates, updates, archives, merges, links, or notifies anything.

## Input and output

The caller supplies a trusted `tenantId` plus client coordinates. Browser payloads must never choose a tenant id. The result always includes `dryRun: true` and is one of:

- `exact_match`: one active client has a unique strong match.
- `ambiguous_match`: a person must choose between candidates.
- `no_match`: a `proposedClient` is returned for a future write flow.
- `insufficient_identity`: no proposal is made because `clients` requires a name or company.

Candidates only expose a display name, masked contact data, status, matching fields, score, and reasons.

## Matching rules

- Email is trimmed and lowercased; aliases and domains are never rewritten.
- French formats `06`, `+33`, and `0033` are cautiously converted to E.164. Existing valid international E.164 numbers are preserved. Ambiguous or invalid values are not normalized.
- Names and companies are normalized only for comparison; stored raw values are not rewritten.
- A unique email or phone needs a coherent name/company to be exact. Matching unique email and phone on the same client is also exact.
- Shared contact data, conflicting identities, and email/phone resolving to different clients are always ambiguous.
- Name, company, address, city, or postal code alone never create an exact match.

Archived and merged clients are excluded. Every database read includes `tenant_id`; the service role is never allowed to search across tenants.

## Query budget and future use

One resolution performs at most three indexed/narrowed reads: normalized email, normalized phone, then name plus postal code or city only when needed. Results are deduplicated before the pure resolver scores them.

Future project creation, Vapi, imports, and backfill can call this service after their own tenant authorization. They must explicitly implement writes in a later lot; this service is intentionally read-only.
