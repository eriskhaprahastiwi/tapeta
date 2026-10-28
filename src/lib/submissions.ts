import type { CategoryId } from "../types";
import { requireBackend, supabase } from "./supabase";
import { readSession } from "./session";

export type SubmissionStatus = "menunggu" | "perbaikan" | "terbit" | "ditolak";
export interface Submission {
  id: string; name: string; categoryId: CategoryId; address: string; hours: string; source: string;
  description: string; lat: number; lon: number; regionName: string; submittedBy: string;
  screeningReasons: string[]; pollTotal: number; pollValid: number;
  submittedAt: string; status: SubmissionStatus; storage: "server"; moderatorNote?: string; decidedAt?: string;
}
type DbSubmission = Record<string, unknown>;
const caches = new Map<string, Submission[]>();
let generation = 0;
const cacheKey = (scope: "mine" | "admin") => `${readSession()?.id ?? "anonymous"}:${scope}`;
export function clearSubmissionCache() { generation++; caches.clear(); emit(); }
const fromDbStatus = (value: unknown): SubmissionStatus => ({ pending: "menunggu", needs_revision: "perbaikan", published: "terbit", rejected: "ditolak" }[String(value)] as SubmissionStatus) ?? "menunggu";
function mapRow(row: DbSubmission): Submission {
  return { id: String(row.id), name: String(row.name ?? ""), categoryId: String(row.category_id ?? "lainnya") as CategoryId,
    address: String(row.address ?? ""), hours: String(row.hours ?? ""), source: String(row.source_label ?? row.source_url ?? ""),
    description: String(row.description ?? ""), lat: Number(row.lat ?? 0), lon: Number(row.lon ?? 0),
    regionName: String(row.region_code ?? ""), submittedBy: String(row.display_name ?? "Kontributor"),
    screeningReasons: Array.isArray(row.screening_reasons) ? row.screening_reasons.map(String) : [], pollTotal: Number(row.poll_total ?? 0), pollValid: Number(row.poll_valid ?? 0),
    submittedAt: String(row.created_at ?? ""), status: fromDbStatus(row.status), storage: "server",
    moderatorNote: row.moderator_note ? String(row.moderator_note) : undefined,
    decidedAt: row.decided_at ? String(row.decided_at) : undefined };
}
function emit() { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("tapeta:submissions")); }

export function listSubmissions(scope: "mine" | "admin" = "mine") { return [...(caches.get(cacheKey(scope)) ?? [])].sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)); }
export async function loadSubmissions(scope: "mine" | "admin" = "mine") {
  if (!supabase || !readSession()) return [];
  const key = cacheKey(scope), version = generation;
  const client = requireBackend();
  const { data, error } = await client.rpc(scope === "admin" ? "list_admin_screened_submissions" : "list_my_submissions");
  if (error) throw error;
  if (key !== cacheKey(scope) || version !== generation) return [];
  caches.set(key, ((data ?? []) as DbSubmission[]).map(mapRow));
  emit();
  return listSubmissions(scope);
}
export async function addSubmission(input: {
  name: string; categoryId: CategoryId; address: string; hours: string; source: string;
  description: string; lat: number; lon: number; regionName: string; submittedBy: string;
}, cityId: string) {
  const client = requireBackend();
  const key = cacheKey("mine"), version = generation;
  const { data, error } = await client.rpc("submit_destination", {
    p_city_id: cityId, p_name: input.name, p_category_id: input.categoryId, p_address: input.address,
    p_hours: input.hours || null, p_description: input.description || null, p_lat: input.lat, p_lon: input.lon,
    p_region_code: input.regionName || null, p_source_url: /^https?:\/\//i.test(input.source) ? input.source : null,
    p_source_label: input.source || null,
  });
  if (error) throw error;
  const saved = mapRow(data as DbSubmission);
  if (key === cacheKey("mine") && version === generation) {
    caches.set(key, [saved, ...listSubmissions().filter((item) => item.id !== saved.id)]); emit();
  }
  return saved;
}
export async function decideSubmission(id: string, status: SubmissionStatus, note?: string) {
  const action = ({ menunggu: "pending", perbaikan: "needs_revision", terbit: "published", ditolak: "rejected" } as const)[status];
  const { data, error } = await requireBackend().rpc("moderate_submission", { p_submission_id: id, p_action: action, p_note: note ?? null });
  if (error) throw error;
  await loadSubmissions("admin");
  window.dispatchEvent(new CustomEvent("tapeta:catalog"));
  return data;
}

export const STATUS_LABEL: Record<SubmissionStatus, string> = { menunggu: "Menunggu", perbaikan: "Perlu perbaikan", terbit: "Terbit", ditolak: "Ditolak" };
export function formatSubmitted(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Belum tersedia" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
