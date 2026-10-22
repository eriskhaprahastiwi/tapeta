import { useEffect, useRef, useState } from "react";
import {
  BACKEND_NOT_CONFIGURED,
  initialsOf,
  type LocalNotification,
  type LocalSession,
} from "../lib/session";
import { appSessionForUser } from "../lib/session";
import { isBackendConfigured, supabase } from "../lib/supabase";

export interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSignedIn: (session: LocalSession) => void;
  recovery?: boolean;
}

/**
 * Formulir masuk/daftar yang menggunakan Supabase Auth saat backend dikonfigurasi.
 */
export function AuthDialog({ open, onClose, onSignedIn, recovery = false }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!isBackendConfigured || !supabase) {
      setError(BACKEND_NOT_CONFIGURED);
      return;
    }
    if (mode === "register" && trimmedName.length < 2) {
      setError("Tulis nama tampilan minimal 2 huruf.");
      return;
    }
    if (!recovery && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Alamat email belum valid.");
      return;
    }
    if ((recovery || mode !== "reset") && password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword(""); setSuccess("Kata sandi diperbarui. Kamu dapat menutup formulir ini."); return;
      }
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: window.location.origin + window.location.pathname });
        if (error) throw error;
        setSuccess("Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk."); return;
      }
      const result = mode === "register"
        ? await supabase.auth.signUp({ email: trimmedEmail, password, options: { emailRedirectTo: window.location.origin + window.location.pathname, data: { display_name: trimmedName } } })
        : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (result.error) throw result.error;
      if (!result.data.user) throw new Error("Akun berhasil diproses, tetapi sesi belum tersedia.");
      if (!result.data.session && mode === "register") {
        setSuccess("Pendaftaran diterima. Periksa email untuk verifikasi, lalu masuk.");
        return;
      }
      onSignedIn(await appSessionForUser(result.data.user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tidak dapat menghubungkan akun.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="t-auth"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="t-auth-title"
    >
      <form className="t-auth__panel" onSubmit={submit}>
        <span className="t-auth__kicker">AKUN TAPETA</span>
        <h2 id="t-auth-title" className="t-auth__title">
          {recovery ? "Kata sandi baru" : mode === "reset" ? "Pulihkan kata sandi" : mode === "login" ? "Masuk ke TAPETA" : "Buat akun TAPETA"}
        </h2>
        <p className="t-auth__note">
          {BACKEND_NOT_CONFIGURED}
        </p>
        {mode === "register" && <label className="t-auth__field"><span>Nama tampilan</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama kamu" autoComplete="name" disabled={!isBackendConfigured} /></label>}
        {!recovery && <label className="t-auth__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            autoComplete="email"
            disabled={!isBackendConfigured}
          />
        </label>}
        {(recovery || mode !== "reset") && <label className="t-auth__field"><span>Kata sandi</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" && !recovery ? "current-password" : "new-password"} minLength={8} disabled={!isBackendConfigured} /></label>}
        {success && <p role="status">{success}</p>}
        {error && (
          <p className="t-auth__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="t-auth__submit" disabled={busy || !isBackendConfigured}>
          {busy ? "Memproses…" : recovery ? "Simpan kata sandi" : mode === "reset" ? "Kirim tautan pemulihan" : mode === "login" ? "Masuk" : "Daftar"}
        </button>
        <div className="t-auth__foot">
          {!recovery && <button type="button" className="t-auth__link" onClick={() => { setMode("reset"); setError(null); setSuccess(null); }}>Lupa kata sandi?</button>}
          {!recovery && mode !== "reset" && <button type="button" className="t-auth__link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>}
          <button type="button" className="t-auth__link" onClick={onClose}>
            Batal
          </button>
        </div>
      </form>
    </dialog>
  );
}

export interface AccountMenuProps {
  session: LocalSession;
  onClose: () => void;
  onOpenMyTapeta: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onSignOut: () => void;
}

export function AccountMenu({
  session,
  onClose,
  onOpenMyTapeta,
  onOpenNotifications,
  onOpenAdmin,
  onSignOut,
}: AccountMenuProps) {
  return (
    <div className="t-accountmenu" role="menu" aria-label="Menu akun">
      <div className="t-accountmenu__head">
        <span className="t-accountmenu__avatar" aria-hidden="true">
          {initialsOf(session.name)}
        </span>
        <span className="t-accountmenu__id">
          <span className="t-accountmenu__name">{session.name}</span>
          <span className="t-accountmenu__mail">{session.email}</span>
        </span>
      </div>
      <p className="t-accountmenu__badge">Akun TAPETA · {session.role}</p>
      <button type="button" role="menuitem" className="t-accountmenu__item" onClick={onOpenMyTapeta}>
        My TAPETA
      </button>
      <button type="button" role="menuitem" className="t-accountmenu__item" onClick={onOpenNotifications}>
        Notifikasi
      </button>
      {(session.role === "admin" || session.role === "moderator") && <button type="button" role="menuitem" className="t-accountmenu__item" onClick={onOpenAdmin}>Dashboard admin</button>}
      <button type="button" role="menuitem" className="t-accountmenu__item" onClick={onSignOut}>
        Keluar
      </button>
      <button type="button" className="t-accountmenu__close" onClick={onClose}>
        Tutup
      </button>
    </div>
  );
}

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  items: LocalNotification[];
  onMarkRead: () => void;
}

export function NotificationPanel({ open, onClose, items, onMarkRead }: NotificationPanelProps) {
  if (!open) return null;
  return (
    <div className="t-notif" role="dialog" aria-label="Notifikasi">
      <div className="t-notif__head">
        <span className="t-notif__title">Notifikasi</span>
        <button type="button" className="t-notif__close" onClick={onClose} aria-label="Tutup notifikasi">
          ×
        </button>
      </div>
      {items.length === 0 ? (
        <p className="t-notif__empty">Belum ada notifikasi.</p>
      ) : (
        <ul className="t-notif__list">
          {items.map((item) => (
            <li key={item.id} className={`t-notif__item${item.read ? "" : " is-unread"}`}>
              <span className="t-notif__itemtitle">{item.title}</span>
              <span className="t-notif__itemBody">{item.body}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="t-notif__foot">
        <button type="button" className="t-notif__link" onClick={onMarkRead}>
          Tandai sudah dibaca
        </button>
        <span className="t-notif__note">{BACKEND_NOT_CONFIGURED}</span>
      </div>
    </div>
  );
}
