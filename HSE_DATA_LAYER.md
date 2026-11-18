# HSE data layer (Phase 3)

The HSE repository is independent of `MaintenanceRepository` and uses the existing browser Supabase client. `src/domain/hse.ts` models the live HSE tables. `src/services/hseRepository.ts` defines the contract; `src/services/hse/` implements it. Future screens should use `src/features/hse/queries.ts` so reads wait for HSE authorization and writes invalidate HSE caches only.

## Verified backend contract

Read-only inspection of Supabase project `dkdzhndvnzgrsvwgdihp` on 2026-11-16 confirmed the nine `public.hse_*` tables, column types, RLS policies, constraints, triggers, and these RPC signatures:

- `hse_scrap_chain(p_chain_id uuid, p_scrapping_date date, p_scrapping_reason text, p_create_replacement boolean, p_number_of_legs smallint, p_working_load_limit_tons numeric, p_length_m numeric, p_start_working_date date) → uuid | null`
- `hse_submit_chain_inspection(p_inspection_id uuid) → hse_chain_inspections`
- `hse_approve_chain_inspection(p_inspection_id uuid) → hse_chain_inspections`

The chain UUID identifies a physical chain. A retired tag can be reused only when a new chain references the scrapped predecessor. Immediate replacement uses the transactional scrap RPC. Delayed replacement uses `createChain` with `replaces_chain_id`. The database checks active tag uniqueness and lineage.

Checklist versions are readable but cannot be published from the browser: `authenticated` has `SELECT` only on `hse_chain_checklist_versions`, and no publishing RPC is exposed. `hseCapabilities.publishChecklist` and `reorderChecklist` are `false`. Draft section and item CRUD is available to active HSE engineers under RLS and database triggers. Sort order swaps are intentionally omitted because the current unique constraints do not provide a transaction-safe browser reorder operation.

New inspections insert only chain UUID, published checklist version, and date. The database trigger supplies the inspector identity and immutable chain snapshot. Results and comments are editable only on the inspector's unsigned Draft. Explicit inspector signing must precede submission; explicit engineer signing must precede approval. The repository never signs as a side effect of either RPC. If an RPC fails after a signature succeeds, the existing signature remains and only the RPC should be retried.

The repository checks current HSE membership before writes for immediate feedback. Supabase RLS, constraints, and triggers remain authoritative. Demo mode returns `SUPABASE_UNAVAILABLE` for HSE operations; Maintenance demo behavior is unchanged. Inventory and inspection lists are bounded to 100 rows per request. No production records were created during Phase 3 verification.
