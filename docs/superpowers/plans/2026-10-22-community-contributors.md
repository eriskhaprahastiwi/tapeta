# Community Contributors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Komunitas a real contributor directory with city stories, privacy-safe profiles, a global leaderboard, earned badges, and a once-only closable contribution guide.

**Architecture:** Add read-only security-definer RPCs over existing `profiles`, `submissions`, and `destinations`. A small client module loads each Community section independently. The existing Community surface owns the view state, profile drill-in, and native guide dialog; no new comment storage or public moderator notes are introduced.

**Tech Stack:** React 19, TypeScript, Supabase Postgres/RPC, existing TAPETA CSS tokens and `DesainTopbar`.

**Spec:** `docs/superpowers/specs/2026-10-22-community-contributors.md`

## Global Constraints

- The leaderboard includes every account with at least one submission; rank by published count descending.
- A private profile is shown as “Kontributor” with no public profile link; never return its display name or email.
- Public stories and profiles include only published destinations and never expose pending/rejected content or `moderator_note`.
- Badge tiers use published contributions: Pencatat 1–10, Penjelajah 11–15, Pemandu 16+.
- Community stories are scoped to the selected city; leaderboard and badge count span all cities.
- Contribution guide dismissal persists once per browser profile and can be reopened from Panduan.
- Keep the TAPETA paper/ink/maroon palette, Nunito Sans, existing top bar, and 44px touch targets.

## Review Focus

- A private contributor is included in ranking without leaking their identity or linking their places; test with `public_profile=false`.
- A public profile has zero published places but several pending/rejected submissions; public RPC must return no private submission content.
- An imported destination has no `submission_id`; it must not appear as a resident story.
- One Community RPC fails while the other succeeds; render the healthy section and a local error state for the failed section.
- The guide is dismissed, the page reloads, and the user reopens it using Panduan; focus and dismissal state remain correct.

---

### Task 1: Public Community RPCs

**Files:**
- Create: `supabase/migrations/202610230004_community_contributors.sql`
- Test: `scripts/check-community.mjs`

**Interfaces:**
- Produces `public.community_leaderboard()` returning public contributor key (nullable for private profiles), display label, `public_profile`, published count, and latest published date.
- Produces `public.community_stories(p_city_id text)` returning published contribution-backed places with destination ID, name, description, category, address, region, sticker reference, author label, nullable public profile key, and publish date.
- Produces `public.community_contributor_profile(p_profile_key text)` returning profile fields and published contributions only when the profile is public; returns no row for a private or unknown key.

- [ ] **Step 1: Write the RPC contract checks**

Create `scripts/check-community.mjs` that calls the RPCs as anon and asserts their JSON shape, city filter, and absence of `email`, `moderator_note`, and non-published statuses.

- [ ] **Step 2: Run the checks before migration**

Run: `node scripts/check-community.mjs`
Expected: FAIL because the RPCs do not exist.

- [ ] **Step 3: Add the migration**

Create stable security-definer SQL functions with a fixed `search_path`. Use only `profiles.public_profile`, published `submissions`, and published `destinations`; hash profile UUIDs for public-profile links and return `null` keys for private profiles. Revoke public defaults, then grant execute to `anon, authenticated` for the public read functions.

- [ ] **Step 4: Run the checks against the migrated database**

Run: `npx supabase db push --db-url "$SUPABASE_DB_URL" --include-all --yes` then `node scripts/check-community.mjs`.
Expected: migration applies, RPC shape and privacy assertions pass.

### Task 2: Community Data Client

**Files:**
- Create: `src/lib/community.ts`
- Test: `scripts/check-community.mjs`

**Interfaces:**
- `loadCommunityLeaderboard(client: RpcClient): Promise<CommunityContributor[]>`
- `loadCommunityStories(client: RpcClient, cityId: string): Promise<CommunityStory[]>`
- `loadCommunityProfile(client: RpcClient, profileKey: string): Promise<CommunityProfile | null>`
- `badgeForPublishedCount(count: number): CommunityBadge | null`
- `mapCommunityContributorRow(row: DbRow): CommunityContributor`
- `mapCommunityStoryRow(row: DbRow): CommunityStory`

- [ ] **Step 1: Add mapping assertions**

Extend the script checks for RPC row mapping, anonymous labels, badge boundaries 1/10/11/15/16, and profile-null behavior.

- [ ] **Step 2: Run the mapping checks**

Run: `node scripts/check-community.mjs`.
Expected: FAIL until client functions are implemented.

- [ ] **Step 3: Implement typed loaders and badge mapping**

Keep leaderboard and story RPC calls separate so each section owns its loading/error state. Map snake_case response fields to explicit TypeScript interfaces; do not pass raw database records into JSX.

- [ ] **Step 4: Run typecheck and data checks**

Run: `npx tsc -b --pretty false` and `node scripts/check-community.mjs`.
Expected: no TypeScript errors and all shape/threshold assertions pass.

### Task 3: Community Page and Guide Dialog

**Files:**
- Modify: `src/tapeta/Community.tsx`
- Modify: `src/tapeta/tapeta.css`
- Test: `scripts/check-ui.mjs`

**Interfaces:**
- Community consumes the three loaders from `src/lib/community.ts`, passing the existing Supabase client, existing `CommunityProps`, and `useChrome()` for sign-in behavior.
- Profile drill-in uses an internal state `{ type: "contributor"; profileKey: string }`; `Back to community` restores the previous tab.

- [ ] **Step 1: Add UI acceptance checks**

Extend `scripts/check-ui.mjs` for `#komunitas`: expected tabs, empty story state, contributor list, public-profile drill-in, guide first-run visibility, dismissal persistence, and reopen action.

- [ ] **Step 2: Run checks to establish failures**

Run: `PLAYWRIGHT_MODULE=<local-playwright-module> node scripts/check-ui.mjs`.
Expected: Community behavior assertions fail before implementation.

- [ ] **Step 3: Implement the Community surface**

Build a paper/ink contributor directory with a distinct story stream and leaderboard composition. Use published place descriptions and real names only when public profile is enabled. Public profile drill-in lists published places, and place clicks call the existing `onOpenDestination`.

- [ ] **Step 4: Implement the one-time guide**

Use native `<dialog>` with `showModal()`, Escape, backdrop click, visible close button, focus restoration, and localStorage key `tapeta:community-guide-dismissed:v1`. Add a Panduan button to reopen it after first dismissal.

- [ ] **Step 5: Verify desktop and mobile behavior**

Run the UI checks at 1440×1000 and 390×844. Expected: both data sections work independently, private contributor labels stay anonymous, guide shows once/reopens, and there is no horizontal overflow or console error.

### Task 4: Integration Verification

**Files:**
- Create: `scripts/check-community-fixture.sql`
- Verify: `src/App.tsx`, `src/tapeta/Community.tsx`, `src/lib/community.ts`, migration and RPCs.

- [ ] **Step 1: Verify public data privacy**

Call the leaderboard, story, and profile RPCs as anon and as the signed-in owner. Confirm private profile name and non-published review details never appear.

- [ ] **Step 2: Verify a published story path**

The current project has no published, submission-backed community stories. Run `scripts/check-community-fixture.sql` to verify RPC privacy against a transaction-rolled-back fixture; then run `.qa/community-story-smoke.mjs`, which supplies a representative story response while using a real published destination ID, and confirm clicking the place opens the existing detail/map route.

- [ ] **Step 3: Run the final checks**

Run: `npx tsc -b --pretty false`, `npm run lint`, `npm run build`, and `scripts/check-ui.mjs`.
Expected: all pass with zero page errors and zero horizontal overflow at 390px.
