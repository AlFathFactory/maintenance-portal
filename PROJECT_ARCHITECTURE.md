# Maintenance Portal — Project Architecture & Agent Guide

> **Read this file before modifying the project.** This is an architecture map and reuse guide, not a replacement for reading the actual files. Verify assumptions against the current code and Supabase before implementing changes.
>
> Repository: `AlFathFactory/maintenance-portal` · Last updated: 2026-11-03.

## 1. What this system does

Arabic/English factory maintenance portal. Arabic is the default RTL language; English uses LTR. Visitors with a valid QR token see only its equipment profile and maintenance history; the team directory remains public. Authenticated **maintenance admins** access the full dashboard, manage equipment, rotate QR tokens, change statuses and record maintenance. The codebase contains both a live Supabase repository and a browser-local demo implementation.

**Stack:** React 19, TypeScript, Vite, React Router 7 (`HashRouter`), TanStack React Query 5, `@supabase/supabase-js` 2, `i18next`, `react-i18next`, `qrcode`, `jszip`, plain CSS.

## 2. Complete tracked file structure

```text
maintenance-portal/
├── .env.example                  # Template for Vite's public Supabase configuration
├── .env.production               # Production Vite configuration; never place secret keys here
├── .gitignore
├── .openai/
│   └── hosting.json             # Hosting configuration
├── .prettierrc.json
├── README.md                     # Setup and original feature notes
├── PROJECT_ARCHITECTURE.md       # This guide (add to repository root)
├── index.html                    # HTML entry point
├── package.json                  # Scripts and pinned dependencies
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── scripts/
│   └── check-supabase.mjs        # Supabase connection/sanity check
├── supabase/
│   ├── schema.sql                # Initial schema, grants, RLS policies, trigger
│   └── seed.sql                  # Initial equipment data
└── src/
    ├── main.tsx                 # React root and ordered stylesheet imports
    ├── styles/
    │   ├── globals.css         # Reset, typography, and document defaults
    │   ├── utilities.css       # Loading, empty, and not-found states
    │   └── print.css           # Print-only layout and QR output
    ├── equipment.json           # Initial local demo equipment dataset
    ├── i18n/
    │   ├── index.ts             # i18next setup, language persistence and document direction
    │   ├── ar.ts                # Arabic UI messages
    │   └── en.ts                # English UI messages
    ├── app/
    │   ├── App.tsx              # Providers, HashRouter, routes, lazy-loaded pages
    │   ├── AppShell.tsx         # Navigation/sidebar, login/logout UI, Outlet
    │   └── AppShell.css        # Shell, navigation, and responsive layout
    ├── config/
    │   └── env.ts               # Vite env parsing; determines demo vs Supabase
    ├── domain/
    │   ├── equipment.ts         # Equipment types, statuses and bilingual input types
    │   ├── localizedEquipment.ts # Per-field equipment fallback and form values
    │   ├── qrEquipment.ts       # Typed public QR RPC payload parser
    │   └── maintenance.ts       # Maintenance types, input and record interfaces
    ├── features/
    │   ├── auth/
    │   │   ├── AuthProvider.tsx  # Supabase session, admin lookup, useAuth()
    │   │   ├── RequireAdmin.tsx  # Guard before admin routes and queries mount
    │   │   ├── AccessDeniedPage.tsx # Standalone login/access screen
    │   │   └── LoginModal.tsx   # Sign-in form
    │   ├── equipment/
    │   │   ├── DashboardPage.tsx# List, dashboard stats, search and filters
    │   │   ├── dashboard.css    # Dashboard layout, tabs, and table
    │   │   ├── equipment.css    # Equipment detail and summary layout
    │   │   ├── EquipmentPage.tsx# Equipment details, history, QR and action modals
    │   │   ├── EquipmentFields.tsx # Shared localized specifications
    │   │   ├── PublicQrPage.tsx # Isolated single-equipment QR profile
    │   │   ├── QrSettingsPage.tsx # Admin-only QR rotation with typed confirmation
    │   │   ├── qrSettings.css  # QR settings layout
    │   │   ├── qrImage.ts       # Shared high-resolution QR image renderer
    │   │   ├── BulkQrDownloadButton.tsx # Admin ZIP export of all equipment QR images
    │   │   ├── qrQueries.ts     # Token-scoped public/admin RPC hooks
    │   │   ├── publicQr.css    # QR profile and access screen styles
    │   │   ├── EquipmentForm.tsx# Add/edit equipment
    │   │   ├── StatusForm.tsx   # Change equipment status
    │   │   └── queries.ts      # Equipment React Query hooks/mutations/keys
    │   ├── maintenance/
    │       ├── MaintenanceForm.tsx    # Add repair / periodic maintenance
    │       ├── MaintenanceHistory.tsx # Read-only maintenance timeline
    │       ├── maintenance.css        # History empty state and timeline
    │       └── queries.ts            # Maintenance React Query hooks/mutations
    │   └── teams/
    │       ├── TeamsPage.tsx          # Desktop tree and mobile directory from one team view
    │       ├── StaffRow.tsx           # Person row and responsive admin actions
    │       ├── TeamTabs.tsx           # Mobile team selection with dynamic counts
    │       ├── CallButton.tsx         # Reusable public tel link with validation
    │       ├── TeamDialogs.tsx        # Admin forms and delete confirmation
    │       ├── queries.ts            # Team query keys and mutations
    │       ├── types.ts              # Team data types
    │       └── teams.css             # RTL hierarchy and responsive styles
    ├── services/
    │   ├── repository.ts         # MaintenanceRepository interface: data contract
    │   ├── index.ts              # Selects demoRepository or supabaseRepository
    │   ├── supabaseClient.ts     # Single Supabase client, publishable key only
    │   ├── supabaseRepository.ts # Live equipment/maintenance CRUD calls
    │   └── demoRepository.ts     # Equivalent localStorage-backed implementation
    └── shared/
        ├── date.ts               # formatDate() and todayLocal()
        ├── styles/
        │   ├── buttons.css       # Shared action buttons
        │   ├── components.css    # Panels, badges, icons, fields, QR, toast, errors
        │   ├── forms.css         # Shared form layouts and controls
        │   └── modal.css         # Modal backdrop and frame
        └── ui/
            ├── EquipmentIcon.tsx # Equipment icon by type
            ├── ErrorMessage.tsx  # Error display + optional retry
            ├── Field.tsx         # Label/value display with empty fallback
            ├── Modal.tsx         # Reusable modal wrapper/close behavior
            ├── QrCard.tsx        # Admin token QR, high-resolution PNG and print
            ├── LanguageSwitcher.tsx # Shared AR/EN switcher
            ├── StatusBadge.tsx   # Consistent status display
            └── ToastProvider.tsx # Global toast provider + useToast()
```

