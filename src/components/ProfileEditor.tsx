import { useEffect, useRef, useState } from "react";
import { requireBackend } from "../lib/supabase";
import { readSession, setCurrentSession } from "../lib/session";

type PublicProfile = { public_profile: boolean; display_name: string };

export function ProfileEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (session: NonNullable<ReturnType<typeof readSession>>) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const session = readSession();
  const [name, setName] = useState(session?.name ?? "");
  const [publicProfile, setPublicProfile] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.resolve(requireBackend().from("profiles").select("display_name, public_profile").eq("id", session.id).single())
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        const profile = data as PublicProfile;
        setName(profile.display_name || session.name);
        setPublicProfile(profile.public_profile);
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : "Profil gagal dimuat.");
      });
    return () => { active = false; };
  }, [session, retry]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || profileBusy || !ready) return;
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const { error } = await requireBackend().from("profiles").update({ display_name: name.trim(), public_profile: publicProfile }).eq("id", session.id);
      if (error) throw error;
      const updated = { ...session, name: name.trim() };
      setCurrentSession(updated);
      onSaved(updated);
      setProfileMessage("Profil tersimpan.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Profil belum tersimpan.");
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || passwordBusy) return;
    if (password.length < 8) {
      setPasswordError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (password !== passwordConfirmation) {
      setPasswordError("Kata sandi baru belum sama dengan konfirmasinya.");
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      const { error } = await requireBackend().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPasswordConfirmation("");
      setPasswordMessage("Kata sandi berhasil diperbarui.");
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Kata sandi belum diperbarui.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <dialog ref={dialog} className="t-auth t-profile-editor" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="profile-title">
      <div className="t-auth__panel t-profile-editor__panel">
        <h2 id="profile-title" className="t-auth__title">Edit profil</h2>
        <section className="t-profile-editor__section" aria-labelledby="profile-details-title">
          <div className="t-profile-editor__sectionhead">
            <h3 id="profile-details-title">Informasi profil</h3>
            <p>Nama dan privasi yang terlihat oleh komunitas TAPETA.</p>
          </div>
          {loadError ? <p className="t-profile-editor__error" role="alert">Profil gagal dimuat: {loadError} <button type="button" className="t-auth__link" onClick={() => { setReady(false); setLoadError(""); setRetry((value) => value + 1); }}>Coba lagi</button></p> : (
            <form onSubmit={saveProfile}>
              <label className="t-auth__field"><span>Nama tampilan</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required disabled={!ready || profileBusy} /></label>
              <fieldset className="t-profile-editor__visibility" disabled={!ready || profileBusy}>
                <legend>Privasi profil</legend>
                <label><input type="radio" name="profile-visibility" value="public" checked={publicProfile} onChange={() => setPublicProfile(true)} /> Publik</label>
                <label><input type="radio" name="profile-visibility" value="private" checked={!publicProfile} onChange={() => setPublicProfile(false)} /> Privat</label>
                <p>{publicProfile ? "Nama, kunjungan, kontribusi, dan lencana terlihat oleh komunitas." : "Kamu tampil sebagai Kontributor anonim, tanpa nama atau daftar kunjungan."}</p>
              </fieldset>
              {profileError && <p className="t-profile-editor__error" role="alert">{profileError}</p>}
              {profileMessage && <p className="t-profile-editor__success" role="status">{profileMessage}</p>}
              <button className="t-auth__submit" disabled={!ready || profileBusy}>{profileBusy ? "Menyimpan…" : "Simpan profil"}</button>
            </form>
          )}
        </section>

        <section className="t-profile-editor__section" aria-labelledby="profile-password-title">
          <div className="t-profile-editor__sectionhead">
            <h3 id="profile-password-title">Ganti kata sandi</h3>
            <p>Gunakan kata sandi baru minimal 8 karakter.</p>
          </div>
          <form onSubmit={changePassword}>
            <label className="t-auth__field"><span>Kata sandi baru</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required disabled={passwordBusy} /></label>
            <label className="t-auth__field"><span>Ulangi kata sandi baru</span><input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required disabled={passwordBusy} /></label>
            {passwordError && <p className="t-profile-editor__error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="t-profile-editor__success" role="status">{passwordMessage}</p>}
            <button className="t-auth__submit" disabled={passwordBusy}>{passwordBusy ? "Memperbarui…" : "Simpan kata sandi"}</button>
          </form>
        </section>
        <button type="button" className="t-auth__link t-profile-editor__close" onClick={onClose}>Tutup</button>
      </div>
    </dialog>
  );
}
