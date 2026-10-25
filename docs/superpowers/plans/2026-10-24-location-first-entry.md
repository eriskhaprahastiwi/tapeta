# Location-First Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask for location context on every landing entry and support an unscoped Indonesia OSM map when the visitor declines city selection.

**Architecture:** Keep city context nullable in `App` and separate the landing-entry intent from the existing persistent city picker. A focused entry dialog owns the three starting choices. The existing Explore shell renders a distinct unscoped state when no city context has been chosen, rather than defaulting to Pekanbaru.

**Tech Stack:** React, TypeScript, Leaflet/OpenStreetMap, existing Playwright UI smoke script.

**Spec:** `docs/superpowers/specs/2026-10-24-location-first-entry.md`

## Global Constraints

- Ask for location on every landing entry, regardless of saved city state.
- Never silently use Pekanbaru for an unscoped entry.
- Reuse the existing city search and location-detection data paths.
- Do not change backend schemas, APIs, authentication, or destination data.
- Support desktop, 390px, and 320px without horizontal overflow.
- New controls are keyboard-operable and have 44px minimum touch targets.

## Review Focus

- Returning visitor with a saved Pekanbaru selection: landing still opens the entry dialog.
- Location permission denied: visitor can continue to the unscoped Indonesia OSM map.
- Unscoped map: no Pekanbaru city label, bounds, regions, or destination data is rendered.
- City selected from search: existing city load and destination interactions remain available.
- Mobile 320px: dialog and unscoped-state actions remain visible and do not overflow.

---

### Task 1: Entry Location Dialog

**Files:**
- Create: `src/components/EntryLocationPrompt.tsx`
- Modify: `src/App.tsx`
- Modify: `src/tapeta/tapeta.css`
- Test: `scripts/check-ui.mjs`

**Interfaces:**
- Consumes: `onUseLocation(): void`, `onChooseCity(): void`, and `onExploreWithoutCity(): void` from `App`.
- Produces: an accessible location-choice dialog opened by the landing CTA.

- [ ] **Step 1: Write failing Playwright assertions**

Assert that activating either landing entry control opens a dialog with location detection, city selection, and unscoped-map actions at 320px, 390px, and 1440px.

- [ ] **Step 2: Run the UI script to verify failure**

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`
Expected: FAIL because the location-choice dialog does not exist.

- [ ] **Step 3: Implement `EntryLocationPrompt` and landing entry state**

Add a modal dialog that labels its choices clearly, uses the existing location detector and city picker, and closes only when a choice or explicit dismiss action is taken.

- [ ] **Step 4: Run the targeted dialog checks**

Run the Playwright assertions for each viewport.
Expected: PASS with no console errors or horizontal overflow.

### Task 2: Unscoped Indonesia Map State

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/MapView.tsx`
- Modify: `src/tapeta/Explore.tsx`
- Modify: `src/tapeta/Mobile.tsx`
- Modify: `src/tapeta/tapeta.css`
- Test: `scripts/check-ui.mjs`

**Interfaces:**
- Consumes: nullable city context from `App` and the `onChooseCity` action from Task 1.
- Produces: a map state that omits city-specific geometry/data and provides explored-city and contribution actions.

- [ ] **Step 1: Write failing Playwright assertions**

Assert that choosing the unscoped action opens Explore without Pekanbaru labels or city bounds and exposes both next actions.

- [ ] **Step 2: Run the focused assertion to verify failure**

Run the new Playwright assertion.
Expected: FAIL because current Explore defaults to Pekanbaru.

- [ ] **Step 3: Implement nullable-city rendering**

Prevent initial city loading until an explicit choice. Render the unscoped OSM map and an honest unscoped-state message with actions that open city selection or route to contribution only after city selection.

- [ ] **Step 4: Run the focused assertion to verify success**

Run the new Playwright assertion.
Expected: PASS at desktop, 390px, and 320px.

### Task 3: Regression Verification

**Files:**
- Modify: `scripts/check-ui.mjs`

**Interfaces:**
- Consumes: entry dialog and unscoped-map behavior from Tasks 1-2.
- Produces: automated coverage for normal city selection, no-city fallback, and no horizontal overflow.

- [ ] **Step 1: Extend regression coverage**

Cover a selected city path after opening the landing dialog, city-picker opening from the unscoped state, and the existing mobile Explore controls.

- [ ] **Step 2: Run full verification**

Run: `npm run typecheck && npm run lint && npm run build`

Run: `PLAYWRIGHT_MODULE=... node scripts/check-ui.mjs`

Expected: all checks pass; document any unrelated landing animation timeout if it recurs.