## 3. How the pieces communicate

```text
main.tsx
  └── App.tsx
       ├── QueryClientProvider             # shared server-state/cache
       ├── AuthProvider                    # user, isAdmin, signIn/out
       ├── ToastProvider                   # success/error toast access
       └── HashRouter
            ├── /qr/:token                 # PublicQrPage: one equipment, no shell
            ├── /access-denied             # Standalone sign-in/access notice
            ├── /teams                     # Public directory, admin actions only
            └── RequireAdmin → AppShell   # Admin shell after membership check
                 ├── /, /dashboard, /equipment # DashboardPage
                 └── /equipment/:slug      # EquipmentPage
                 └── /settings             # QrSettingsPage

UI (page/form)
  └── feature/queries.ts                   # useQuery / useMutation
       └── services/index.ts → repository  # data-access contract
            ├── supabaseRepository.ts      # Supabase tables and Auth
            │    └── supabaseClient.ts
            └── demoRepository.ts          # localStorage + equipment.json
                 ↑ selection based on config/env.ts

Supabase INSERT into maintenance_records
  └── DB trigger: private.apply_maintenance_record()
       └── updates equipment.last_maintenance_on and optional equipment.status
```

### Typical read and write flows

- **Equipment list:** `DashboardPage → useEquipmentList → repository.listEquipment → equipment`; dashboard filters search/type client-side.
- **Admin equipment detail:** `/equipment/:slug → RequireAdmin → useEquipment(slug) → repository.getEquipment(slug)`. Visitors never mount this query, and RLS denies direct equipment-table reads.
- **Public QR profile:** `/qr/:token → useQrEquipment(token) → repository.getEquipmentByQr → get_equipment_by_qr` returns one equipment, translations, and maintenance history. It has no shell or unrelated links/queries. Invalid tokens show an invalid/expired state.
- **Legacy QR links:** anonymous visits to `/equipment/:slug` show a localized outdated-QR notice with instructions to get a newly printed code; no equipment query mounts. Existing slug links cannot grant public access under the current RLS policy.
- **Admin QR card:** `QrCard → useEquipmentQrToken → get_equipment_qr_token`; the QR encodes `origin/path#/qr/<token>`. `qrImage.ts` renders the 1200 px QR with a four-module quiet zone and the existing heading above it for PNG download and larger printing. Tokens stay in memory only.
- **Bulk QR export:** The admin dashboard button uses the same renderer and existing token RPC to create one ZIP with `Machines/` and `Cranes/` folders. It processes three equipment at a time, reports progress, and downloads only after every image succeeds. Export never rotates tokens.
- **QR settings:** `/settings` is admin-only. It selects one equipment and requires typing its slug in a confirmation modal before `rotate_equipment_qr_token` runs. Rotation is absent from the equipment card because it immediately invalidates existing printed labels.
- **Add/edit equipment:** `EquipmentForm → useEquipmentActions().create/update → repository.createEquipment/updateEquipment → equipment`; successful mutation invalidates all `['equipment']` queries.
- **Localization:** `src/i18n` initializes Arabic by default, persists AR/EN in `localStorage`, and updates `<html lang>`/`dir`. `AppShell` provides the language switcher. React components use `useTranslation`; `formatDate` follows the current language.
- **Equipment translations:** equipment list/detail reads join `equipment_translations`. `equipmentText()` resolves each field independently: selected English value, then Arabic translation, then the legacy Arabic equipment field. The paired form requires an Arabic name and accepts optional English text. Create/edit syncs the legacy Arabic fields and upserts both locales on `(equipment_id,locale)`; the demo repository follows the same model.
- **Change status:** `StatusForm → useEquipmentActions().setStatus → repository.updateStatus → equipment`; equipment cache invalidated.
- **Read maintenance:** `EquipmentPage → useMaintenance(equipmentId, enabled) → repository.listMaintenance → maintenance_records`, ordered by `performed_on` descending.
- **Create maintenance:** `MaintenanceForm → useCreateMaintenance → repository.createMaintenance → maintenance_records`; successful mutation invalidates `['maintenance', equipmentId]` and `['equipment']`; the database trigger updates the equipment summary.
- **Admin access:** `AuthProvider` checks the session and `maintenance_admins`; `RequireAdmin` waits before mounting admin routes. Sign-out clears equipment, maintenance, QR, and team query caches. **RLS is the actual security boundary.**
- **Team directory:** `TeamsPage → useTeamDirectory() → repository.listTeamDirectory` reads staff, teams, memberships and public contact numbers. `CallButton` shows a validated `tel:` link when a number exists. Team query caches are cleared on sign-out; contact writes remain admin-only.
- **Responsive team UI:** `TeamsPage` builds each team's leader and members once from the directory. Desktop shows the engineer and both branches as a tree. At 768px and below, `TeamTabs` selects one team and `StaffRow` renders compact rows with call links beside names. Admin actions expand from each row without changing the repository or authorization flow.
- **Team administration:** `TeamDialogs → useTeamActions → repository` handles staff, assignments and team updates. Membership transfers use one row update. Staff create and delete use compensating cleanup when a dependent request fails; these browser requests are not a database transaction.

