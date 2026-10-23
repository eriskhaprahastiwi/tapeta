import { useEffect, useState } from "react";
import { readSession } from "./session";
import { requireBackend } from "./supabase";
import type { CityMeta, OsmLocation } from "../types";

export interface PersonalPlace {
  id: string; place_key: string; destination_id: string | null; osm_type: string | null; osm_id: number | null;
  name: string; address: string; category_id: string | null; city_id: string; city_name: string; province: string;
  relation_id: number; lat: number; lon: number; source_url: string | null; saved: boolean; visited_on: string | null;
  publication_status?: string | null;
  story?: StoryState | null;
}
export interface StoryState { id: string; place_id: string; body: string; status: string; revision: number; moderator_note: string | null }
export const EVENT_LABELS: Record<string, string> = {
  saved: "Menyimpan tempat",
  unsaved: "Menghapus dari wishlist",
  visited: "Menandai sudah dikunjungi",
  visit_date_changed: "Mengubah tanggal kunjungan",
  visit_cancelled: "Membatalkan tanda kunjungan",
  submission_sent: "Mengirim usulan",
  submission_published: "Usulan diterbitkan",
  submission_rejected: "Usulan ditolak",
  submission_needs_revision: "Usulan perlu perbaikan",
  story_submitted: "Mengirim cerita kunjungan",
  story_published: "Cerita diterbitkan",
  story_rejected: "Cerita ditolak",
  story_needs_revision: "Cerita perlu perbaikan",
};

export interface PersonalEvent { id: string; place_id: string | null; place_name: string; kind: string; detail: string | null; created_at: string }
export interface VisitStory extends PersonalPlace, StoryState { author_label: string; created_at: string; updated_at: string }
export type PlaceTarget = { destinationId: string } | { osm: OsmLocation; city: CityMeta };
const requests = new Map<string, Promise<PersonalPlace[]>>();
const requestedAt = new Map<string, number>();
export function clearPersonalCache() { requests.clear(); requestedAt.clear(); }
export function refreshPersonal() {
  clearPersonalCache();
  window.dispatchEvent(new Event("tapeta:personal"));
}
function failure(error: { message: string } | null) { if (error) throw new Error(error.message); }
function loadPlaces(uid: string) {
  if (Date.now() - (requestedAt.get(uid) ?? 0) > 30000) requests.delete(uid);
  if (!requests.has(uid)) {
    const promise = Promise.resolve(requireBackend().rpc("list_personal_places")).then(({ data, error }) => { failure(error); return (data ?? []) as PersonalPlace[]; });
    requests.set(uid, promise);
    requestedAt.set(uid, Date.now());
    void promise.catch(() => { if (requests.get(uid) === promise) requests.delete(uid); });
  }
  return requests.get(uid)!;
}
export function usePersonalPlaces() {
  const uid = readSession()?.id ?? null;
  const [state, setState] = useState<{ uid: string | null; places: PersonalPlace[]; loading: boolean; error: string | null }>({ uid: null, places: [], loading: false, error: null });
  useEffect(() => {
    let active = true, generation = 0;
    const load = () => {
      const version = ++generation;
      if (!uid) return;
      setState((old) => ({ uid, places: old.uid === uid ? old.places : [], loading: true, error: null }));
      void loadPlaces(uid).then((places) => { if (active && version === generation && readSession()?.id === uid) setState({ uid, places, loading: false, error: null }); })
        .catch((error) => { if (active && version === generation) setState({ uid, places: [], loading: false, error: error.message }); });
    };
    load();
    window.addEventListener("tapeta:personal", load);
    return () => { active = false; window.removeEventListener("tapeta:personal", load); };
  }, [uid]);
  return state.uid === uid && uid ? state : { uid, places: [], loading: Boolean(uid), error: null };
}
export function matchesTarget(place: PersonalPlace, target: PlaceTarget) {
  if ("destinationId" in target) return place.destination_id === target.destinationId;
  return `${place.osm_type}:${place.osm_id}` === target.osm.id;
}
export async function savePlace(target: PlaceTarget): Promise<PersonalPlace> {
  const { data, error } = await requireBackend().rpc("save_personal_place", "destinationId" in target ? { p_destination_id: target.destinationId } : {
    p_osm: target.osm, p_city: { id: `osm:relation:${target.city.relationId}`, name: target.city.name, province: target.city.province ?? "", relationId: target.city.relationId },
  });
  failure(error); refreshPersonal(); return data as PersonalPlace;
}
export async function updatePlace(id: string, action: "visit" | "unvisit" | "unsave", date: string | null = null) {
  const { error } = await requireBackend().rpc("update_personal_place", { p_id: id, p_action: action, p_date: date, p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  failure(error); refreshPersonal();
}
export async function loadTimeline(offset = 0): Promise<PersonalEvent[]> {
  const { data, error } = await requireBackend().rpc("personal_timeline", { p_offset: offset }); failure(error); return data ?? [];
}
export async function loadVisitStories(scope: "mine" | "admin" | "public", cityId: string | null = null, status: string | null = null, offset = 0): Promise<VisitStory[]> {
  const { data, error } = await requireBackend().rpc("list_visit_stories", { p_scope: scope, p_city_id: cityId, p_status: status, p_offset: offset }); failure(error); return data ?? [];
}
export async function submitVisitStory(placeId: string, body: string) {
  const { error } = await requireBackend().rpc("submit_visit_story", { p_place_id: placeId, p_body: body }); failure(error); refreshPersonal();
}
export async function moderateVisitStory(id: string, action: string, note: string, revision: number) {
  const { error } = await requireBackend().rpc("moderate_visit_story", { p_id: id, p_action: action, p_note: note || null, p_revision: revision }); failure(error); refreshPersonal();
}
export function targetForPlace(place: PersonalPlace): PlaceTarget {
  if (place.destination_id && place.publication_status === "published") return { destinationId: place.destination_id };
  return { osm: { id: `${place.osm_type}:${place.osm_id}`, name: place.name, address: place.address, lat: place.lat, lon: place.lon, sourceUrl: place.source_url ?? "" }, city: { relationId: Number(place.relation_id), name: place.city_name, province: place.province, type: "city" } };
}
export function placeSourceLabel(place: PersonalPlace) {
  return place.destination_id || place.publication_status === "archived" ? place.publication_status === "published" ? "Terverifikasi TAPETA" : "Tidak lagi diterbitkan" : "Lokasi OSM";
}
