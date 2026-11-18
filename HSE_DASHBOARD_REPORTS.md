# HSE dashboard and reports (Phase 8)

The HSE dashboard at `/#/hse` is available to active HSE Engineers and Supervisors. The reports page at `/#/hse/reports` reuses the existing HSE repository, React Query, and source-record routes. Approval links appear only to Engineers. Neither page writes to Supabase.

## Metric definitions

- **Physical chains:** exact count of `hse_chains.id`, including distinct replacement UUIDs that may reuse a tag. Active and Scrapped cards are current lifecycle snapshots.
- **Scrapped in period:** chains whose date-only `scrapping_date` falls in the inclusive selected range.
- **Inspections in period and status cards:** exact counts of inspection UUIDs whose date-only `inspection_date` is in the inclusive selected range. Status is the administrative workflow state, not a safety result.
- **Findings:** saved checkpoint result rows on those inspections. OK, Faulty, and N/A count checkpoint results. Unanswered is the sum of checklist item counts for each inspection's stored template version minus saved result rows. Inspections with Faulty findings count distinct inspection UUIDs, not Faulty rows or chain tags.
- **Recent inspections:** the five latest inspection dates in the selected period. Recent registration and retirement lists are current all-time activity lists. Pending approvals in the Engineer section are all-time.
- **Trends:** grouped by the date-only inspection date, using Monday as the weekly start. The Faulty trend counts checkpoint result rows; the separate distinct-inspection count is labeled accordingly.

The reporting calendar is **Africa/Cairo**. Preset boundaries are Cairo calendar dates. Date-only database fields are compared as `YYYY-MM-DD` strings without conversion to UTC. Registration timestamps are displayed in Cairo time. Custom ranges require valid dates with start ≤ end. “All time” removes the date predicate.

## Accuracy and scale

Inventory and status KPIs use exact backend count queries. Trend and findings scans fetch all matching inspection pages only when the period contains at most **500 inspections**. Result rows and checklist items are fetched in bounded batches, each capped at **20,000 rows**. If a cap or consistency check is exceeded, the affected analysis is shown as unavailable; the UI never treats a partial first page as a global total. Chain inspection counts are batched for the visible report page and shown as unavailable if more than 5,000 matching inspection rows would have to be scanned.

The backend exposes no reporting aggregate RPC or view, so reporting reads can reflect concurrent writes between requests. Refresh after active edits. Larger reporting populations need an authorized aggregate backend operation in a later phase; Phase 8 introduces no schema changes.

## Reports and exports

The reports page offers paginated inspection, Active chain, Scrapped chain, and replacement-history previews, plus a bounded findings summary. Source links use physical Chain and Inspection UUIDs. CSV export covers **only the visible filtered page** for record reports, or the available selected-period summary for findings. Filenames and buttons state this scope. CSV quotes every cell, preserves Arabic text with a UTF-8 BOM, and prefixes formula-like values with an apostrophe before export. Exports use only rows returned through the authorized browser client; no tokens or secrets are included.

The connected project had no inspections during read-only verification, so live authenticated reporting with populated data and browser layout checks remain unverified. Checklist publishing and transaction-safe reordering remain unavailable as documented in earlier HSE phases.