## 4. Reuse before creating anything new

| Existing reusable unit | Location / usage | Reuse for |
| --- | --- | --- |
| `MaintenanceRepository` | `src/services/repository.ts` | All equipment/maintenance data operations; extend the interface when adding an operation. |
| `repository` | `src/services/index.ts` | All feature hooks; don't import the live client directly into pages/forms. |
| `useEquipmentList`, `useEquipment`, `useEquipmentActions` | `src/features/equipment/queries.ts` | Equipment reads, create, edit, status changes and cache invalidation. |
| `useMaintenance`, `useCreateMaintenance` | `src/features/maintenance/queries.ts` | Maintenance reads/writes and query cache refresh. |
| `useAuth()` | `src/features/auth/AuthProvider.tsx` | Session, `isAdmin`, login/logout; don't duplicate session state. |
| `Modal` | `src/shared/ui/Modal.tsx` | Dialog layout, Escape/backdrop close. |
| `ErrorMessage` | `src/shared/ui/ErrorMessage.tsx` | Request/form errors and retry UI. |
| `ToastProvider` / `useToast()` | `src/shared/ui/ToastProvider.tsx` | Success/error notifications. |
| `Field` | `src/shared/ui/Field.tsx` | Label/value field with missing-value display. |
| `StatusBadge` / `EquipmentIcon` | `src/shared/ui/` | Consistent visual status/type rendering. |
| `QrCard` | `src/shared/ui/QrCard.tsx` | Equipment QR, download and print. |
| `formatDate`, `todayLocal` | `src/shared/date.ts` | Arabic date formatting and local date defaults. |
| `statusDetails`, `equipmentText` | `src/domain/` | Status tones and per-field localized equipment values; labels live in the language resources. |
| `MaintenanceHistory` | `src/features/maintenance/MaintenanceHistory.tsx` | Read-only timeline for both admins and public visitors. |
| `src/styles/`, feature CSS, `src/shared/styles/` | Ordered imports in `src/main.tsx` | Keep page rules with their feature and shared controls in shared styles. |

