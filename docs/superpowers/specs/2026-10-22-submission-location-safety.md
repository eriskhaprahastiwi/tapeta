# Submission Location and Moderation Safety

## Intent

Prevent inaccurate place locations from reaching the public map and make the contributor-to-admin workflow easier to operate.

## Requirements

- A contribution point must be inside a loaded district polygon for the selected city.
- Supabase must enforce the same city and district boundary rules for submissions and destination inserts/updates; client-only checks are insufficient.
- A draft imported destination must be explicitly verified before it can be published.
- Browser geolocation with reported accuracy worse than 100 meters is provisional. The contributor must choose a point on the map or edit both coordinates manually before continuing.
- Admins need a direct route from “Lihat semua” to the moderation queue and a visible way to refresh the queue.
- The existing email/password Supabase Auth flow remains. Google OAuth is not added.
- Any live database probes must use rollback-only fixtures; leave no test submissions or destination changes behind.

## Out of Scope

- Changing the identity provider or adding Google OAuth.
- Automatically publishing user or imported submissions.
- Changing public catalog content.

## Acceptance Checks

- Out-of-city points are rejected in the browser and by Supabase RPCs/triggers.
- Valid in-city points still submit and can be moderated.
- Admin cannot publish an unverified draft through UI or RPC.
- Approximate GPS requires manual confirmation; accurate GPS remains usable and its accuracy is shown.
- “Lihat semua” opens the queue; queue refresh fetches current rows.
- Signed-out and anonymous users cannot read private submissions or moderate.
