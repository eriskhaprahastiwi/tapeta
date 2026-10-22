import { useEffect, useState } from "react";
import { initialsOf, readSession } from "../lib/session";
import type { Category, Destination } from "../types";
import { DesainTopbar } from "./Topbar";
import {
  STATUS_LABEL,
  decideSubmission,
  formatSubmitted,
  listSubmissions,
  loadSubmissions,
  type Submission,
  type SubmissionStatus,
} from "../lib/submissions";
import { isBackendConfigured } from "../lib/supabase";
import { ProfileEditor } from "../components/ProfileEditor";
import { RevisionEditor } from "../components/RevisionEditor";
import type { LocalSession } from "../lib/session";

const BADGE_LIST: { icon: string; label: string; min: number }[] = [];

export interface MyTapetaProps {
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onOpenDestination: (id: string) => void;
  onOpenCityPicker: () => void;
  onOpenAuth: () => void;
  onOpenContribute: () => void;
  onOpenQueue: () => void;
  onSessionUpdated: (session: LocalSession) => void;
}

export function MyTapeta({
  cityName,
  provinceName,
  categoriesById,
  onOpenCityPicker,
  onOpenAuth,
  onOpenContribute,
  onOpenQueue,
  onSessionUpdated,
}: MyTapetaProps) {
  const session = readSession();
  const [subs, setSubs] = useState<Submission[]>(() => listSubmissions());
  const [filter, setFilter] = useState<"semua" | SubmissionStatus>("semua");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [retry, setRetry] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [revision, setRevision] = useState<Submission | null>(null);

  useEffect(() => {
    const sync = () => setSubs(listSubmissions());
    let active = true;
    if (session) void loadSubmissions("mine").then((rows) => { if (active) setSubs(rows); }).catch((error) => { if (active) setLoadError(error.message); }).finally(() => { if (active) setLoading(false); });
    window.addEventListener("tapeta:submissions", sync);
    return () => { active = false; window.removeEventListener("tapeta:submissions", sync); };
  }, [session, retry]);

  const counts = {
    semua: subs.length,
    menunggu: subs.filter((item) => item.status === "menunggu").length,
    perbaikan: subs.filter((item) => item.status === "perbaikan").length,
    terbit: subs.filter((item) => item.status === "terbit").length,
    ditolak: subs.filter((item) => item.status === "ditolak").length,
  };
  const visible = filter === "semua" ? subs : subs.filter((item) => item.status === filter);
  const earned = BADGE_LIST.filter((badge) => counts.terbit >= badge.min);
   const points = "Belum aktif";
  const nextBadge = BADGE_LIST.find((badge) => counts.terbit < badge.min);
  const displayName = session?.name ?? "Tamu";

  const tabs: { key: "semua" | SubmissionStatus; label: string; count: number }[] = [
    { key: "semua", label: "Semua", count: counts.semua },
    { key: "menunggu", label: "Diperiksa", count: counts.menunggu },
    { key: "terbit", label: "Terbit", count: counts.terbit },
    { key: "perbaikan", label: "Perlu perbaikan", count: counts.perbaikan },
    { key: "ditolak", label: "Ditolak", count: counts.ditolak },
  ];

  return (
    <div className="t-app t-app--account">
      {profileOpen && <ProfileEditor onClose={() => setProfileOpen(false)} onSaved={onSessionUpdated} />}
      {revision && <RevisionEditor submission={revision} onClose={() => setRevision(null)} />}
      <DesainTopbar
        active="my"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-account">
        <aside className="t-account__side" aria-label="Ruang pribadi">
          <span className="t-account__sidekicker">RUANG PRIBADI</span>
          {[
            { key: "dashboard", label: "Dashboard", action: () => setFilter("semua") },
            { key: "kontribusi", label: "Kontribusiku", action: () => setFilter("semua") },
            { key: "antrean", label: "Antrean moderasi", action: onOpenQueue },
            { key: "disetujui", label: "Disetujui", action: () => setFilter("terbit") },
          ].filter((item) => item.key !== "antrean" || session?.role === "admin" || session?.role === "moderator").map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={`t-account__nav${index === 0 ? " is-active" : ""}`}
              onClick={item.action}
            >
              {item.label}
            </button>
          ))}
          <span className="t-account__sidefoot">
            {session
              ? `Akun · ${session.email}`
              : "Masuk untuk menyimpan dan melihat kontribusi melalui akun TAPETA."}
          </span>
        </aside>

        <main className="t-account__main">
          <header className="t-account__head">
            <span className="t-account__avatar" aria-hidden="true">
              {session ? initialsOf(session.name) : "?"}
            </span>
            <div className="t-account__id">
              <h1 className="t-account__name">{displayName}</h1>
              <p className="t-account__meta">
                {session
                  ? `Akun TAPETA sejak ${formatSubmitted(session.createdAt)} · ${counts.semua} usulan · ${cityName}`
                  : `Belum masuk · ${cityName}`}
              </p>
            </div>
            {session ? (
              <button type="button" className="t-account__edit" onClick={() => setProfileOpen(true)}>
                Kelola profil
              </button>
            ) : (
              <button type="button" className="t-account__edit" onClick={onOpenAuth}>
                Masuk
              </button>
            )}
          </header>

          <div className="t-account__stats">
            {[
              {
                kicker: "USULAN TERKIRIM",
                value: String(counts.semua),
                sub: "dikirim dari akunmu",
              },
              {
                kicker: "MENUNGGU TINJAUAN",
                value: String(counts.menunggu + counts.perbaikan),
                sub: "belum tampil di peta",
              },
              {
                kicker: "DISETUJUI",
                value: String(counts.terbit),
                sub: "terverifikasi admin",
              },
            ].map((stat) => (
              <div key={stat.kicker} className="t-statcard">
                <span className="t-statcard__kicker">{stat.kicker}</span>
                <span className="t-statcard__value">{stat.value}</span>
                <span className="t-statcard__sub">{stat.sub}</span>
              </div>
            ))}
          </div>

          <div className="t-account__cols">
            <section className="t-mine" aria-label="Kontribusiku">
              <h2 className="t-mine__title">Kontribusimu</h2>
              {loading && <p role="status">Memuat kontribusi…</p>}
              {loadError && <p role="alert">{loadError} <button onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>}
              <div className="t-mine__tabs" role="tablist" aria-label="Filter kontribusi">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === tab.key}
                    className={`t-mine__tab${filter === tab.key ? " is-active" : ""}`}
                    onClick={() => setFilter(tab.key)}
                  >
                    {tab.label}
                    <span className="t-mine__count">{tab.count}</span>
                  </button>
                ))}
              </div>

              {loading || loadError ? null : visible.length === 0 ? (
                <div className="t-queueempty">
                  <span className="t-queueempty__title">
                    {subs.length === 0 ? "Belum ada usulan" : "Tidak ada usulan di filter ini"}
                  </span>
                  <p className="t-queueempty__body">
                    {session ? isBackendConfigured ? "Usulan akunmu akan muncul di sini setelah tersimpan di server." : "Backend belum dikonfigurasi; data usulan server belum tersedia." : "Masuk untuk melihat dan mengelola usulan milik akunmu."}
                  </p>
                  <button
                    type="button"
                    className="t-btn t-btn--brick t-btn--brick-sm"
                    onClick={onOpenContribute}
                  >
                    Usulkan tempat
                  </button>
                </div>
              ) : (
                <div className="t-mine__list">
                  {visible.map((item) => (
                    <div key={item.id} className="t-mine__row t-mine__row--static">
                      <span className="t-mine__info">
                        <span className="t-mine__name">{item.name}</span>
                        <span className="t-mine__meta">
                          {categoriesById.get(item.categoryId)?.shortName ?? item.categoryId} ·{" "}
                          {item.regionName || "kecamatan belum terdeteksi"}
                        </span>
                        {item.moderatorNote && <span className="t-mine__meta">Catatan moderator: {item.moderatorNote}</span>}
                        {item.status === "perbaikan" && <button className="t-auth__link" onClick={() => setRevision(item)}>Perbaiki usulan</button>}
                      </span>
                      <span className="t-mine__when">{formatSubmitted(item.submittedAt)}</span>
                      <span
                        className={`t-mine__status t-mine__status--${
                          item.status === "perbaikan" ? "perlu-perbaikan" : item.status
                        }`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="t-mine__actions">
                <button type="button" className="t-mine__all" onClick={onOpenContribute}>
                  Usulkan tempat lain →
                </button>
                {(session?.role === "admin" || session?.role === "moderator") && <button type="button" className="t-mine__all" onClick={onOpenQueue}>
                  Buka antrean moderasi →
                </button>}
              </div>
            </section>

            <aside className="t-account__right">
              <section className="t-points">
                <span className="t-points__kicker">POIN LOKAL</span>
                <div className="t-points__value">
                  {points}
                </div>
                <div className="t-points__bar" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, (counts.terbit / 10) * 100)}%` }} />
                </div>
                <span className="t-points__note">
                  {nextBadge
                    ? `${Math.max(0, nextBadge.min - counts.terbit)} tempat disetujui lagi menuju lencana ${nextBadge.label}.`
                    : "Aturan poin dan lencana menunggu keputusan pengelola."}
                </span>
              </section>
              <section className="t-mybadges">
                <div className="t-mybadges__head">
                  <span className="t-mybadges__title">Lencana</span>
                  <span className="t-mybadges__count">
                    {earned.length} dari {BADGE_LIST.length}
                  </span>
                </div>
                <div className="t-mybadges__row">
                  {BADGE_LIST.map((badge) => {
                    const unlocked = earned.some((item) => item.label === badge.label);
                    return (
                      <span
                        key={badge.label}
                        className={`t-mybadges__item${unlocked ? "" : " is-locked"}`}
                      >
                        <span aria-hidden="true">{badge.icon}</span>
                        {badge.label}
                      </span>
                    );
                  })}
                </div>
                <span className="t-mybadges__note">
                  Lencana belum diaktifkan.
                </span>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

const CRITERIA = [
  "Nama dan lokasi cocok dengan sumber",
  "Alamat bisa dipakai pengunjung",
  "Tidak ada klaim yang belum terverifikasi",
];

export interface AdminQueueProps {
  cityName: string;
  provinceName: string;
  onOpenCityPicker: () => void;
  onOpenContribute: () => void;
}

export function AdminQueue({
  cityName,
  provinceName,
  onOpenCityPicker,
  onOpenContribute,
}: AdminQueueProps) {
  const [items, setItems] = useState<Submission[]>(() => listSubmissions("admin"));
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [queueFilter, setQueueFilter] = useState<"semua" | SubmissionStatus>("semua");
  const [deciding, setDeciding] = useState(false);
  const [note, setNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const sync = () => {
      const next = listSubmissions("admin");
      setItems(next);
      setActiveId((current) => current ?? next[0]?.id ?? null);
    };
    void loadSubmissions("admin").then(sync).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
    window.addEventListener("tapeta:submissions", sync);
    return () => window.removeEventListener("tapeta:submissions", sync);
  }, [retry]);

  const active = items.find((item) => item.id === activeId) ?? null;
  const counts = {
    menunggu: items.filter((item) => item.status === "menunggu").length,
    perbaikan: items.filter((item) => item.status === "perbaikan").length,
    terbit: items.filter((item) => item.status === "terbit").length,
    ditolak: items.filter((item) => item.status === "ditolak").length,
  };

  const decide = async (status: SubmissionStatus) => {
    if (!active || deciding || active.status !== "menunggu") return;
    if ((status === "perbaikan" || status === "ditolak") && note.trim().length < 4) {
      window.alert("Tulis alasan minimal 4 karakter untuk meminta perbaikan atau menolak usulan.");
      return;
    }
    if (!window.confirm(`${STATUS_LABEL[status]}: “${active.name}”? Keputusan akan dicatat dan dikirim kepada kontributor.`)) return;
    setDeciding(true);
    try { await decideSubmission(active.id, status, note.trim() || undefined); setItems(listSubmissions("admin")); setNote(""); }
    catch (cause) { window.alert(cause instanceof Error ? cause.message : "Keputusan tidak tersimpan."); }
    finally { setDeciding(false); }
  };

  return (
    <div className="t-app t-app--doc">
      <DesainTopbar
        active="explore"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-admin">
        <div className="t-admin__head">
          <span className="t-admin__eyebrow">ADMIN · MODERASI</span>
          <h1 className="t-admin__title">Antrean tinjauan</h1>
          <label>Filter status <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as typeof queueFilter)}>
            <option value="semua">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <p className="t-admin__lead">
            {counts.menunggu} usulan menunggu · {isBackendConfigured ? "antrean server" : "backend belum dikonfigurasi"}
          </p>
          <div className="t-admin__stats">
            {[
              { label: "Perlu ditinjau", value: String(counts.menunggu), tone: "warn" },
              { label: "Perlu perbaikan", value: String(counts.perbaikan), tone: "warn" },
              { label: "Terbit", value: String(counts.terbit), tone: "ok" },
              { label: "Ditolak", value: String(counts.ditolak), tone: "muted" },
            ].map((stat) => (
              <span key={stat.label} className={`t-admin__stat t-admin__stat--${stat.tone}`}>
                <span className="t-admin__statlabel">{stat.label}</span>
                <span className="t-admin__statvalue">{stat.value}</span>
              </span>
            ))}
          </div>
        </div>

        {loading ? <p role="status">Memuat antrean…</p> : loadError ? <p role="alert">{loadError} <button onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p> : items.length === 0 ? (
          <div className="t-queueempty">
            <span className="t-queueempty__title">Belum ada usulan masuk</span>
            <p className="t-queueempty__body">
              {isBackendConfigured ? "Belum ada usulan yang menunggu tinjauan." : "Antrean memerlukan Supabase yang sudah dikonfigurasi dan akun moderator."}
            </p>
            <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={onOpenContribute}>
              Kembali ke peta
            </button>
          </div>
        ) : (
          <div className="t-admin__grid">
            <section className="t-queue" aria-label="Antrean usulan">
              <div className="t-queue__thead">
                <span>TEMPAT / USULAN</span>
                <span>PENGUSUL</span>
                <span>MASUK</span>
                <span>STATUS</span>
              </div>
              {items.filter((row) => queueFilter === "semua" || row.status === queueFilter).map((row) => (
                <button
                  type="button"
                  key={row.id}
                  className={`t-queue__row t-queue__row--btn${row.id === activeId ? " is-active" : ""}`}
                  onClick={() => { setActiveId(row.id); setNote(""); }}
                >
                  <span className="t-queue__main">
                    <span className="t-queue__name">{row.name}</span>
                    <span className="t-queue__kind">
                      {row.categoryId} · {row.regionName || "kecamatan belum terdeteksi"} · {row.id}
                    </span>
                  </span>
                  <span className="t-queue__who">{row.submittedBy}</span>
                  <span className="t-queue__date">{formatSubmitted(row.submittedAt)}</span>
                  <span
                    className={`t-queue__status${row.status === "menunggu" ? " t-queue__status--wait" : ""}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </button>
              ))}
              <p className="t-queue__note">
                Setiap keputusan dicatat dalam riwayat moderasi.
              </p>
            </section>

            {active && (
              <aside className="t-review" aria-label="Tinjau usulan">
                <div className="t-review__head">
                  <span className="t-review__kicker">TINJAU USULAN</span>
                  <span className="t-review__code">{active.id}</span>
                </div>
                <div className="t-review__photo">
                  <span className="t-review__phicon" aria-hidden="true">◌</span>
                  <span className="t-review__phcap">Belum ada foto berlisensi</span>
                </div>
                <h2 className="t-review__name">{active.name}</h2>
                <a href={`https://www.openstreetmap.org/?mlat=${active.lat}&mlon=${active.lon}#map=17/${active.lat}/${active.lon}`} target="_blank" rel="noreferrer">Periksa titik di OpenStreetMap</a>
                <p className="t-review__meta">
                  Usulan tempat baru · {active.categoryId} ·{" "}
                  {active.regionName ? `Kec. ${active.regionName}` : "kecamatan belum terdeteksi"}
                </p>
                <div className="t-review__table">
                  {[
                    ["Alamat", active.address || "—"],
                    [
                      "Koordinat",
                      `${active.lat.toFixed(4).replace(".", ",")}° LU · ${active.lon
                        .toFixed(4)
                        .replace(".", ",")}° BT`,
                    ],
                    ["Sumber", active.source || "Tidak disebutkan"],
                    ["Pengusul", active.submittedBy],
                  ].map(([key, value]) => (
                    <div key={key} className="t-review__row">
                      <span className="t-review__k">{key}</span>
                      <span className="t-review__v">{value}</span>
                    </div>
                  ))}
                </div>
                <span className="t-review__criteriatitle">Kriteria verifikasi</span>
                <ul className="t-review__criteria">
                  {CRITERIA.map((item) => (
                    <li key={item}>
                      <span className="t-review__check" aria-hidden="true">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <label className="t-review__note">
                  <span>Catatan untuk pengusul · wajib jika meminta perbaikan/menolak</span>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: alamat terlalu umum, tambahkan patokan."
                  />
                </label>
                <div className="t-review__actions">
                  <button type="button" className="t-review__approve" disabled={deciding || active.status !== "menunggu"} onClick={() => decide("terbit")}>
                    Setujui &amp; terbitkan
                  </button>
                  <div className="t-review__pair">
                    <button type="button" className="t-review__fix" disabled={deciding || active.status !== "menunggu"} onClick={() => decide("perbaikan")}>
                      Minta perbaikan
                    </button>
                    <button type="button" className="t-review__reject" disabled={deciding || active.status !== "menunggu"} onClick={() => decide("ditolak")}>
                      Tolak usulan
                    </button>
                  </div>
                </div>
                <p className="t-review__storage">
                  Keputusan diproses server; alasan wajib untuk meminta perbaikan atau menolak.
                </p>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export interface KotaBaruProps {
  children?: React.ReactNode;
  destinationCount: number;
  cityName: string;
  provinceName: string;
  onSearchCity: (query: string) => void;
  onOpenCityPicker: () => void;
  onOpenContribute: () => void;
}

export function KotaBaru({
  children,
  destinationCount,
  cityName,
  provinceName,
  onOpenCityPicker,
  onOpenContribute,
}: KotaBaruProps) {
  return (
    <div className="t-app t-app--kota">
      <DesainTopbar
        active="explore"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-kota">
        <aside className="t-kota__panel" aria-label="Eksplorasi kota">
          <span className="t-kota__kicker">PETA KOMUNITAS · INDONESIA</span>
          <h1 className="t-kota__title">
            Jelajahi
            <br />
            kota baru
          </h1>
          <p className="t-kota__lead">
            Pilih kota untuk melihat tempat yang sudah dibagikan dan diverifikasi komunitas.
          </p>
          <button type="button" className="t-kota__search" onClick={onOpenCityPicker}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b9ae97" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            Cari kota atau kabupaten
          </button>
          <div className="t-kota__selected">
            <span className="t-kota__selectedlabel">KOTA TERPILIH</span>
            <span className="t-kota__badge">{destinationCount ? "Sedang dijelajahi" : "Belum ada data TAPETA"}</span>
            <span className="t-kota__city">{cityName}</span>
            <span className="t-kota__status">{destinationCount} destinasi terbit termuat</span>
          </div>
          <div className="t-kota__empty">
            <span className="t-kota__emptytitle">Belum ada destinasi dari komunitas</span>
          </div>
          <div className="t-kota__pioneer">
            <span className="t-kota__ptitle">Jadi pelopor di kotamu</span>
            <p className="t-kota__pbody">
              Tambahkan tempat pertama. Setelah ditinjau admin, tempatmu akan muncul sebagai pin dan
              stiker di peta.
            </p>
            <button type="button" className="t-kota__cta" onClick={onOpenContribute}>
              Usulkan tempat pertama
            </button>
          </div>
          <p className="t-kota__note">
            Peta dasar mengikuti OpenStreetMap. Stiker muncul setelah destinasi terverifikasi.
          </p>
        </aside>

        <main className="t-kota__map" aria-label="Peta kota belum terjelajahi">
          {children}
        </main>
      </div>
    </div>
  );
}