**Feature-placement rule:** feature-specific UI/hooks and CSS go under `src/features/<feature>/`; cross-feature primitives and styles under `src/shared/`; entity types under `src/domain/`; all remote/local data access under `src/services/`.

**Styling convention:** `src/main.tsx` imports CSS in an explicit order: global foundations, shell, shared buttons, dashboard, shared components, utilities, equipment detail, maintenance, teams, modal, forms, then print. Keep responsive rules beside their base selectors and print rules in `src/styles/print.css`. Add new styles to the owning feature or shared stylesheet, preserving existing class names and RTL behavior. Place future CSS variables in `src/styles/globals.css`.

## 5. Supabase contract, behavior and permissions

**Connected backend:** `factory-maintenance` · Supabase project ref `dkdzhndvnzgrsvwgdihp`.

| Table | Important fields | Purpose |
| --- | --- | --- |
| `public.equipment` | `id` UUID, unique `slug`, `type`, `name`, specs, `status`, `last_maintenance_on` | Admin inventory and equipment profile. |
| `public.equipment_translations` | `(equipment_id, locale)` key, translated name and specs | Admin table reads/writes; public QR RPC returns the matched translations. Arabic equipment names are required. |
| `public.maintenance_records` | `id`, `equipment_id` FK, `kind`, `performed_on`, `notes`, `status_after`, `created_by`, `created_at` | Maintenance history, repairs, periodic services. |
| `public.maintenance_admins` | `user_id` FK to `auth.users` | Authorized maintenance admins. |
| `public.maintenance_staff` | `id`, `full_name`, `role` | People in the department. |
| `public.maintenance_teams` | `id`, `name`, `engineer_id`, `leader_id` | Team branches and their leads. |
| `public.maintenance_team_members` | `team_id`, `staff_id` | Unique team assignment per staff member. |
| `public.maintenance_staff_contacts` | `staff_id`, `phone` | Public phone details; admin-only writes. |
| `public.get_equipment_by_qr(text)` | Public RPC | Returns one JSON equipment profile for a valid token; invalid tokens return null. |
| `public.get_equipment_qr_token(uuid)` / `rotate_equipment_qr_token(uuid)` | Admin RPCs | Read or rotate one equipment token. |

- Equipment types: `machine` and `crane`.
- Equipment statuses: `unknown`, `operational`, `out_of_service`, `maintenance`.
- Maintenance types: `repair`, `periodic`.
- A maintenance INSERT invokes `private.apply_maintenance_record()`, updating last service date and optionally status. Do not duplicate this database business rule in frontend writes.
- RLS is enabled on equipment, translations, and maintenance records. Anonymous visitors have **no direct SELECT** on these tables. Authenticated users read them only when listed in `maintenance_admins`; the public QR RPC is the visitor path to one profile. Do not assume authenticated = admin.
- Secure QR tokens live in `private.equipment_qr_access`. Never fetch a token list, persist tokens locally, or use a slug URL as a QR destination. The local demo has no secure token backend, so its QR methods report an unavailable state.
- No deployed Edge Functions were found at review time; the project is not using a separate custom HTTP backend.
- `supabase/schema.sql` represents the **original** schema and contains the old admin-only maintenance SELECT policy: **do not reapply it blindly** or treat it as an up-to-date migration history. Current backend state must be checked before migrations/changes. There were no recorded migrations at review time.
- Security: public Supabase client uses the **publishable key only**. Never expose `service_role`/secret keys, and never depend on hidden buttons for authorization.
- Team tables are live backend tables with public `SELECT` on staff, teams, memberships and contacts, plus admin-only writes. No schema or RLS changes were made for the team UI. The chart derives leader placement from `maintenance_teams.leader_id`; a leader is omitted from the technician list even if a membership row remains. The demo repository returns an empty directory and reports that edits require Supabase, because there is no employee demo seed.

