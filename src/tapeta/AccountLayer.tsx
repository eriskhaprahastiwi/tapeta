import { useCallback, useState } from "react";
import { AccountMenu, AuthDialog, NotificationPanel } from "../components/AccountUI";
import { NoticeDialog } from "../components/NoticeDialog";
import { useAccountSession } from "../lib/useAccountSession";
import { initialsOf, setCurrentSession } from "../lib/session";
import type { LocalSession } from "../lib/session";
import type { NavKey } from "./Topbar";

export interface AccountLayerProps {
  onNavigate: (key: NavKey) => void;
  onOpenMyTapeta: () => void;
  children: (state: AccountLayerState) => React.ReactNode;
}

export interface AccountLayerState {
  signedIn: boolean;
  role: "contributor" | "moderator" | "admin" | null;
  initials: string;
  unreadCount: number;
  accountMenuOpen: boolean;
  notificationOpen: boolean;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
  onOpenNotifications: () => void;
  onSignOut: () => void;
  onSessionUpdated: (session: LocalSession) => void;
}

/**
 * Satu tempat untuk sesi Supabase, menu akun, dan notifikasi.
 */
export function AccountLayer({ onNavigate, onOpenMyTapeta, children }: AccountLayerProps) {
  const { session, notifications, setSession, signOut, markRead, error, recovery, setRecovery, refreshNotifications } = useAccountSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string; hint?: string } | null>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const updateSession = useCallback((next: LocalSession) => {
    setCurrentSession(next);
    setSession(next);
  }, [setSession]);

  const state: AccountLayerState = {
    signedIn: Boolean(session),
    role: session?.role ?? null,
    initials: session ? initialsOf(session.name) : "?",
    unreadCount,
    accountMenuOpen: menuOpen,
    notificationOpen: notifOpen,
    onOpenAuth: () => {
      setMenuOpen(false);
      setNotifOpen(false);
      setAuthOpen(true);
    },
    onSessionUpdated: updateSession,
    onOpenAccount: () => {
      setNotifOpen(false);
      setMenuOpen((open) => !open);
    },
    onOpenNotifications: () => {
      void refreshNotifications();
      setMenuOpen(false);
      setNotifOpen((open) => !open);
    },
    onSignOut: () => {
      void signOut().then(() => onNavigate("explore")).catch((cause) => setNotice({ title: "Keluar belum selesai di server", body: cause.message }));
      setMenuOpen(false);
      setNotifOpen(false);
    },
  };

  return (
    <>
      {children(state)}
      {error && !notifOpen && <div className="t-toast" role="alert">Data akun gagal dimuat: {error}</div>}

      <AuthDialog
        open={authOpen || recovery}
        recovery={recovery}
        onClose={() => { setAuthOpen(false); setRecovery(false); }}
        onSignedIn={(next) => {
          setCurrentSession(next);
          setSession(next);
          setAuthOpen(false);
          setNotice({
            title: "Berhasil masuk",
            body: `Halo ${next.name}, akun TAPETA kamu sudah aktif.`,
          });
        }}
      />

      {session && menuOpen && (
        <div className="t-accountmenu-host">
          <AccountMenu
            session={session}
            onClose={() => setMenuOpen(false)}
            onOpenMyTapeta={() => {
              setMenuOpen(false);
              onOpenMyTapeta();
              onNavigate("my");
            }}
            onOpenNotifications={() => {
              setMenuOpen(false);
              setNotifOpen(true);
            }}
            onOpenAdmin={() => {
              setMenuOpen(false);
              window.location.hash = "#admin-dash";
            }}
            onSignOut={state.onSignOut}
          />
        </div>
      )}

      {notifOpen && (
        <div className="t-notif-host">
          {error && <p role="alert">{error} <button onClick={() => void refreshNotifications()}>Coba lagi</button></p>}
          <NotificationPanel
            open={notifOpen}
            items={notifications}
            onClose={() => setNotifOpen(false)}
            onMarkRead={() => { void markRead().catch((cause) => setNotice({ title: "Notifikasi belum diperbarui", body: cause.message })); }}
          />
        </div>
      )}

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        body={notice?.body ?? ""}
        hint={notice?.hint}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
