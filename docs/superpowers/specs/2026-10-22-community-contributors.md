# Community Contributors Experience

## Intent

Turn TAPETA's Komunitas page into a real directory of contributors and their published place contributions. Visitors can browse a city story stream, open a contributor profile, see that contributor's published places, and understand the public review state. The page uses verified Supabase data only.

## Decisions confirmed with the owner

- Komunitas centers on contributors, their profiles, contributions, reviews, leaderboard, and badges.
- The leaderboard includes every account with at least one submission, including people with zero published places. Rank by published count descending; show only the published count publicly. If `profiles.public_profile` is false, show the person as **Kontributor**, do not expose their display name or email, and do not link to a profile that would connect their places together.
- Public profile pages may show that contributor's published places. Pending, rejected, and moderator-only notes stay private. Private contributors can inspect their full history in My TAPETA. Public story entries from private contributors use the anonymous label and do not link to a profile.
- The Community page's city story stream is scoped to the selected city. Clicking a place opens the existing destination detail/map flow.
- Leaderboard ranking and badges count published contributions across all cities, so the model remains useful as TAPETA expands.
- Badge tiers: **Pencatat** for 1–10 published contributions, **Penjelajah** for 11–15, **Pemandu** for more than 15. Show the highest tier reached.
- “Review” means the moderator's publication decision/status. Public moderator notes and visitor-to-visitor comments are not part of this first implementation.
- “Cara berkontribusi” opens as a dismissible modal once per browser profile. A visible Panduan button can reopen it. Persist dismissal with local storage; support Escape, close button, and backdrop click.

## Page structure

1. **Community header** — “Cerita warga {city}”, a short explanation, and a specific “Tambah kontribusi” action. Keep the existing TAPETA top bar and paper/ink visual language.
2. **Community navigation** — clearly labeled tabs for “Cerita warga” and “Kontributor”.
3. **Cerita warga** — real published destinations connected to submissions in the selected city. Each entry shows the contributor label (name only for public profiles), place name, existing description when present, category/region, published status, and a link to open the existing destination detail. Missing descriptions remain empty/explicit; do not invent stories.
4. **Kontributor** — global leaderboard of every contributor with at least one submission, ranked by published count. Show real published counts, highest earned badge, and privacy-safe labels. Clicking a public row opens a profile view with that contributor's published places; private rows are anonymous and not clickable.
5. **Cara berkontribusi modal** — explain the existing contribution flow: select a map point, add place details and source, then submit for moderator review. Dismissal is stored locally and a Panduan control reopens the dialog.

## Data and privacy contract

- Reuse `profiles.public_profile`, `submissions`, `destinations`, and `moderation_events`; do not hardcode contributor names, stories, counts, or badges.
- Add security-definer public RPCs with a fixed `search_path`; return only aggregate leaderboard fields and published contribution fields.
- Public RPCs never return emails, pending/rejected submission content, or `moderator_note`.
- Profile IDs may be used internally for public-profile navigation, but private profiles remain anonymous and their contribution history is not linked together publicly.
- Stories and profile contribution lists include only destinations with `publication_status='published'` and a published originating submission.
- Empty/loading/error states explain what is missing and offer the next useful action.

## Visual and interaction direction

- Preserve TAPETA's paper cream, ink panels, maroon action color, Nunito Sans, and existing top bar.
- Give the story stream and contributor leaderboard different hierarchy, not identical card grids.
- Keep all controls keyboard-operable, with visible focus and 44px minimum touch targets.
- Contributor profile navigation is an in-page state with an obvious Back to community action.
- The one-time guide uses a native dialog, restores focus on close, and does not reappear after dismissal unless the Panduan button is used.

## Acceptance checks

- Anonymous visitor can see city stories and the global leaderboard without receiving private names or submissions.
- Public profile name appears only when `public_profile=true`; private contributors remain anonymous and have no public profile link.
- Clicking a public contributor opens their published contribution list; clicking a place opens existing detail/map UI.
- Badge thresholds use published contribution counts: 1–10, 11–15, 16+.
- The guide opens once, dismisses by Escape/button/backdrop, stays dismissed after reload, and can be reopened with Panduan.
- Loading, empty, and backend error states render; no fabricated story or contributor appears.
- Contributor leaderboard and city story stream load independently; a failure in one does not blank the other.
- Desktop and mobile layouts have no horizontal overflow; controls have visible focus and usable touch targets.
