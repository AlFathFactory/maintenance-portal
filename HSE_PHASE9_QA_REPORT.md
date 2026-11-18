# Phase 9 QA and production-readiness report — 2026-11-18

## Executive summary

**NO-GO.** The code builds, 49 mocked HSE tests pass, and six anonymous/component browser checks pass. The mandatory Engineer/Supervisor backend and browser journeys cannot be verified: both local and production Vite configuration target project `dkdzhndvnzgrsvwgdihp`, the connected account shows no staging branch, no approved test credentials are present, and the live HSE tables contain zero chains, inspections, and results. No production writes were made. The release decision is an assurance decision, not a claim that the backend is defective.

The only verified Phase 9 frontend defect fixed was unsaved inspection navigation. The old click listener missed browser Back/Forward in HashRouter. The app now uses a data HashRouter and React Router `useBlocker` for in-app transitions, with `beforeunload` retained for reload/tab close. A browser component test exercised link and Back navigation with both canceled and accepted prompts. The actual authenticated Inspection form remains untested.

## Initial findings register and disposition

Priorities were established after source review, before remediation.

| ID | Severity | Module / finding | Reproduction or evidence | Action / status | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| F01 | P1 | Inspection Draft can lose unsaved edits on browser Back/Forward | `useUnsavedWarning.ts` intercepted anchor clicks and unload only; HashRouter history changes do not click links | Fixed with data HashRouter + `useBlocker`; browser component regression passed | Authenticated editor, Forward, reload and tab-close behavior still need staging verification |
| F02 | P1 | Mandatory live role, signature, replacement and approval journeys lack evidence | 0 live HSE records; no staging branch or test accounts; previous phase reports explicitly list these gaps | Blocked; staging prerequisites and matrix documented | Production release blocked until executed |
| F03 | P2 | Checklist publishing unavailable | `hseCapabilities.publishChecklist=false`; versions table has browser SELECT only, no publish RPC | Operational limitation; backend capability requires separate authorization | Launch owner must confirm that published v1 is sufficient for launch and define update procedure |
| F04 | P3 | Manual checklist reorder unavailable | `hseCapabilities.reorderChecklist=false`; current unique order requires transactional operation | Deferred enhancement | Existing stored ordering remains usable |
| F05 | P2 | Reporting has bounded analysis and no populated live verification | Repository returns unavailable past 500 inspections or 20,000 result rows; live result count 0 | Documented scale limit; do not silently raise cap | Release owner must accept expected volume or authorize aggregate backend work |
| F06 | P2 | Maintenance regression coverage is sparse | `package.json` has only `test:hse`; browser suite covers anonymous routes/invalid QR, no equipment CRUD | Test matrix records gap | Maintenance Admin regression remains blocked |
| F07 | P2 | Four high npm advisories in dev dependency chain | `npm audit`: `picomatch` ReDoS via `fdir`/`tinyglobby`/`vite`; `npm audit --omit=dev`: 0 vulnerabilities | No forced major downgrade; track patched compatible Vite tree | Development/CI glob input exposure; no affected production dependency found |
| F08 | P2 | Supabase Advisor warnings | `SECURITY DEFINER` QR RPCs and leaked-password protection disabled | Definitions reviewed in security audit; no backend/config mutation | Live denied-role tests and owner decision on password protection remain |

Finding count: **P0 0, P1 2 (1 fixed, 1 unresolved), P2 5, P3 1**. F02 is an evidence/release blocker rather than a demonstrated exploit. No confirmed unresolved P0 defect was found; the audit cannot prove their absence without live role tests.

## Architecture and code audit

Reviewed `src/app`, `src/domain`, `src/services` including HSE and Maintenance repositories, `src/features/auth`, HSE chains/checklist/inspections/approvals/dashboard/reports, equipment/maintenance/teams, shared UI, i18n, test script, configuration, README, and the HSE architecture/phase documents. Maintenance and HSE repositories and query keys are separated. Auth guards gate protected route trees before feature queries mount. HSE repository validates inputs and uses the existing scrap, submit and approval RPCs; mutations invalidate HSE caches. No Maintenance business logic or database structure was changed.

