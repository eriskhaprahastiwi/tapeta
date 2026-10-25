import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(
  envText.split("\n").flatMap((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    return match ? [[match[1], match[2].replace(/^["']|["']$/g, "")]] : [];
  }),
);

assert.ok(env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL is required");
assert.ok(env.VITE_SUPABASE_ANON_KEY, "VITE_SUPABASE_ANON_KEY is required");

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const cityId = "osm:relation:16563796";

const { data: contributors, error: leaderboardError } = await client.rpc("community_leaderboard");
assert.ifError(leaderboardError);
assert.ok(Array.isArray(contributors), "leaderboard returns rows");
for (const contributor of contributors) {
  assert.equal(typeof contributor.public_profile, "boolean");
  assert.equal(typeof contributor.display_label, "string");
  assert.equal(typeof contributor.published_count, "number");
  assert.ok("profile_key" in contributor);
  assert.ok(!("email" in contributor), "leaderboard does not return emails");
  assert.ok(!("moderator_note" in contributor), "leaderboard does not return moderator notes");
  if (!contributor.public_profile) {
    assert.equal(contributor.display_label, "Kontributor");
    assert.equal(contributor.profile_key, null, "private profile cannot be opened publicly");
  } else {
    assert.ok(typeof contributor.profile_key === "string" && contributor.profile_key.length > 0);
  }
}

const { data: stories, error: storiesError } = await client.rpc("community_stories", { p_city_id: cityId });
assert.ifError(storiesError);
assert.ok(Array.isArray(stories), "city story stream returns rows");
for (const story of stories) {
  assert.equal(story.city_id, cityId);
  assert.equal(story.publication_status, "published");
  assert.equal(story.submission_status, "published");
  assert.ok(typeof story.destination_id === "string");
  assert.ok(typeof story.place_name === "string");
  assert.ok(typeof story.author_label === "string");
  assert.ok(!("email" in story), "stories do not return emails");
  assert.ok(!("moderator_note" in story), "stories do not return moderator notes");
}

for (const scope of [cityId, null]) {
  const { data: visitLeaders, error } = await client.rpc("community_visit_leaderboard", { p_city_id: scope });
  assert.ifError(error);
  assert.ok(Array.isArray(visitLeaders), "visit leaderboard returns rows for local and national scopes");
  for (const contributor of visitLeaders) {
    assert.equal(typeof contributor.visited_count, "number");
    assert.equal(typeof contributor.public_profile, "boolean");
    assert.ok(!("email" in contributor));
    assert.ok(!("moderator_note" in contributor));
    if (!contributor.public_profile) {
      assert.equal(contributor.display_label, "Kontributor");
      assert.equal(contributor.profile_key, null);
    }
  }
}

const publicContributor = contributors.find((row) => row.public_profile && row.profile_key);
if (publicContributor) {
  const { data: profile, error } = await client.rpc("community_contributor_profile", {
    p_profile_key: publicContributor.profile_key,
  });
  assert.ifError(error);
  assert.equal(profile?.public_profile, true);
  assert.equal(profile?.display_label, publicContributor.display_label);
  assert.ok(Array.isArray(profile?.contributions));
  assert.equal(typeof profile?.visited_count, "number");
  assert.ok(Array.isArray(profile?.visited_places));
  for (const contribution of profile.contributions) {
    assert.equal(contribution.submission_status, "published");
    assert.equal(contribution.publication_status, "published");
    assert.ok(!("moderator_note" in contribution));
    assert.ok(!("email" in contribution));
  }
}

const { data: privateProfile, error: privateError } = await client.rpc("community_contributor_profile", {
  p_profile_key: "not-a-public-profile-key",
});
assert.ifError(privateError);
assert.equal(privateProfile, null, "unknown/private profile keys do not expose a profile");

if (env.SUPABASE_IMPORT_EMAIL && env.SUPABASE_IMPORT_PASSWORD) {
  const authenticated = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: signInError } = await authenticated.auth.signInWithPassword({
    email: env.SUPABASE_IMPORT_EMAIL,
    password: env.SUPABASE_IMPORT_PASSWORD,
  });
  assert.ifError(signInError);
  const { data: signedInLeaderboard, error: signedInLeaderboardError } = await authenticated.rpc("community_leaderboard");
  assert.ifError(signedInLeaderboardError);
  assert.ok(Array.isArray(signedInLeaderboard), "signed-in contributor can read leaderboard");
  const { data: signedInStories, error: signedInStoriesError } = await authenticated.rpc("community_stories", { p_city_id: cityId });
  assert.ifError(signedInStoriesError);
  assert.ok(Array.isArray(signedInStories), "signed-in contributor can read city stories");
}

if (!process.argv.includes("--rpc-only")) {
  const { badgeForVisitedCount, communityStoryText, mapCommunityContributorRow, mapCommunityStoryRow, mapCommunityVisitLeaderboardRow } = await import("../src/lib/community.ts");
  assert.equal(badgeForVisitedCount(0), null);
  assert.equal(badgeForVisitedCount(1)?.label, "Perintis");
  assert.equal(badgeForVisitedCount(4)?.label, "Perintis");
  assert.equal(badgeForVisitedCount(5)?.label, "Penjelajah");
  assert.equal(badgeForVisitedCount(9)?.label, "Penjelajah");
  assert.equal(badgeForVisitedCount(10)?.label, "Pemandu");
  assert.equal(badgeForVisitedCount(14)?.label, "Pemandu");
  assert.equal(badgeForVisitedCount(15)?.label, "Pelopor");
  assert.equal(communityStoryText(null), "Cerita belum ditambahkan.");
  assert.equal(communityStoryText("  Catatan warga  "), "Catatan warga");
  assert.deepEqual(
    mapCommunityContributorRow({ public_profile: false, display_label: "Private Name", profile_key: "secret", published_count: "12" }),
    {
      profileKey: null,
      displayLabel: "Kontributor",
      publicProfile: false,
      publishedCount: 12,
      latestPublishedAt: null,
      badge: null,
    },
  );
  assert.equal(
    mapCommunityContributorRow({ public_profile: true, display_label: "Rani", profile_key: "public-key", published_count: 1 }).displayLabel,
    "Rani",
  );
  const privateStory = mapCommunityStoryRow({
    public_profile: false,
    author_label: "Private Name",
    profile_key: "secret",
    destination_id: "dest-1",
    place_name: "Pasar Bawah",
    city_id: "osm:relation:16563796",
    city_name: "Pekanbaru",
    submission_status: "published",
    publication_status: "published",
    sticker_path: "/assets/stickers/pasar-bawah.png",
  });
  assert.equal(privateStory.authorLabel, "Kontributor");
  assert.equal(privateStory.profileKey, null);
  assert.equal(privateStory.destinationId, "dest-1");
  assert.equal(privateStory.stickerPath, "/assets/stickers/pasar-bawah.png");
  assert.equal(mapCommunityVisitLeaderboardRow({ public_profile: false, display_label: "Nama Rahasia", profile_key: "secret", visited_count: 15 }).displayLabel, "Kontributor");
  assert.equal(mapCommunityVisitLeaderboardRow({ public_profile: false, display_label: "Nama Rahasia", profile_key: "secret", visited_count: 15 }).profileKey, null);
  assert.equal(mapCommunityVisitLeaderboardRow({ public_profile: true, display_label: "Rani", profile_key: "public-key", visited_count: 15 }).badge?.label, "Pelopor");
}

console.log(`Community RPC contract passed: ${contributors.length} contributors, ${stories.length} city stories.`);
