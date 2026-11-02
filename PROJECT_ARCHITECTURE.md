# Maintenance Portal — Project Architecture & Agent Guide

> **Read this file before modifying the project.** This is an architecture map and reuse guide, not a replacement for reading the actual files. Verify assumptions against the current code and Supabase before implementing changes.
>
> Repository: `AlFathFactory/maintenance-portal` · Branch inspected: `main` · Git tree: `77f42a9471e4b221ce748214a6a34d1dbe07508c` · Last reviewed: 2026-11-02.

## 1. What this system does

Arabic RTL factory maintenance portal. Visitors browse equipment, status, equipment-specific QR codes and public equipment details. Authenticated **maintenance admins** can add/update equipment, change statuses and record repairs/periodic maintenance. The codebase contains both a live Supabase repository and a browser-local demo implementation.

**Stack:** React 19, TypeScript, Vite, React Router 7 (`HashRouter`), TanStack React Query 5, `@supabase/supabase-js` 2, `qrcode`, plain CSS.

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
    ├── main.tsx                 # React root, global CSS import
    ├── style.css                # Global, page, form, modal, responsive and RTL styles
    ├── equipment.json           # Initial local demo equipment dataset
    ├── app/
    │   ├── App.tsx              # Providers, HashRouter, routes, lazy-loaded pages
    │   └── AppShell.tsx         # Navigation/sidebar, login/logout UI, Outlet
    ├── config/
    │   └── env.ts               # Vite env parsing; determines demo vs Supabase
    ├── domain/
    │   ├── equipment.ts         # Equipment types, statuses, labels, input types
    │   └── maintenance.ts       # Maintenance types, input and record interfaces
    ├── features/
    │   ├── auth/
    │   │   ├── AuthProvider.tsx  # Supabase session, admin lookup, useAuth()
    │   │   └── LoginModal.tsx   # Sign-in form
    │   ├── equipment/
    │   │   ├── DashboardPage.tsx# List, dashboard stats, search and type filter
    │   │   ├── EquipmentPage.tsx# Equipment details, history, QR and action modals
    │   │   ├── EquipmentForm.tsx# Add/edit equipment
    │   │   ├── StatusForm.tsx   # Change equipment status
    │   │   └── queries.ts      # Equipment React Query hooks/mutations/keys
    │   └── maintenance/
    │       ├── MaintenanceForm.tsx    # Add repair / periodic maintenance
    │       ├── MaintenanceHistory.tsx # Read-only maintenance timeline
    │       └── queries.ts            # Maintenance React Query hooks/mutations
    ├── services/
    │   ├── repository.ts         # MaintenanceRepository interface: data contract
    │   ├── index.ts              # Selects demoRepository or supabaseRepository
    │   ├── supabaseClient.ts     # Single Supabase client, publishable key only
    │   ├── supabaseRepository.ts # Live equipment/maintenance CRUD calls
    │   └── demoRepository.ts     # Equivalent localStorage-backed implementation
    └── shared/
        ├── date.ts               # formatDate() and todayLocal()
        └── ui/
            ├── EquipmentIcon.tsx # Equipment icon by type
            ├── ErrorMessage.tsx  # Error display + optional retry
            ├── Field.tsx         # Label/value display with empty fallback
            ├── Modal.tsx         # Reusable modal wrapper/close behavior
            ├── QrCard.tsx        # Equipment QR generation, PNG export, printing
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
            └── AppShell                   # sidebar, header, auth controls, Outlet
                 ├── /                     # DashboardPage
                 └── /equipment/:slug      # EquipmentPage

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
- **Equipment detail / QR:** route `/equipment/:slug → useEquipment(slug) → repository.getEquipment(slug)`; `QrCard` generates a URL such as `origin/path#/equipment/<encoded-slug>`.
- **Add/edit equipment:** `EquipmentForm → useEquipmentActions().create/update → repository.createEquipment/updateEquipment → equipment`; successful mutation invalidates all `['equipment']` queries.
- **Change status:** `StatusForm → useEquipmentActions().setStatus → repository.updateStatus → equipment`; equipment cache invalidated.
- **Read maintenance:** `EquipmentPage → useMaintenance(equipmentId, enabled) → repository.listMaintenance → maintenance_records`, ordered by `performed_on` descending.
- **Create maintenance:** `MaintenanceForm → useCreateMaintenance → repository.createMaintenance → maintenance_records`; successful mutation invalidates `['maintenance', equipmentId]` and `['equipment']`; the database trigger updates the equipment summary.
- **Admin access:** `AuthProvider` receives Supabase Auth session, then checks `maintenance_admins` for the current user; `useAuth().isAdmin` controls frontend action visibility. **RLS is the actual security boundary.**

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
| `statusDetails`, `typeLabels` | `src/domain/equipment.ts` | Single source for labels, statuses, equipment kinds. |
| `MaintenanceHistory` | `src/features/maintenance/MaintenanceHistory.tsx` | Read-only timeline for both admins and public visitors. |
| `src/style.css` | global stylesheet | Reuse existing style classes; preserve Arabic RTL and responsiveness. |