## 6. Key implementation rules for AI agents

1. **Read before editing:** inspect relevant feature page/form, `queries.ts`, repository interface, both repository implementations, domain type and affected Supabase policies.
2. **Follow established flow:** Page/Form → feature hook → repository interface → selected implementation. Avoid API calls directly from UI components.
3. **Maintain demo parity:** when adding repository methods, implement both `supabaseRepository` and `demoRepository`, or explicitly explain why a feature cannot run in demo mode.
4. **Keep permissions separate:** public read and admin write are different capabilities; backend RLS enforces permission. Never expose secret keys.
5. **After mutations:** invalidate specific React Query keys so list/detail/history stay fresh; preserve loading, error and empty states.
6. **Keep the design:** bilingual labels, RTL/LTR layout, and shared CSS patterns. QR URLs use tokens; previously printed codes must be replaced after rotation.
7. **Make small changes:** reuse existing components; avoid duplicate utility files, new global stores and unneeded abstractions.
8. **When backend changes:** inspect live Supabase first; use safe migration/version-control workflow; preserve production data; document policy/schema updates and verify them.
9. **When frontend changes:** do not assume a backend change is needed; user may assign backend and frontend work to different agents.
10. **Check actual HEAD:** GitHub can evolve after this document; update this file when routes, modules, DB contracts, or shared primitives change.

## 7. Common tasks — exact starting points

| Request | Start here | Also inspect |
| --- | --- | --- |
| Add equipment fields | `domain/equipment.ts`, `EquipmentForm.tsx`, `EquipmentPage.tsx` | `supabase/schema.sql`, live DB, demo repo, Dashboard |
| Add/change equipment statuses | `domain/equipment.ts`, `StatusForm.tsx` | Live DB constraints, `StatusBadge`, dashboard counters |
| New maintenance fields | `domain/maintenance.ts`, `MaintenanceForm.tsx`, `MaintenanceHistory.tsx` | `maintenance/queries.ts`, repository implementations, DB schema |
| Public/admin history visibility | `EquipmentPage.tsx`, `maintenance/queries.ts` | Supabase SELECT/INSERT grants and RLS |
| QR label/navigation | `QrCard.tsx`, `PublicQrPage.tsx`, `App.tsx` | Token RPCs, HashRouter route, hosting paths |
| Login/roles | `AuthProvider.tsx`, `LoginModal.tsx`, `AppShell.tsx` | Supabase Auth, `maintenance_admins`, RLS |
| Dashboard search/filter | `DashboardPage.tsx` | `equipment/queries.ts`, equipment type labels |
| Shared UI style/component | `shared/ui/`, `shared/styles/` | Existing usages in pages/forms |

## 8. Commands & agent completion checklist

```bash
npm ci
npm run dev
npm run typecheck
npm run build
npm run format:check
node scripts/check-supabase.mjs
```

Before reporting a change complete:

- [ ] The feature follows existing domain → services → query hooks → UI boundaries.
- [ ] Shared components/utilities were reused where appropriate.
- [ ] Both live and demo repository implementations remain consistent.
- [ ] Anonymous/admin access follows the requested policy; RLS has not been accidentally relaxed.
- [ ] Relevant query keys are invalidated after mutations.
- [ ] QR links, Arabic RTL and existing features still work.
- [ ] Typecheck, build and formatting results are reported honestly.
- [ ] Any Supabase/schema mismatch or untested functionality is disclosed.
- [ ] This architecture guide is updated when the structure/behavior changes.

---

**Agent instruction:** Prefer focused, minimal diffs. Before implementing, state which existing files, hooks, and shared components will be reused; after implementing, summarize the changed files, DB modifications (if any), and verification results.
