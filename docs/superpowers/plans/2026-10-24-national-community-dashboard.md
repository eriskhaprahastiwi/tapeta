# National Community Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a national Community dashboard with city-scoped stories, local and Indonesia-wide visit leaderboards, public contributor profiles, privacy controls, and four visit badges.

**Architecture:** Extend the existing Community RPC boundary to aggregate eligible visited TAPETA destinations from `personal_places`, preserving anonymous private rows. Keep all presentation changes inside the existing Community and profile editor surfaces, with the selected city passed to the local leaderboard RPC. The UI uses current stateful tabs and the existing destination-detail callback rather than adding routing.

**Tech Stack:** React 19, TypeScript, Supabase Postgres RPC, existing TAPETA CSS, Playwright UI regression, SQL fixture.

**Spec:** `docs/superpowers/specs/2026-10-24-national-community-dashboard-design.md`

## Global Constraints

- `profiles.public_profile` is the one privacy control; private contributors are anonymous and non-actionable everywhere in Community.
- Eligible public visits require a non-null `visited_on`, a linked destination, and `destinations.publication_status = 'published'`.
- Stories remain scoped to the selected city; only leaderboard scope changes between the selected city and all Indonesia.
- Badge thresholds are Perintis 1-4, Penjelajah 5-9, Pemandu 10-14, and Pelopor 15+ eligible visits.
- Do not expose OSM-only visits, emails, timelines, unpublished submissions, or moderation notes.
- Preserve existing warm TAPETA visual language and provide 44px minimum controls, focus-visible states, no horizontal overflow, and reduced-motion support.

## Review Focus

- A private profile with eligible visits ranks anonymously and never exposes a stable profile key or clickable profile row.
- A visit to an OSM-only or archived/unpublished destination never changes leaderboard counts or badge level.
- Switching between local and Indonesia scope reloads and displays the correct ranking without stale city data.
- A public profile that has visits but no contributions still opens and displays its visit history correctly.
- Boundary totals 0, 1, 4, 5, 9, 10, 14, and 15 map to no badge or exactly one intended badge.

---

### Task 1: Add privacy-safe visit leaderboard RPCs

**Files:**
- Create: `supabase/migrations/202610240001_community_visit_leaderboard.sql`
- Modify: `scripts/check-community-fixture.sql`

**Interfaces:**
- Consumes: `profiles.public_profile`, `personal_places.visited_on`, `personal_places.destination_id`, `destinations.publication_status`.
- Produces: `community_visit_leaderboard(p_city_id text default null)` returning JSON rows with `profile_key`, `display_label`, `public_profile`, `visited_count`, and `latest_visited_at`; `community_contributor_profile(p_profile_key text)` enriched with `visited_count` and `visited_places`.

- [ ] **Step 1: Write the failing SQL fixture assertions**

Add fixture rows for eligible published destination visits, OSM-only visits, and a private profile. Assert national and Pekanbaru counts, anonymous private row shape, and the enriched public profile visit list.

- [ ] **Step 2: Run the fixture against the Supabase project to verify it fails**

Run the repository's existing Supabase SQL fixture command with the new migration absent.
Expected: FAIL because `community_visit_leaderboard` does not exist.

- [ ] **Step 3: Implement `community_visit_leaderboard(p_city_id text default null)`**

Create a security-definer SQL function that groups eligible visit rows by profile, filters by `p_city_id` only when provided, emits identity only for `public_profile = true`, and orders by count, maximum visit date, then profile creation. Update `community_contributor_profile` to return only eligible visits for a public owner, plus its total.

- [ ] **Step 4: Run the fixture to verify it passes**

Run the same SQL fixture command.
Expected: PASS with no leaked private keys, names, or OSM-only visits.

- [ ] **Step 5: Commit the migration and fixture**

```bash
git add supabase/migrations/202610240001_community_visit_leaderboard.sql scripts/check-community-fixture.sql
git commit -m "feat: add community visit leaderboard"
```

### Task 2: Map visit leaderboard and badge data

**Files:**
- Modify: `src/lib/community.ts`

**Interfaces:**
- Consumes: `community_visit_leaderboard(p_city_id)` JSON rows and enriched `community_contributor_profile` JSON.
- Produces: `CommunityVisitLeaderboardEntry`, updated `CommunityProfile`, `badgeForVisitedCount(count: number)`, and `loadCommunityVisitLeaderboard(client, cityId: string | null)`.

- [ ] **Step 1: Write failing mapping assertions in the existing UI regression support or a focused Node test**

Cover the badge boundaries `0, 1, 4, 5, 9, 10, 14, 15`, public row profile key retention, and private row anonymisation.

- [ ] **Step 2: Run the focused test to verify it fails**

Run the focused test command.
Expected: FAIL because the visit leaderboard types and badge mapper do not exist.

- [ ] **Step 3: Implement visit-specific community types and RPC loader**

Keep contribution counts separate from visit counts. Replace the existing three contribution badge definitions with the four visit badge definitions where leaderboard/profile badge presentation uses visit data. Map profile `visited_places` through the existing story-place mapper so current destination cards can render them.

- [ ] **Step 4: Run focused test and project type check**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit the client data boundary**

