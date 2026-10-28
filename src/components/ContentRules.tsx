import { useEffect, useState } from "react";
import { supabase, requireBackend } from "../lib/supabase";
interface Rule {
  id: number;
  pattern: string;
  reason: string;
  action: string;
  active: boolean;
}
export function ContentRules() {
  const [rules, setRules] = useState<Rule[]>([]),
    [term, setTerm] = useState(""),
    [reason, setReason] = useState(""),
    [action, setAction] = useState("review"),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!supabase) return;
    void supabase
      .from("content_rules")
      .select("*")
      .order("id")
      .then(({ data, error }) => {
        if (active) {
          if (error) setError(error.message);
          else setRules(data ?? []);
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function toggle(rule: Rule) {
    setBusy(true);
    setError("");
    try {
      const { error } = await requireBackend()
        .from("content_rules")
        .update({ active: !rule.active })
        .eq("id", rule.id);
      if (error) throw error;
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aturan belum diperbarui.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="t-forum__rules">
      <summary>Aturan penyaringan otomatis</summary>
      <p>
        Frasa larangan diperiksa di server. Gunakan pemeriksaan manual untuk
        kata yang bergantung konteks.
      </p>
      {rules.map((rule) => (
        <p key={rule.id}>
          <strong>{rule.reason}</strong> ·{" "}
          {rule.action === "block" ? "Blokir" : "Periksa konteks"} ·{" "}
          {rule.active ? "Aktif" : "Nonaktif"}{" "}
          <button disabled={busy} onClick={() => void toggle(rule)}>
            {rule.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </p>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const pattern = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (pattern.length < 3)
              throw new Error("Frasa minimal 3 karakter.");
            const { error } = await requireBackend()
              .from("content_rules")
              .insert({ pattern, reason: reason.trim(), action });
            if (error) throw error;
            setTerm("");
            setReason("");
            setReload((n) => n + 1);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Aturan belum tersimpan.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Frasa yang diperiksa
          <input
            required
            minLength={3}
            maxLength={100}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </label>
        <label>
          Alasan
          <input
            required
            minLength={4}
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label>
          Tindakan
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="review">Tandai untuk pemeriksaan konteks</option>
            <option value="block">Blokir pengiriman</option>
          </select>
        </label>
        <button disabled={busy}>Tambah aturan</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
