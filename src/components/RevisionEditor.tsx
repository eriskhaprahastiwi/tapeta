import { useEffect, useRef, useState } from "react";
import { requireBackend } from "../lib/supabase";
import { loadSubmissions, type Submission } from "../lib/submissions";

export function RevisionEditor({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(submission.name);
  const [address, setAddress] = useState(submission.address);
  const [description, setDescription] = useState(submission.description);
  const [source, setSource] = useState(submission.source);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog className="t-auth" ref={dialog} onCancel={onClose} aria-labelledby="revision-title">
    <form className="t-auth__panel" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        const { error } = await requireBackend().rpc("revise_submission", { p_id: submission.id, p_name: name, p_address: address, p_description: description, p_source: source });
        if (error) throw error;
        await loadSubmissions("mine"); onClose();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Revisi belum tersimpan."); }
      finally { setBusy(false); }
    }}>
      <h2 id="revision-title">Perbaiki usulan</h2>
      <p>Catatan moderator: {submission.moderatorNote}</p>
      <label className="t-auth__field">Nama<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={160} required /></label>
      <label className="t-auth__field">Alamat<input value={address} onChange={(e) => setAddress(e.target.value)} minLength={4} maxLength={1000} required /></label>
      <label className="t-auth__field">Sumber<input value={source} onChange={(e) => setSource(e.target.value)} minLength={4} maxLength={2000} required /></label>
      <label className="t-auth__field">Deskripsi<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} /></label>
      {error && <p role="alert">{error}</p>}
      <button className="t-auth__submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim revisi untuk ditinjau"}</button>
      <button type="button" className="t-auth__link" onClick={onClose}>Batal</button>
    </form>
  </dialog>;
}
