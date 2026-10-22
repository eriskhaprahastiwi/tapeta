import type { User } from "@supabase/supabase-js";
import { isBackendConfigured, supabase } from "./supabase";

export type UserRole = "contributor" | "moderator" | "admin";
export interface LocalSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  provider: "supabase";
  createdAt: string;
}
export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export const BACKEND_NOT_CONFIGURED = isBackendConfigured
  ? "Akun dan data tersimpan melalui server TAPETA."
  : "Backend belum dihubungkan. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk mengaktifkan akun, notifikasi, kontribusi, dan admin.";

let currentSession: LocalSession | null = null;
export function setCurrentSession(session: LocalSession | null) { currentSession = session; }
export function readSession() { return currentSession; }

export async function appSessionForUser(user: User): Promise<LocalSession> {
  let name = String(user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Kontributor");
  let role: UserRole = "contributor";
  if (supabase) {
    const { data, error } = await supabase.from("profiles").select("display_name, role").eq("id", user.id).single();
    if (error) throw error;
    if (data) {
      name = data.display_name || name;
      if (data.role === "admin" || data.role === "moderator") role = data.role;
    }
  }
  return { id: user.id, name, email: user.email ?? "", role, provider: "supabase", createdAt: user.created_at };
}

export async function readNotifications(userId: string): Promise<LocalNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("notifications").select("id,title,body,created_at,read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []).map((item) => ({ id: item.id, title: item.title, body: item.body, createdAt: item.created_at, read: Boolean(item.read_at) }));
}

export async function markNotificationsRead(userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (error) throw error;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 1) : parts[0][0] + parts.at(-1)![0]).toUpperCase();
}
