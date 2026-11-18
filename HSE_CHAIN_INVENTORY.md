# HSE chain inventory (Phase 4)

The `/#/hse/chains`, `/#/hse/chains/new`, `/#/hse/chains/:id`, and `/#/hse/scrapped` routes use the Phase 3 HSE repository through its React Query hooks. All links and inspection history filters use the physical chain UUID. Tag numbers are display and search values only.

Inventory and archive filters, ordering, pagination (20 rows per page), counts, and archive successor lookup run against Supabase. Counts represent physical chain rows, including replaced historical records. Archive successor lookup batches the current page's predecessor UUIDs in one request. Future data growth may warrant a dedicated search RPC or indexed reporting view, but none is required for this phase.

Only HSE Engineers see create, edit, scrap, and replacement controls. The create route is role guarded, and the repository plus Supabase RLS and database constraints enforce writes. Active chains can be edited only in their allowed specification fields. Immediate retirement and replacement use the existing atomic `hse_scrap_chain` RPC. Delayed replacement creates a new chain with `replaces_chain_id`; the predecessor remains immutable and keeps its own inspection history. A replacement option is withheld when a successor already exists. Concurrent changes can still make a choice ineligible, in which case the backend rejection is shown.

The live project schema was verified read only in Phase 3. A read-only count query on 2026-11-16 found no HSE chains, so the production empty state is expected. No live chain write was performed for Phase 4; automated tests use a mocked Supabase client.
