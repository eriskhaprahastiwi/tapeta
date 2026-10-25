# National Community Dashboard Design

## Intent

Make Community a nationwide TAPETA space for discovering local stories and recognising people who share their travel history. The selected city remains important: it filters local stories and the local leaderboard rather than limiting the entire community surface to one city.

## Goals

- Keep `Cerita warga lokal` on one line at supported desktop widths and retain the city picker as the story context.
- Add distinct `Cerita warga`, `Kontributor`, and `Leaderboard` views.
- Rank people by the number of places they have marked as visited.
- Let the leaderboard switch between the selected city and all Indonesia.
- Show a public contributor profile with their visited places, published contributions, total visits, and badge.
- Let a profile owner choose `Publik` or `Privat` in profile settings.
- Keep private people eligible for leaderboard ranking while exposing them only as `Kontributor`, without a linkable profile or visit list.
- Award one highest badge from shared visits: Perintis (1-4), Penjelajah (5-9), Pemandu (10-14), Pelopor (15+).

## Non-goals

- Do not publish a private profile's name, place list, visit dates, or profile key.
- Do not expose unpublished submissions, moderation notes, email addresses, or personal timelines.
- Do not replace city filtering for stories with national aggregation.
- Do not fabricate contributor data when no public data exists.

## Data And Privacy

`profiles.public_profile` is the single community privacy setting. It already exists and becomes the control for public visit data as well as contribution data.

When `public_profile` is true, Community may show the profile owner's display name, total visited-place count, visited-place list, published contributions, and badge. When it is false, leaderboard aggregation still includes their visited-place count but returns no stable profile key, no name, and no places. The UI labels that row `Kontributor` and does not make it actionable.

Visited-place counts derive only from `personal_places` rows with a non-null `visited_on` that link to a currently published TAPETA destination. Local leaderboard counts restrict those rows to the current `city_id`; national counts have no city filter. OSM-only visits remain private in My TAPETA and never appear in a Community count, badge, profile, or leaderboard. Duplicate personal records are already prevented per user and place key, so each eligible visited row counts once.

## Community Views

### Stories

Stories stay scoped to the selected city. The city picker remains in the Community header and text makes that scope clear. The main `Cerita warga lokal` title must not wrap unnecessarily.

### Contributors

This is a browseable directory of eligible public profiles. It can reuse the existing national contributor RPC and profile detail flow, updated to show visit total and the new badge hierarchy.

### Leaderboard

The leaderboard has two controls: `Lokal: <selected city>` and `Seluruh Indonesia`. It ranks descending by visited count, then by most recently visited place, then stable profile creation order. The city-specific control always uses the currently selected city. A private user remains ranked but has the anonymous presentation described above.

### Profile

A public contributor profile shows its selected highest badge, total visited places, the list of visited TAPETA destinations, and published contribution places. Each place opens its existing destination detail. Private contributor rows never open a profile.

## Badge System

The UI presents badges as recognisable level marks rather than plain text pills. Only the highest earned badge is shown in leaderboard rows and the profile header; the profile also shows the complete four-level progression.

| Badge | Material | Shared visits |
| --- | --- | --- |
| Perintis | Perunggu | 1-4 |
| Penjelajah | Silver | 5-9 |
| Pemandu | Gold | 10-14 |
| Pelopor | Diamond | 15+ |

## Interface Direction

Preserve the existing warm TAPETA editorial palette, display typography, and restrained paper surfaces. The city selector is a functional context control. Badge marks distinguish real rank state; each uses its material treatment only in the profile and leaderboard, rather than spreading decorative colour across the page. The leaderboard toggle is a real state control and must work by mouse, keyboard, and touch. Mobile reflows to a single column with no horizontal overflow and keeps all controls at least 44px tall.

## Validation

- SQL fixture verifies public profile output, private anonymisation, national count, city-filtered count, and all four badge boundaries.
- UI regression verifies stories remain city-scoped, the local/national toggle changes leaderboard content, private rows cannot open profiles, and public profile view exposes visits and badge progression.
- Verify at 320px, 390px, and 1440px, including keyboard focus and reduced-motion styling.
