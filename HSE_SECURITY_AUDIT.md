# Phase 9 security audit — 2026-11-18

## Scope and assurance

Read-only inspection of Supabase project `dkdzhndvnzgrsvwgdihp`, source review, 49 mocked repository/model tests, and anonymous browser checks. No authenticated Engineer or Supervisor test session was available. SQL inspection uses the project owner's database access, so it proves configuration and implementation, not that a particular end-user JWT is denied by RLS. No data or permissions were changed.

## Authentication and authorization

- `AuthProvider` resolves Supabase session and checks `maintenance_admins` and the caller's `hse_members` row. It clears the React Query cache on account changes, auth events and sign-out. HSE queries wait for an active role; Maintenance and HSE have separate route guards and query keys.
- Browser checks confirmed an anonymous visitor is redirected from `/#/hse`, `/#/hse/approvals`, and `/#/dashboard`. The malformed public QR route loads without a session. Authenticated role switching, removal during a session, token refresh, and Maintenance Admin behavior remain untested. Membership changes are checked at login/auth events in the UI; the backend policies consult the membership table on each request.
- All nine `public.hse_*` tables have RLS enabled. The current policies require active HSE membership for reads, Engineer membership for chain/checklist writes and approval, and inspection ownership for Draft writes. This was verified through `pg_policies` on 2026-11-18. `authenticated` has broad table grants, narrowed by RLS/triggers. `anon` has no HSE table grants in the inspected grant listing.
- `hse_scrap_chain`, `hse_submit_chain_inspection`, and `hse_approve_chain_inspection` are `SECURITY INVOKER`; `anon` lacks EXECUTE and `authenticated` has EXECUTE. Their bodies check role/ownership/state and lock the affected row. No live role-specific RPC denial was executed.

## Integrity controls inspected

- Chain trigger rejects identity/tag/lineage changes and edits to Scrapped chains. The scrap RPC performs scrap and optional replacement in one transaction. Physical UUIDs link inspections to chains.
- Checklist item/section triggers reject writes outside Draft versions. Versions have SELECT-only browser grants; publishing is unavailable.
- Inspection trigger fixes inspector identity and chain snapshot on insert, checks legal state transitions and completeness, and rejects edits to Approved records. Additional triggers freeze signed Drafts, answers, and comments.
- Signature insert policy requires `signed_by = auth.uid()`. The trigger sets attestation text, method, and backend timestamp; update/delete are rejected. Unique constraints and role-specific checks still require authenticated live verification.
- CSV cells are quoted, formula-like prefixes are escaped, and UTF-8 BOM is emitted. The mocked export test passed; an export of populated live data was unavailable.

## Advisor results and unresolved risk

Supabase Security Advisor reported three warning categories: the intentional public QR lookup `SECURITY DEFINER` function callable by `anon` and `authenticated`, two Maintenance QR functions callable by `authenticated`, and leaked-password protection disabled. Read-only function review found that the public lookup requires a 64-character hex bearer token and returns only the matching equipment/history; the token retrieval and rotation functions explicitly check `maintenance_admins` against `auth.uid()`. No direct bypass is apparent from the definitions, but live denied-role checks were not run. The public QR endpoint is intentionally public, so its advisor warning alone does not prove an exploit. Leaked-password protection is a defense-in-depth configuration gap. Phase 9 did not alter Maintenance backend objects.

The main release blocker is assurance: no separate authenticated Engineer/Supervisor sessions tested RLS denial, signing, approval, or immutability against a staging backend. Read-only policy inspection and mocked tests cannot close that gap. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) confirms that table grants and RLS are separate controls and that invoker context matters.
