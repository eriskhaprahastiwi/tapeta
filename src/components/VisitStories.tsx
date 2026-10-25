import { useEffect, useRef, useState } from "react";
import { loadVisitStories, moderateVisitStory, placeSourceLabel, targetForPlace, type PersonalPlace, type VisitStory } from "../lib/personal";
import { readSession } from "../lib/session";
import { SavePlaceButton } from "./SavePlaceButton";

export function VisitStories({ scope, cityId = null, onOpenPlace }: { scope: "public" | "admin"; cityId?: string | null; onOpenPlace?: (place: PersonalPlace) => Promise<void> }) {
  const uid = readSession()?.id ?? null;
  const [rows, setRows] = useState<VisitStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState("pending");
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore] = useState(false);
  const status = scope === "admin" && filter !== "all" ? filter : null;
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    let active = true;
    void loadVisitStories(scope, cityId, status).then((next) => { if (active) { setRows(next); setHasMore(next.length === 100); setError(null); } })
      .catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope, cityId, uid, version, status]);
  const retry = () => { setLoading(true); setError(null); setVersion((n) => n + 1); };
  const visible = rows;
  const loadMore = async () => {
    const request = generation.current;
    setMore(true);
    try {
      const next = await loadVisitStories(scope, cityId, status, rows.length);
      if (readSession()?.id !== uid || request !== generation.current) return;
      setRows((current) => [...current, ...next.filter((row) => !current.some((old) => old.id === row.id))]); setHasMore(next.length === 100);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cerita gagal dimuat."); } finally { setMore(false); }
  };
  return <section className="t-visit-stories" aria-label={scope === "admin" ? "Moderasi cerita kunjungan" : "Cerita kunjungan warga"}>
    <h2>{scope === "admin" ? "Cerita kunjungan untuk ditinjau" : "Cerita kunjungan warga"}</h2>
    <p>{scope === "admin" ? "Cerita terkait tempat yang ada. Menerbitkan cerita tidak membuat destinasi baru." : "Pengalaman kunjungan yang telah diperiksa admin. Lokasi OSM tetap ditandai sesuai sumbernya."}</p>
    {scope === "admin" && <label>Status cerita<select value={filter} onChange={(event) => { setRows([]); setLoading(true); setFilter(event.target.value); }}><option value="pending">Menunggu tinjauan</option><option value="needs_revision">Perlu perbaikan</option><option value="published">Terbit</option><option value="rejected">Ditolak</option><option value="all">Semua cerita</option></select></label>}
    {loading && <p role="status">Memuat cerita kunjungan…</p>}{error && <p role="alert">{error} <button type="button" onClick={retry}>Coba lagi</button></p>}
    {!loading && !error && !visible.length && <p>{scope === "admin" ? "Tidak ada cerita pada status ini." : "Belum ada cerita kunjungan yang diterbitkan di kota ini."}</p>}
    <div className="t-visit-stories__list">{!loading && !error && visible.map((story) => scope === "admin" ? <ReviewStory key={story.id} story={story} onSaved={retry} /> : <article className="t-personal__place" key={story.id}>
      <h3>{story.name}</h3><p>{story.city_name} · {placeSourceLabel(story)}</p><p className="t-visit-stories__body">{story.body}</p><p>Oleh {story.author_label}</p>
      <div className="t-personal__actions">{story.publication_status !== "archived" && <SavePlaceButton target={targetForPlace(story)} />}
        {onOpenPlace && <button type="button" onClick={() => { void onOpenPlace(story).catch((cause) => setError(cause.message)); }}>Lihat di peta</button>}
      </div></article>)}</div>
    {hasMore && !loading && <button type="button" disabled={more} onClick={() => void loadMore()}>{more ? "Memuat…" : "Muat cerita berikutnya"}</button>}
  </section>;
}

function ReviewStory({ story, onSaved }: { story: VisitStory; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decide = async (action: string) => {
    if (action !== "published" && note.trim().length < 4) { setError("Tulis alasan minimal 4 karakter."); return; }
    setBusy(true); setError(null);
    try { await moderateVisitStory(story.id, action, note, story.revision); onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Keputusan belum tersimpan."); } finally { setBusy(false); }
  };
  return <article className="t-personal__place"><h3>{story.name}</h3><p>{story.city_name} · {placeSourceLabel(story)}</p><p className="t-visit-stories__body">{story.body}</p><p>Penulis: {story.author_label} · Status: {story.status}</p>
    <p>{story.address} · {story.lat}, {story.lon}</p>
    {story.source_url && /^https?:\/\//i.test(story.source_url) && <a href={story.source_url} target="_blank" rel="noreferrer">Periksa sumber tempat</a>}
    {story.moderator_note && <p>Catatan: {story.moderator_note}</p>}
    {story.status === "pending" && <><label>Catatan keputusan<textarea rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="t-personal__actions">
      <button type="button" disabled={busy} onClick={() => void decide("published")}>Terbitkan cerita</button><button type="button" disabled={busy} onClick={() => void decide("needs_revision")}>Minta perbaikan cerita</button><button type="button" disabled={busy} onClick={() => void decide("rejected")}>Tolak cerita</button>
    </div></>}{error && <p role="alert">{error}</p>}
  </article>;
}
