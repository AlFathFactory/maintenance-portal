# Phase 9 release and rollback checklist

## Before release

1. Identify the release owner and confirm the target deployment and Supabase project. The checked-in production configuration and `.env.local` both point to `dkdzhndvnzgrsvwgdihp`; treat it as production until the owner confirms otherwise.
2. Confirm a recent restorable database backup and record the previous known-good frontend build/commit. No Phase 9 database migration exists.
3. Provision an isolated staging Supabase project/branch with the nine HSE tables, current RLS, triggers, RPCs, published checklist, and separate Engineer/Supervisor accounts. Keep production secrets and user records out of staging.
4. Run the live authorization and end-to-end matrix in `HSE_TEST_MATRIX.md`; record backend responses and screenshots. Verify checklist publishing requirements and accept or reject the reporting scale limit with the release owner.
5. Resolve or accept the Security Advisor findings, review `npm audit` dev-toolchain advisories, and confirm Node/npm versions (verified locally: Node 22.17.0, npm 10.9.2). Run `npm ci`, `npm run typecheck`, `npm run format:check`, `npm run test:hse`, `npm run test:browser`, and `npm run build`.
6. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the approved deployment environment. These are browser-public values; no service-role key belongs in the bundle. Review Auth redirect URLs, HashRouter deep links, static asset base paths, and access-denied behavior.

## Release

1. Obtain release-owner approval after all mandatory gates pass. Push the Phase 9 branch and earlier unpublished HSE history through normal review; do not force-push or push to `main` directly.
2. Deploy the reviewed frontend build only to the approved target. No schema changes are part of this phase.
3. Smoke-test application load, login/logout, HSE and Maintenance routes, public QR route, Engineer approval access, denied Supervisor approval, Arabic/English layout, and API project URL. Check console errors and network failures.
4. Monitor Auth/API errors, failed HSE mutations, reporting unavailable states, and unexpected 401/403 responses. Record the release timestamp and deployed commit.

## Rollback

1. Redeploy the recorded previous known-good frontend build using the hosting provider's normal version rollback. Do not run database rollback SQL; Phase 9 has no database migration.
2. Existing sessions may remain active. Re-test login, role guards, HSE/Maintenance routes, public QR, and critical reads after rollback; sign out/in if the old bundle cannot restore a session.
3. Confirm API calls still target the intended project and monitor errors. Escalate any data-integrity concern before resuming writes.

No deployment or rollback was executed during Phase 9.