**Feature-placement rule:** feature-specific UI/hooks go under `src/features/<feature>/`; cross-feature primitives under `src/shared/`; entity types under `src/domain/`; all remote/local data access under `src/services/`.

## 5. Supabase contract, behavior and permissions

**Connected backend:** `factory-maintenance` · Supabase project ref `dkdzhndvnzgrsvwgdihp`.

| Table | Important fields | Purpose |
| --- | --- | --- |
| `public.equipment` | `id` UUID, unique `slug`, `type`, `name`, specs, `status`, `last_maintenance_on` | Public inventory and equipment profile. |
| `public.maintenance_records` | `id`, `equipment_id` FK, `kind`, `performed_on`, `notes`, `status_after`, `created_by`, `created_at` | Maintenance history, repairs, periodic services. |
| `public.maintenance_admins` | `user_id` FK to `auth.users` | Authorized maintenance admins. |

- Equipment types: `machine` and `crane`.
- Equipment statuses: `unknown`, `operational`, `out_of_service`, `maintenance`.
- Maintenance types: `repair`, `periodic`.
- A maintenance INSERT invokes `private.apply_maintenance_record()`, updating last service date and optionally status. Do not duplicate this database business rule in frontend writes.
- RLS is enabled on all three tables. Anonymous visitors can **SELECT equipment and maintenance records**. Admin-only policies still govern equipment INSERT/UPDATE and maintenance INSERT. Admin membership is checked via `maintenance_admins`. Do not assume authenticated = admin.
- **Important live-backend vs repository mismatch as of review:** The backend policy was changed to `Anyone can read maintenance records` with `SELECT` granted to `anon`, but **the inspected `main` frontend still gates history fetching and rendering behind `isAdmin`** in `EquipmentPage.tsx`. If that frontend feature hasn't already been updated elsewhere, change the page and enable history reading for visitors without weakening write access.
- No deployed Edge Functions were found at review time; the project is not using a separate custom HTTP backend.
- `supabase/schema.sql` represents the **original** schema and contains the old admin-only maintenance SELECT policy: **do not reapply it blindly** or treat it as an up-to-date migration history. Current backend state must be checked before migrations/changes. There were no recorded migrations at review time.
- Security: public Supabase client uses the **publishable key only**. Never expose `service_role`/secret keys, and never depend on hidden buttons for authorization.

## 6. Key implementation rules for AI agents

1. **Read before editing:** inspect relevant feature page/form, `queries.ts`, repository interface, both repository implementations, domain type and affected Supabase policies.
2. **Follow established flow:** Page/Form → feature hook → repository interface → selected implementation. Avoid API calls directly from UI components.
3. **Maintain demo parity:** when adding repository methods, implement both `supabaseRepository` and `demoRepository`, or explicitly explain why a feature cannot run in demo mode.
4. **Keep permissions separate:** public read and admin write are different capabilities; backend RLS enforces permission. Never expose secret keys.
5. **After mutations:** invalidate specific React Query keys so list/detail/history stay fresh; preserve loading, error and empty states.
6. **Keep the design:** Arabic labels, RTL layout, shared CSS patterns, and equipment URLs/QR stability. Avoid redesigning unrelated screens.
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
| QR label/navigation | `QrCard.tsx`, `App.tsx` | `slug`, HashRouter route, hosting paths |
| Login/roles | `AuthProvider.tsx`, `LoginModal.tsx`, `AppShell.tsx` | Supabase Auth, `maintenance_admins`, RLS |
| Dashboard search/filter | `DashboardPage.tsx` | `equipment/queries.ts`, equipment type labels |
| Shared UI style/component | `shared/ui/`, `style.css` | Existing usages in pages/forms |

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
