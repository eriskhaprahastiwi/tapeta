import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { appSessionForUser, markNotificationsRead, readNotifications, readSession, setCurrentSession, type LocalNotification, type LocalSession } from "./session";
import { clearSubmissionCache } from "./submissions";
import { supabase } from "./supabase";

export function useAccountSession() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [ready, setReady] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const version = useRef(0);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const apply = async (authSession: Session | null) => {
      const request = ++version.current;
      setCurrentSession(null); setSession(null); setNotifications([]); clearSubmissionCache(); setReady(false); setError(null);
      try {
        const next = authSession ? await appSessionForUser(authSession.user) : null;
        if (!active || request !== version.current) return;
        setCurrentSession(next); setSession(next);
        const items = next ? await readNotifications(next.id) : [];
        if (active && request === version.current) setNotifications(items);
      } catch (cause) {
        if (active && request === version.current) setError(cause instanceof Error ? cause.message : "Data akun gagal dimuat. Coba lagi.");
      } finally { if (active && request === version.current) setReady(true); }
    };
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) { setError(error.message); setReady(true); }
      else void apply(data.session);
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : "Sesi akun gagal dimuat."); setReady(true); } });
    const { data: listener } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      window.setTimeout(() => { if (active) void apply(authSession); }, 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  return {
    session, notifications, setSession, setNotifications, ready, error, recovery, setRecovery,
    async refreshNotifications() {
      if (!session) return;
      const request = version.current;
      try { const items = await readNotifications(session.id); if (request === version.current) { setNotifications(items); setError(null); } }
      catch (cause) { if (request === version.current) setError(cause instanceof Error ? cause.message : "Notifikasi gagal dimuat."); }
    },
    async signOut() {
      version.current++; setCurrentSession(null); setSession(null); setNotifications([]); clearSubmissionCache();
      if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; }
    },
    async markRead() {
      if (!session) return;
      const request = version.current, userId = session.id;
      await markNotificationsRead(userId);
      if (request === version.current && readSession()?.id === userId) setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    },
  };
}
