# Wishlist and Personal History Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task.

**Goal:** Private saved places, visits, timeline, and moderated visit stories for TAPETA accounts.
**Architecture:** Supabase private place snapshots with owner-scoped RLS; atomic RPCs for saves/visits/stories and a public published-story projection. Shared React bookmark and account views use the existing auth session and request events, not local-only storage.
**Tech Stack:** React, TypeScript, Supabase Postgres/PostGIS, existing Playwright checks.
**Spec:** docs/superpowers/specs/2026-10-23-wishlist-personal-history-design.md

## Global Constraints
- Wishlist sources: OSM locations and published TAPETA destinations only.
- Private timeline and visits remain owner-only; moderation only exposes submitted stories.
- Preserve Nunito Sans, paper/ink/brick tokens, 44px controls, keyboard focus and mobile layouts.
- No new runtime dependency. No commits or deployment unless requested.

## Review Focus
- Account switches cannot expose previous account state: reload on user ID and ignore stale responses.
- Double-clicks and repeated saves must not duplicate records/events: transaction locks and unique keys.
- OSM vs catalog identity matches only by canonical OSM ID; never merge by distance/name.
- Archived catalog places cannot masquerade as published: derive status on server reads.
- Publishing a visit story cannot create another destination or expose the visit date.

### Task 1: Database and privacy
Files: new migration `supabase/migrations/202610230006_personal_places.sql`; test `scripts/check-personal.mjs`.
Interfaces: `save_personal_place(p_destination_id uuid default null,p_osm jsonb default null,p_city jsonb default null)` -> jsonb; `list_personal_places()` -> jsonb; `update_personal_place(p_id uuid,p_action text,p_date date default null)` -> jsonb; `personal_timeline(p_offset integer default 0)` -> jsonb; `submit_visit_story(p_place_id uuid,p_body text)` -> jsonb; `list_visit_stories(p_scope text,p_city_id text default null)` -> jsonb; `moderate_visit_story(p_id uuid,p_action text,p_note text default null)` -> void.
- [ ] Write rollback tests for source validation, cross-user privacy, idempotency, visit dates, story states/publication privacy.
- [ ] Run and confirm missing RPC failure.
- [ ] Implement private tables, RPCs, RLS and 50-item timeline pages; derive catalog snapshots server-side and canonical OSM keys.
- [ ] Run SQL tests against the live database in rolled-back transactions after applying migration.

### Task 2: Shared client and save actions
Files: `src/lib/personal.ts`, `src/components/SavePlaceButton.tsx`; modify Explore, Mobile, OsmPlaceSearch, Community and App.
Interfaces: `PersonalPlace`, `PlaceTarget`, `VisitStory`; RPC wrappers; bookmark component accepts target and auth opens through ChromeContext.
- [ ] Add browser assertions for save prompt, source identity, repeated saves and account switch isolation.
- [ ] Implement shared server-state hook with refresh events, stale-response guards and explicit error states.
- [ ] Add save actions to published detail cards, community cards/profiles, selected OSM result, and OSM map preview.

### Task 3: My TAPETA, visits and stories
Files: new `src/components/PersonalPlaces.tsx`; modify Account, App, tapeta.css.
- [ ] Test wishlist filter, visit/date/cancel, remove, timeline and story submission.
- [ ] Add My TAPETA sections and owner-data states, city filter, map navigation, safe external directions, date controls and story dialog.
- [ ] Map navigation changes city before focusing stored point; missing city boundaries report retryable error.

### Task 4: Moderation and public stories
Files: new `src/components/VisitStories.tsx`; modify Community and admin queue.
- [ ] Test published-only public visibility, anonymous authors, moderation reasons and no destination creation.
- [ ] Add moderated visit stories to Community, source labels and save actions; admin story queue to existing review page.

### Task 5: Verification
- [ ] Typecheck, lint and build.
- [ ] SQL privacy tests, browser wishlist/story workflow and existing check-ui on 320/390/1440.
- [ ] Inspect desktop/mobile screenshots; one correction batch if needed.
