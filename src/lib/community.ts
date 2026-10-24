import type { SupabaseClient } from "@supabase/supabase-js";

export interface CommunityBadge {
  key: "perintis" | "penjelajah" | "pemandu" | "pelopor";
  label: "Perintis" | "Penjelajah" | "Pemandu" | "Pelopor";
}
export interface CommunityVisitLeaderboardEntry {
  profileKey: string | null; displayLabel: string; publicProfile: boolean; visitedCount: number; latestVisitedAt: string | null; badge: CommunityBadge | null;
}

export interface CommunityContributor {
  profileKey: string | null;
  displayLabel: string;
  publicProfile: boolean;
  publishedCount: number;
  latestPublishedAt: string | null;
  badge: CommunityBadge | null;
}

export interface CommunityStory {
  destinationId: string;
  placeName: string;
  description: string | null;
  categoryId: string;
  address: string;
  regionCode: string | null;
  regionName: string;
  cityId: string;
  cityName: string;
  authorLabel: string;
  profileKey: string | null;
  publicProfile: boolean;
  reviewedAt: string | null;
  publishedAt: string | null;
  visitedOn?: string | null;
  stickerPath: string | null;
  stickerAlt: string | null;
}

export interface CommunityProfile {
  profileKey: string;
  displayName: string;
  publishedCount: number;
  latestPublishedAt: string | null;
  visitedCount: number;
  visitedPlaces: CommunityStory[];
  contributions: CommunityStory[];
}

type RpcClient = Pick<SupabaseClient, "rpc">;
type DbRow = Record<string, unknown>;

export function badgeForVisitedCount(count: number): CommunityBadge | null {
  if (count < 1) return null;
  if (count <= 4) return { key: "perintis", label: "Perintis" };
  if (count <= 9) return { key: "penjelajah", label: "Penjelajah" };
  if (count <= 14) return { key: "pemandu", label: "Pemandu" };
  return { key: "pelopor", label: "Pelopor" };
}

export const badgeForPublishedCount = badgeForVisitedCount;

export function communityStoryText(description: string | null): string {
  return description?.trim() || "Cerita belum ditambahkan.";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function mapCommunityContributorRow(row: DbRow): CommunityContributor {
  const publishedCount = Number(row.published_count ?? 0);
  const publicProfile = row.public_profile === true;
  return {
    profileKey: publicProfile ? nullableString(row.profile_key) : null,
    displayLabel: publicProfile ? String(row.display_label ?? "Kontributor") : "Kontributor",
    publicProfile,
    publishedCount,
    latestPublishedAt: nullableString(row.latest_published_at),
    badge: null,
  };
}
export function mapCommunityVisitLeaderboardRow(row: DbRow): CommunityVisitLeaderboardEntry {
  const visitedCount = Number(row.visited_count ?? 0); const publicProfile = row.public_profile === true;
  return { profileKey: publicProfile ? nullableString(row.profile_key) : null, displayLabel: publicProfile ? String(row.display_label ?? "Kontributor") : "Kontributor", publicProfile, visitedCount, latestVisitedAt: nullableString(row.latest_visited_at), badge: badgeForVisitedCount(visitedCount) };
}

export function mapCommunityStoryRow(row: DbRow): CommunityStory {
  return {
    destinationId: String(row.destination_id ?? ""),
    placeName: String(row.place_name ?? ""),
    description: nullableString(row.description),
    categoryId: String(row.category_id ?? "lainnya"),
    address: String(row.address ?? ""),
    regionCode: nullableString(row.region_code),
    regionName: String(row.region_name ?? row.region_code ?? ""),
    cityId: String(row.city_id ?? ""),
    cityName: String(row.city_name ?? row.city_id ?? ""),
    authorLabel: row.public_profile === true ? String(row.author_label ?? "Kontributor") : "Kontributor",
    profileKey: row.public_profile === true ? nullableString(row.profile_key) : null,
    publicProfile: row.public_profile === true,
    reviewedAt: nullableString(row.reviewed_at),
    publishedAt: nullableString(row.published_at),
    visitedOn: nullableString(row.visited_on),
    stickerPath: nullableString(row.sticker_path),
    stickerAlt: nullableString(row.sticker_alt),
  };
}

export async function loadCommunityLeaderboard(client: RpcClient): Promise<CommunityContributor[]> {
  const { data, error } = await client.rpc("community_leaderboard");
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapCommunityContributorRow);
}

export async function loadCommunityStories(client: RpcClient, cityId: string): Promise<CommunityStory[]> {
  const { data, error } = await client.rpc("community_stories", { p_city_id: cityId });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapCommunityStoryRow);
}
export async function loadCommunityVisitLeaderboard(client: RpcClient, cityId: string | null): Promise<CommunityVisitLeaderboardEntry[]> {
  const { data, error } = await client.rpc("community_visit_leaderboard", { p_city_id: cityId }); if (error) throw error; return ((data ?? []) as DbRow[]).map(mapCommunityVisitLeaderboardRow);
}

export async function loadCommunityProfile(client: RpcClient, profileKey: string): Promise<CommunityProfile | null> {
  const { data, error } = await client.rpc("community_contributor_profile", { p_profile_key: profileKey });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as DbRow;
  if (row.public_profile !== true) return null;
  const contributions = Array.isArray(row.contributions)
    ? (row.contributions as DbRow[]).map(mapCommunityStoryRow)
    : [];
  const visitedPlaces = Array.isArray(row.visited_places) ? (row.visited_places as DbRow[]).map(mapCommunityStoryRow) : [];
  return {
    profileKey: String(row.profile_key ?? profileKey),
    displayName: String(row.display_name ?? "Kontributor"),
    publishedCount: Number(row.published_count ?? contributions.length),
    latestPublishedAt: nullableString(row.latest_published_at),
    visitedCount: Number(row.visited_count ?? visitedPlaces.length),
    visitedPlaces,
    contributions,
  };
}
