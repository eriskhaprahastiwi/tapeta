import { useEffect, useRef, useState } from "react";
import { requireBackend } from "../lib/supabase";
import { readSession, setCurrentSession } from "../lib/session";

export function ProfileEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (session: NonNullable<ReturnType<typeof readSession>>) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const session = readSession();
  const [name, setName] = useState(session?.name ?? "");
  const [publicProfile, setPublicProfile] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    if (!session) return;
    let active = true;
    void requireBackend().from("profiles").select("public_profile").eq("id", session.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(error.message);
      else { setPublicProfile(data.public_profile); setReady(true); }
    });
    return () => { active = false; };
  }, [session, onSaved]);
  return <dialog ref={dialog} className="t-auth" onCancel={onClose} aria-labelledby="profile-title">
    <form className="t-auth__panel" onSubmit={async (event) => {
      event.preventDefault(); if (!session || busy) return;
      setBusy(true); setMessage("");
      try {
        const { error } = await requireBackend().from("profiles").update({ display_name: name.trim(), public_profile: publicProfile }).eq("id", session.id);
        if (error) throw error;
        const updated = { ...session, name: name.trim() };
        setCurrentSession(updated);
        onSaved(updated);
        setMessage("Profil tersimpan.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Profil belum tersimpan."); }
      finally { setBusy(false); }
    }}>
      <h2 id="profile-title">Kelola profil</h2>
      <label className="t-auth__field">Nama tampilan<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label>
      <fieldset className="t-auth__privacy"><legend>Visibilitas komunitas</legend><label><input type="checkbox" checked={publicProfile} onChange={(event) => setPublicProfile(event.target.checked)} /> Jadikan profil saya publik</label><p>{publicProfile ? "Nama, kunjungan ke destinasi TAPETA, kontribusi, dan badge dapat dilihat komunitas." : "Anda tetap dapat masuk leaderboard sebagai Kontributor anonim, tanpa nama atau daftar kunjungan."}</p></fieldset>
      {message && <p role="status">{message}</p>}
      <button className="t-auth__submit" disabled={!ready || busy}>{busy ? "Menyimpan…" : "Simpan profil"}</button>
      <button type="button" className="t-auth__link" onClick={onClose}>Tutup</button>
    </form>
  </dialog>;
}