Read-only database inspection found all nine HSE tables RLS-enabled; policies, triggers and three invoker RPC definitions implement the intended role and lifecycle model. See `HSE_SECURITY_AUDIT.md`. This is configuration review, not end-user authorization proof. No live signing, editing, or approval call was performed.

## Verification and performance

| Layer | Executed result | Limit |
| --- | --- | --- |
| HSE unit/mocked repository | 49/49 pass, `npm run test:hse` | Mocked backend; does not exercise RLS |
| Browser | 6/6 pass, Playwright with installed Microsoft Edge | Anonymous protected routes, malformed QR, RTL/LTR, three public viewport widths, and an isolated navigation-guard fixture |
| Live Supabase read-only | 9 RLS-enabled HSE tables; policies, grants, triggers, RPCs inspected; 0 chains/inspections/results | Owner SQL view, not authenticated role sessions |
| Live authenticated/write | 0 executed | No approved staging target or test accounts |
| Maintenance automated | No dedicated suite | Admin/equipment CRUD untested |
| Build | TypeScript, Prettier, production Vite build pass | Build emits third-party `use client` directive warnings; build succeeds |
| Dependencies | Production-only audit 0; full audit 4 high dev-chain advisories | No safe compatible fix established |

No representative HSE response-time or payload measurements are available because the database is empty and authenticated flows were not run. The reporting path uses exact count queries and bounded paginated scans; it marks analytics unavailable when limits or consistency checks fail. Its multi-request snapshot can change under concurrent writes. Supabase Performance Advisor reported one Maintenance unindexed foreign key and unused indexes, including HSE indexes on empty tables; these are not evidence of a measured HSE slowdown. No index was removed or added.

## Gate decision

| Gate | Status | Evidence | Blocker |
| --- | --- | --- | --- |
| A Build & code quality | Pass | TypeScript, format, build, 49 mocked tests | None observed |
| B Security | Blocked | RLS/policy/RPC review; anonymous browser redirects | No live Engineer/Supervisor denial tests |
| C Data integrity | Blocked | Trigger/constraint review and mocked lineage/signature tests | No authenticated lifecycle test |
| D Critical journeys | Blocked | Mocked implementation only | No live Chain → Inspection → Approval journey |
| E Reporting accuracy | Blocked | Model/CSV/date tests pass; live tables empty | No populated backend comparison or export |
| F Browser/accessibility | Blocked | Anonymous pages at 375/768/1366 and guard fixture pass | Authenticated layouts, Forward/reload, keyboard and dialogs untested |
| G Deployment/recovery | Blocked | Build and rollback checklist prepared; remote has only `main` at `3051ef0` | Target approval, smoke run, backup confirmation pending |

Checklist publishing is an **operational limitation** if the current Published version 1 meets launch requirements; it becomes a release dependency if a new checklist must be published for launch. Safe manual reordering is a **deferred enhancement** unless required by the launch workflow. The 500/20,000 scan limits need explicit expected-volume acceptance. None of these classifications overrides mandatory security and journey gates.

## Release prerequisites and Git

Use `HSE_TEST_MATRIX.md` for exact unexecuted scenarios and `HSE_RELEASE_CHECKLIST.md` for staging, deployment, smoke, and rollback steps. Required next evidence: separate authenticated Engineer/Supervisor/non-HSE sessions on an isolated backend; forbidden writes through the Data API; full lifecycle with both signatures and replacement UUID; populated KPI/CSV comparison; authenticated desktop/mobile RTL/LTR and keyboard inspection. Backend changes, permissions, production writes, push, and deployment are outside Phase 9 authorization.

Branch: `feature/hse-phase9-qa-production-readiness`, created from `d942b9f7212c7cfe108db52a841982d0c96210b0`. Remote `origin` listed only `main` at `3051ef0` when checked. `hse.md` remained untracked and untouched. Phase 9 source/tests/docs were committed locally only; no push or PR was made.
