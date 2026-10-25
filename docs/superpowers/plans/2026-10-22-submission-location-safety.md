# Submission Location Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent inaccurate submissions and destination edits from reaching the public map, and make the admin review path reliable.

**Architecture:** Enforce location and state-transition rules in Supabase functions/triggers, then mirror those rules in the existing React form and admin UI. Use the existing OSM district geometries in `city_regions`; geolocation accuracy over 100 m requires a manual map/coordinate confirmation. Keep UI and database tests rollback-only.

**Tech Stack:** React 19, TypeScript, Leaflet, Supabase Postgres/PostGIS, existing Playwright smoke script and SQL regression fixture.

**Spec:** `docs/superpowers/specs/2026-10-22-submission-location-safety.md`

## Global Constraints

- Keep TAPETA's existing Indonesian copy, paper/ink/maroon palette, Nunito Sans, Leaflet map and Supabase Auth.
- Do not add Google OAuth or new runtime dependencies.
- Do not leave test rows or edits in the live Supabase database.
- Validate city and district geometry at the database boundary for every submission/destination write path.
- Keep the existing OSM boundary source and district codes; derive the region code from the geometry on admin coordinate edits.

## Review Focus

- A 50 m point outside the city must be rejected by UI and server, not accepted by a 100 m tolerance; test both paths.
- A draft with `coordinate_confidence=approximate` must not publish before explicit verification; test both UI and RPC.
- GPS accuracy over 100 m must remain provisional until a map tap or both coordinate fields are manually edited; test with a 5 km browser fixture.
- Admin edits/imports must not bypass the same boundary check; test rollback-only RPC operations.
- A queue reload must fetch new rows without clearing filters or creating duplicate moderation actions.
- If the selected review disappears after refresh, select the first remaining review instead of leaving the detail panel blank.

---

### Task 1: Database Boundary and Publication Rules

**Files:**
- Create: `supabase/migrations/202610230005_submission_location_safety.sql`
- Modify: `supabase/tests/access_and_moderation.sql`

**Interfaces:**
- `public.validate_submission()` rejects missing city boundaries, out-of-city coordinates, and a `region_code` that does not cover the submitted point.
- New trigger on `public.destinations` applies the same check to imports and admin edits.
- `public.admin_update_destination(...)` derives `region_code` from `city_regions` for the new point.
- `public.admin_verify_destination(uuid,text)` only publishes a destination already in `verified` status.

- [x] Add rollback-only SQL checks for far-outside and near-outside points, valid points, admin coordinate edits, and publish-from-draft rejection.
- [x] Run those checks against a disposable database fixture or through explicitly rolled-back live transactions.
- [x] Add the migration with exact geometry checks and `verified`-before-`published` transition.
- [x] Apply migration to Supabase and verify no existing destination is outside its city/district before enabling strict triggers.
- [x] Run the SQL checks again and confirm no QA rows remain.

### Task 2: Contributor GPS Accuracy

**Files:**
- Modify: `src/tapeta/Contribute.tsx`
- Modify: `scripts/check-ui.mjs`

**Interfaces:**
- Track GPS `coords.accuracy` in meters.
- GPS points with accuracy greater than 100 m are shown as provisional and cannot continue until a map tap or both manual coordinate fields clear that state.

- [x] Add a Playwright case where 5 km GPS accuracy leaves “Lanjut” disabled and manual map selection enables it.
- [x] Verify the test fails against the current behavior.
- [x] Implement accuracy feedback and clear provisional GPS state on map/coordinate edits.
- [x] Run the location tests at 390 px and 1440 px.

### Task 3: Admin Review Workflow

**Files:**
- Modify: `src/tapeta/States.tsx`
- Modify: `src/tapeta/Account.tsx`
- Modify: `src/tapeta/tapeta.css`
- Modify: `scripts/check-ui.mjs`

**Interfaces:**
- Admin dashboard “Lihat semua” navigates to `#admin`.
- Admin queue exposes an accessible “Muat ulang antrean” control that reloads submissions.
- Import UI offers “Publikasikan” only for `verified` rows; drafts must pass verification first.

- [x] Add browser assertions for direct queue navigation, queue refresh after fixture changes, and hidden publish action on draft rows.
- [x] Verify those assertions fail against the current behavior.
- [x] Implement navigation, manual refresh and the draft-to-verified-to-published flow.
- [x] Verify UI and server reject publish-from-draft, including approximate drafts; verify the next queued review is selected after a decision.

### Task 4: Full Verification

**Files:**
- Verify: contribution, account, admin, migration, and test scripts.

- [x] Run `scripts/check-ui.mjs` at 320, 390 and 1440 CSS px with no horizontal overflow or page errors.
- [x] Run `node scripts/check-community.mjs`, typecheck, lint, and production build.
- [x] Verify anonymous access is denied, moderator access succeeds, and rollback-only tests leave no fixture rows.
- [x] Inspect rendered GPS warning, review controls, queue refresh state, and keyboard focus.
