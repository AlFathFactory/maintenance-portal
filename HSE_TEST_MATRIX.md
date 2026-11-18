# Phase 9 test matrix — 2026-11-18

`Pass` means the named layer actually ran. `Blocked` means the scenario was not executed at the required layer. Mock results do not establish live RLS or a complete user journey. Environment `local` uses mocked Supabase responses; `browser` uses local Vite with the configured project for anonymous reads; `staging` is unavailable. Test IDs map to the Phase 9 launch scenarios.

| ID | Scenario | Type / environment | Expected | Actual / evidence | Status |
| --- | --- | --- | --- | --- | --- |
| A01 | Engineer login/logout | Auth browser / staging | Session starts and ends | No test credentials | Blocked |
| A02 | Supervisor login/logout | Auth browser / staging | Session starts and ends | No test credentials | Blocked |
| A03 | Dual-membership switch without sign-out | Auth browser / staging | Correct menus and cache | No dual account | Blocked |
| A04 | Anonymous protected HSE/Maintenance routes | Browser / local | Redirect to access denied | Playwright `smoke.spec.ts` passed for HSE, approvals, dashboard | Pass |
| A05 | Supervisor denied approval route | Browser + backend / staging | Route and RPC denied | Mock role check passed; no live session | Blocked |
| A06 | Supervisor chain write denied | Backend / staging | RLS denies insert/update | Mock repository test passed; no live JWT | Blocked |
| A07 | Non-HSE user cannot read HSE tables | Backend / staging | RLS hides records | Policies inspected; no live JWT | Blocked |
| C01 | Create/edit active chain and validation | Browser + backend / staging | Saved physical UUID; invalid input rejected | Mock validation/CRUD tests passed | Blocked |
| C02 | Scrap without replacement | Backend / staging | One atomic RPC transition | RPC inspected; no write test | Blocked |
| C03 | Scrap with immediate replacement | Backend / staging | New UUID; atomic rollback on failure | Mock RPC tests passed; no write test | Blocked |
| C04 | Delayed replacement/reused tag | Backend / staging | UUID lineage; old history intact | Mock lineage tests and trigger inspected | Blocked |
| K01 | Published checklist read-only | Backend / staging | Writes denied | Mock test, RLS and trigger inspected; no live denial | Blocked |
| K02 | Engineer Draft section/item CRUD | Browser + backend / staging | Persisted edits | Mock CRUD tests passed; no live write | Blocked |
| K03 | Supervisor Draft read-only | Backend / staging | Writes denied | Mock test and policy inspection only | Blocked |
| K04 | Version selection/section counts | Browser / staging | Correct version and order | Mock selection/nesting tests only | Blocked |
| I01 | Create Draft with Published checklist | Backend / staging | Active chain UUID and snapshot | Mock test and trigger inspected; no live write | Blocked |
| I02 | Save/resume partial Draft | Browser + backend / staging | Answers and comments persist | Mock repository/model tests only | Blocked |
| I03 | Save OK/Faulty/N/A and section comment | Backend / staging | Correct stored values | Mock result tests only | Blocked |
| I04 | Inspector explicitly signs complete Draft | Backend / staging | Server identity/time, one signature | Mock test and trigger inspected | Blocked |
| I05 | Signed Draft cannot be edited | Backend / staging | RLS/trigger rejects update | Mock test and trigger inspected; no live denial | Blocked |
| I06 | Submit to Pending Approval | Backend / staging | RPC changes state once | Mock RPC test and definition inspected | Blocked |
| I07 | Back/Forward with unsaved edit | Browser component / local | Stay on edit when dismissed | Playwright navigation fixture exercised actual hook/router; link and Back passed | Pass |
| I08 | Reload/tab close with unsaved edit | Browser / staging | Native unload warning | Handler reviewed; not browser-executed | Blocked |
| P01 | Engineer explicitly signs | Backend / staging | Own signature persisted | Mock test and trigger inspected | Blocked |
| P02 | Engineer approves through RPC | Backend / staging | Approved status persisted | Mock test and RPC definition inspected | Blocked |
| P03 | Supervisor cannot approve | Backend / staging | Denied by membership/RPC | Mock test and policy inspected | Blocked |
| P04 | Approved record immutable | Backend / staging | Mutations rejected | Trigger inspected; no live denial | Blocked |
| P05 | Signed but unapproved recovery | Browser + backend / staging | Retry approval without resigning | Mock recovery test only | Blocked |
| R01 | Chain and inspection KPI counts | Backend / staging | Match source records | Mock model/count tests; live tables empty | Blocked |
| R02 | Faulty findings and distinct inspections | Unit / local | Separate counts | `test:hse` reporting model test passed | Pass |
| R03 | Cairo date boundaries | Unit / local | Inclusive date-only bounds | `test:hse` period test passed | Pass |
| R04 | CSV formula/UTF-8 handling | Unit / local | Escaped readable CSV | `test:hse` CSV test passed | Pass |
| R05 | Populated report/export matches source | Browser + backend / staging | Correct page scope and counts | No sample records/test accounts | Blocked |
| B01 | Arabic/English public QR screen | Browser / local | RTL/LTR switch | Playwright invalid-token route passed | Pass |
| B02 | 375/768/1366px public access screens | Browser / local | No horizontal overflow | Playwright passed all three widths | Pass |
| B03 | Authenticated HSE forms/tables/charts | Browser / staging | Usable at three widths | No test accounts | Blocked |
| M01 | Maintenance Admin access/equipment CRUD | Browser / staging | Existing behavior retained | No admin test account or Maintenance suite | Blocked |
| M02 | Public malformed QR token | Browser / local | Public invalid-token state | Playwright passed | Pass |

## Execution summary

- `npm run test:hse`: 49/49 mocked/model tests passed.
- `npm run test:browser`: 6/6 browser tests passed after the final harness correction (anonymous/public/component scope only).
- Live authenticated backend: 0 scenarios executed; no staging branch or test accounts were available. Connected production project currently has 0 chains, inspections, and result rows.
- Maintenance has no automated test script. The anonymous protected-route and malformed QR smoke tests are the only browser regression checks for its routes.