```bash
git add src/lib/community.ts <test-file>
git commit -m "feat: map community visit ranks and badges"
```

### Task 3: Extend profile privacy settings

**Files:**
- Modify: `src/components/ProfileEditor.tsx`
- Modify: `src/tapeta/tapeta.css`

**Interfaces:**
- Consumes: existing `profiles.public_profile` database field.
- Produces: explicit public/private control copy explaining name, visits, contributions, and badges become visible only while public.

- [ ] **Step 1: Add a failing Playwright assertion for the profile privacy explanation**

In `scripts/check-ui.mjs`, open the signed-in profile editor fixture and assert that the visibility choice has a clear public/private label and describes Community visibility.

- [ ] **Step 2: Run the UI check to verify it fails**

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`
Expected: FAIL because the privacy explanation is missing.

- [ ] **Step 3: Make the privacy control explicit**

Keep the existing persisted `public_profile` checkbox, but replace its ambiguous label with a public/private fieldset or equivalent native control and supporting copy. Preserve the existing save behavior and accessible input label.

- [ ] **Step 4: Run the UI check to verify it passes**

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`
Expected: PASS at 320px, 390px, and 1440px.

- [ ] **Step 5: Commit profile settings**

```bash
git add src/components/ProfileEditor.tsx src/tapeta/tapeta.css scripts/check-ui.mjs
git commit -m "feat: clarify community profile privacy"
```

### Task 4: Build Community directory, leaderboard, and profiles

**Files:**
- Modify: `src/tapeta/Community.tsx`
- Modify: `src/tapeta/tapeta.css`
- Modify: `scripts/check-ui.mjs`

**Interfaces:**
- Consumes: `loadCommunityStories`, `loadCommunityLeaderboard`, `loadCommunityVisitLeaderboard`, `CommunityProfile`, `badgeForVisitedCount`, selected `cityId`, and `onOpenDestination`.
- Produces: Community tabs `stories`, `contributors`, and `leaderboard`; `local` and `national` leaderboard scope; public profile visits, contributions, total, highest badge, and full badge progression.

- [ ] **Step 1: Add failing Community UI assertions**

Mock both leaderboard RPC responses in `scripts/check-ui.mjs`. Assert the three views exist, `Lokal: <city>` and `Seluruh Indonesia` are keyboard-operable buttons, switching scope updates ranking output, private rows have no profile button, and public profile includes visit count plus all four badge labels.

- [ ] **Step 2: Run the Community UI check to verify it fails**

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`
Expected: FAIL because no leaderboard tab or visit-based scope control exists.

- [ ] **Step 3: Implement Community state and loading flows**

Add the leaderboard tab and a scope state. Load national data with `null`; reload local data with `cityId`. Keep stories bound to `cityId`; do not change the existing story query. Preserve loading, error, retry, empty, and profile-back states.

- [ ] **Step 4: Implement profile and badge presentation**

Show one material badge mark for each ranked contributor and their highest level. In public profiles, show a visit total, visit list, published contribution list, and all four badge levels with current level discernible beyond colour. Private rows remain plain anonymous, non-clickable rows.

- [ ] **Step 5: Style responsive dashboard states**

Maintain `Cerita warga lokal` as a one-line desktop heading where space permits. Use a responsive single-column layout on mobile, allow scope controls to wrap without clipping, preserve visible focus rings, and limit glow/material accents to the active badge or selected scope.

- [ ] **Step 6: Run UI regression to verify it passes**

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`
Expected: PASS at 320px, 390px, and 1440px with no page errors or horizontal overflow.

- [ ] **Step 7: Commit the Community interface**

```bash
git add src/tapeta/Community.tsx src/tapeta/tapeta.css scripts/check-ui.mjs
git commit -m "feat: build national community leaderboard"
```

### Task 5: Full verification and deployment preparation

**Files:**
- Modify: no source changes expected

**Interfaces:**
- Consumes: completed SQL migration, client mapping, privacy setting, and Community UI.
- Produces: verification evidence suitable for deployment.

- [ ] **Step 1: Run database fixture**

Run the Community fixture against the configured Supabase project.
Expected: PASS for public, private, local, national, eligible-visit, and badge-boundary behavior.

- [ ] **Step 2: Run full application verification**

Run:

```bash
npm run typecheck
npm run lint
npm run build
PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs
```

Expected: all commands exit successfully; build may retain the existing JavaScript chunk-size warning.

- [ ] **Step 3: Review mobile and desktop screenshots**

Inspect Community at 320px, 390px, and 1440px. Confirm no overflow, readable badge progression, usable scope controls, and private rows are visually non-actionable.

- [ ] **Step 4: Commit verification-only adjustments if required**

```bash
git add <intended-files>
git commit -m "test: verify community dashboard"
```

## Self-Review

- Stories, contributor directory, dual-scope leaderboard, public profile, profile privacy, four badges, and city context each map to Tasks 1-4.
- Public/private privacy, OSM-only exclusion, scope reloads, public visit-only profiles, and badge boundaries appear in Review Focus and are assigned concrete verification steps.
- RPC result fields and client function names are defined in Task 1 and Task 2, then consumed by Task 4.
- The plan intentionally keeps Community in its existing files and current Supabase RPC pattern rather than introducing a new routing or state layer.
