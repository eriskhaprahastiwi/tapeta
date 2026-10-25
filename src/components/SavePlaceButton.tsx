import { useState } from "react";
import { matchesTarget, refreshPersonal, savePlace, updatePlace, usePersonalPlaces, type PlaceTarget } from "../lib/personal";
import { useChrome } from "../tapeta/ChromeContext";

export function SavePlaceButton({ target }: { target: PlaceTarget }) {
  const { account } = useChrome();
  const { places, loading, error: loadError } = usePersonalPlaces();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const match = places.find((place) => matchesTarget(place, target));
  const saved = Boolean(match?.saved);
  const toggle = async () => {
    if (!account.signedIn) { account.onOpenAuth(); return; }
    if (loadError) { refreshPersonal(); return; }
    setBusy(true); setError(null);
    try { if (saved && match) await updatePlace(match.id, "unsave"); else await savePlace(target); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Tempat belum tersimpan. Coba lagi."); }
    finally { setBusy(false); }
  };
  return <span className="t-save-place"><button type="button" className="t-save-place__button" aria-pressed={saved} disabled={busy || (account.signedIn && loading)} onClick={() => void toggle()}>
    <svg width="16" height="18" viewBox="0 0 16 18" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 2h10v14l-5-3-5 3V2Z" /></svg>
    {busy ? "Menyimpan…" : loadError ? "Coba muat simpanan" : saved ? "Tersimpan" : "Simpan"}
  </button>{(error || loadError) && <span role="alert">{error || loadError}</span>}</span>;
}
