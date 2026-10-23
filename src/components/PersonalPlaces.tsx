import { useEffect, useRef, useState } from "react";
import { readSession } from "../lib/session";
import { EVENT_LABELS, loadTimeline, placeSourceLabel, refreshPersonal, submitVisitStory, updatePlace, usePersonalPlaces, type PersonalEvent, type PersonalPlace, type StoryState } from "../lib/personal";
import { ClockIcon } from "./Icons";
import { VisitedArt, WishlistArt } from "./MyTapetaArt";

export type PersonalSection = "wishlist" | "visited" | "timeline";
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));

export function PersonalPlaces({
  section,
  onOpenPlace,
  onOpenAuth,
  onOpenWishlist,
}: {
  section: PersonalSection;
  onOpenPlace: (place: PersonalPlace) => Promise<void>;
  onOpenAuth: () => void;
  onOpenWishlist?: () => void;
}) {
  const uid = readSession()?.id ?? null;
  const { places, loading, error } = usePersonalPlaces();
  const [city, setCity] = useState("");
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [extraLoading, setExtraLoading] = useState(Boolean(uid));
  const [extraError, setExtraError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [more, setMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [storyPlace, setStoryPlace] = useState<PersonalPlace | null>(null);
  useEffect(() => {
    if (!uid) return;
    let active = true, generation = 0;
    const load = () => {
      const version = ++generation;
      setExtraLoading(true); setExtraError(null);
      void loadTimeline().then((nextEvents) => {
        if (!active || version !== generation || readSession()?.id !== uid) return;
        setEvents(nextEvents); setHasMore(nextEvents.length === 50);
      }).catch((cause) => { if (active && version === generation) setExtraError(cause.message); })
        .finally(() => { if (active && version === generation) setExtraLoading(false); });
    };
    load(); window.addEventListener("tapeta:personal", load);
    return () => { active = false; window.removeEventListener("tapeta:personal", load); };
  }, [uid, retry]);
  const loadMore = async () => {
    setMore(true); setExtraError(null);
    try {
      const rows = await loadTimeline(events.length);
      if (readSession()?.id === uid) { setEvents((current) => [...current, ...rows.filter((row) => !current.some((old) => old.id === row.id))]); setHasMore(rows.length === 50); }
    } catch (cause) { setExtraError(cause instanceof Error ? cause.message : "Riwayat gagal dimuat."); }
    finally { setMore(false); }
  };
  const title = section === "wishlist" ? "Ingin dikunjungi" : section === "visited" ? "Sudah dikunjungi" : "Linimasa pribadi";
  const all = places.filter((place) => section === "visited" ? place.visited_on : place.saved && !place.visited_on);
  const cities = [...new Map(all.map((place) => [place.city_id, place.city_name])).entries()];
  const visible = all.filter((place) => !city || place.city_id === city);
  if (!uid) {
    return (
      <section className="t-personal" aria-label={title}>
        <div className="t-personal__empty">
          {section === "wishlist" ? (
            <span className="t-personal__emptyart" aria-hidden="true"><WishlistArt /></span>
          ) : section === "visited" ? (
            <span className="t-personal__emptyart" aria-hidden="true"><VisitedArt /></span>
          ) : (
            <span className="t-personal__emptymark" aria-hidden="true"><ClockIcon size={22} /></span>
          )}
          <strong>Masuk untuk melihat {section === "wishlist" ? "wishlist" : section === "visited" ? "kunjungan" : "linimasa"}</strong>
          <p>Masuk untuk menyimpan tempat dan melihat riwayat pribadimu.</p>
          <button type="button" className="t-personal__cta" onClick={onOpenAuth}>Masuk ke TAPETA</button>
        </div>
      </section>
    );
  }
  return (
    <section className="t-personal" aria-label={title}>
      {(error || extraError) && (
        <p className="t-personal__alert" role="alert">
          {error || extraError}{" "}
          <button type="button" onClick={() => { refreshPersonal(); setRetry((n) => n + 1); }}>Coba lagi</button>
        </p>
      )}
      {(loading || extraLoading) && <p className="t-personal__note" role="status">Memuat tempat dan riwayat pribadi…</p>}
      {section === "timeline" ? (
        <>
          {!extraLoading && !events.length && !extraError && (
            <div className="t-personal__empty">
              <span className="t-personal__emptymark" aria-hidden="true"><ClockIcon size={22} /></span>
              <strong>Linimasa masih kosong</strong>
              <p>Belum ada aktivitas. Simpan tempat dari Explore, pencarian OSM, atau Komunitas untuk mulai merencanakan kunjungan.</p>
              <a className="t-personal__cta" href="#explore">Jelajahi tempat</a>
            </div>
          )}
          <ol className="t-personal__timeline">
            {events.map((event, index) => {
              const day = dateLabel(event.created_at), previousDay = index ? dateLabel(events[index - 1].created_at) : null;
              return (
                <li key={event.id}>
                  {day !== previousDay && <h3>{day}</h3>}
                  <p><strong>{EVENT_LABELS[event.kind] ?? "Aktivitas tempat"}</strong> · {event.place_name}</p>
                  {event.detail && <p>{/^\d{4}-\d{2}-\d{2}$/.test(event.detail) ? `Tanggal kunjungan: ${dateLabel(event.detail)}` : event.detail}</p>}
                  <small>Dicatat {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</small>
                </li>
              );
            })}
          </ol>
          {hasMore && <button type="button" className="t-personal__more" disabled={more} onClick={() => void loadMore()}>{more ? "Memuat…" : "Muat riwayat berikutnya"}</button>}
        </>
      ) : (
        <>
          <div className="t-personal__toolbar">
            <div className="t-personal__filter">
              <label htmlFor="personal-city-filter">Kota</label>
              <select id="personal-city-filter" value={city} onChange={(event) => setCity(event.target.value)}>
                <option value="">Semua kota</option>
                {cities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <span className="t-personal__count">{visible.length} tempat</span>
          </div>
          {!loading && !visible.length && !error && (
            <div className="t-personal__empty">
              <span className="t-personal__emptyart" aria-hidden="true">
                {section === "visited" ? <VisitedArt /> : <WishlistArt />}
              </span>
              <strong>
                {city ? "Tidak ada tempat di kota ini" : section === "visited" ? "Belum ada kunjungan yang dicatat" : "Wishlist masih kosong"}
              </strong>
              <p>
                {city
                  ? "Coba pilih kota lain atau tampilkan semua kota."
                  : section === "visited"
                    ? "Tandai tempat di wishlist setelah kamu mengunjunginya agar riwayat perjalananmu tercatat."
                    : "Pilih Simpan pada tempat di Explore, pencarian OSM, atau Komunitas untuk mulai merencanakan kunjungan."}
              </p>
              {city ? (
                <button type="button" className="t-personal__cta" onClick={() => setCity("")}>Tampilkan semua kota</button>
              ) : section === "visited" ? (
                onOpenWishlist ? (
                  <button type="button" className="t-personal__cta" onClick={onOpenWishlist}>Lihat wishlist</button>
                ) : (
                  <a className="t-personal__cta" href="#explore">Jelajahi tempat</a>
                )
              ) : (
                <a className="t-personal__cta" href="#explore">Jelajahi tempat</a>
              )}
            </div>
          )}
          <div className="t-personal__places">
            {visible.map((place) => (
              <PlaceCard key={`${place.id}:${place.visited_on ?? "new"}`} place={place} story={place.story ?? undefined} onOpen={onOpenPlace} onStory={() => setStoryPlace(place)} />
            ))}
          </div>
        </>
      )}
      {storyPlace && <VisitStoryDialog place={storyPlace} story={places.find((place) => place.id === storyPlace.id)?.story ?? undefined} onClose={() => setStoryPlace(null)} />}
    </section>
  );
}

function PlaceCard({ place, story, onOpen, onStory }: { place: PersonalPlace; story?: StoryState; onOpen: (place: PersonalPlace) => Promise<void>; onStory: () => void }) {
  const [date, setDate] = useState(place.visited_on ?? localToday());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan belum tersimpan."); } finally { setBusy(false); }
  };
  return <article className="t-personal__place"><h3>{place.name}</h3><p>{place.city_name}{place.category_id ? ` · ${place.category_id}` : ""}</p><p>{placeSourceLabel(place)}</p><p>{place.address}</p>
    {place.visited_on && <p>Dikunjungi {dateLabel(place.visited_on)}</p>}
    <div className="t-personal__actions"><button type="button" disabled={busy} onClick={() => void act(() => onOpen(place))}>Lihat di peta</button>
      <a href={`https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lon}`} target="_blank" rel="noreferrer">Petunjuk arah</a>
      {place.saved && <button type="button" disabled={busy} onClick={() => void act(() => updatePlace(place.id, "unsave"))}>Hapus dari wishlist</button>}
    </div>
    <form className="t-personal__visit" onSubmit={(event) => { event.preventDefault(); void act(() => updatePlace(place.id, "visit", date)); }}>
      <label>Tanggal kunjungan<input type="date" required min="1900-01-01" max={localToday()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{place.visited_on ? "Simpan tanggal" : "Tandai sudah dikunjungi"}</button>
    </form>
    {place.visited_on && <div className="t-personal__actions"><button type="button" disabled={busy} onClick={() => void act(() => updatePlace(place.id, "unvisit"))}>Batalkan kunjungan</button>
      <button type="button" disabled={busy || story?.status === "published"} onClick={onStory}>{story?.status === "published" ? "Cerita sudah terbit" : story ? "Lihat / perbaiki cerita" : "Tulis cerita"}</button></div>}
    {story && <p>Status cerita: {({ pending: "Menunggu tinjauan", published: "Terbit", rejected: "Ditolak", needs_revision: "Perlu perbaikan" } as Record<string, string>)[story.status]}{story.moderator_note ? `. Catatan: ${story.moderator_note}` : ""}</p>}
    {busy && <p role="status">Memproses…</p>}{error && <p role="alert">{error}</p>}
  </article>;
}

export function VisitStoryDialog({ place, story, onClose }: { place: PersonalPlace; story?: StoryState; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [body, setBody] = useState(story?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="t-personal__dialog" aria-labelledby="visit-story-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); setBusy(true); setError(null); void submitVisitStory(place.id, body).then(onClose).catch((cause) => setError(cause.message)).finally(() => setBusy(false)); }}>
      <h2 id="visit-story-title">Cerita kunjungan: {place.name}</h2><p>Cerita diperiksa admin sebelum tampil di Komunitas. Tanggal kunjungan dan wishlist tetap pribadi. Namamu hanya ditampilkan bila profil publik diaktifkan.</p>
      <label>Ceritamu<textarea rows={7} required minLength={20} maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} /></label><p>{body.trim().length}/5000 karakter (minimal 20)</p>
      {error && <p role="alert">{error}</p>}<div className="t-personal__actions"><button type="submit" disabled={busy || body.trim().length < 20}>{busy ? "Mengirim…" : "Kirim cerita untuk ditinjau"}</button><button type="button" disabled={busy} onClick={onClose}>Batal</button></div>
    </form>
  </dialog>;
}
