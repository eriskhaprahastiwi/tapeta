import { useEffect, useState } from "react";
import type { Destination } from "../types";
import { TapetaLogo } from "../components/TapetaLogo";
import { NoticeDialog } from "../components/NoticeDialog";
import { formatSubmitted, loadSubmissions, type Submission } from "../lib/submissions";
import { isBackendConfigured } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { DesainTopbar } from "./Topbar";

const STATES = [
  {
    key: "memuat",
    label: "MEMUAT",
    title: "Memuat peta…",
    body: "Menyiapkan 15 kecamatan dan 35 destinasi.",
    tone: "neutral",
    action: null,
  },
  {
    key: "gagal",
    label: "GAGAL",
    title: "Peta tidak bisa dimuat",
    body: "Periksa koneksi, lalu coba lagi.",
    tone: "danger",
    action: "Coba lagi",
  },
  {
    key: "offline",
    label: "OFFLINE",
    title: "Kamu sedang offline",
    body: "Data terakhir dari 12 Okt 2026 tetap bisa dibaca.",
    tone: "warn",
    action: "Menampilkan data tersimpan",
  },
  {
    key: "izin",
    label: "IZIN DITOLAK",
    title: "Lokasi tidak tersedia",
    body: "Kamu bisa memilih titik secara manual di peta.",
    tone: "neutral",
    action: "Pilih manual",
    secondary: "Aktifkan izin →",
  },
  {
    key: "kosong",
    label: "KOSONG",
    title: "Tidak ada hasil untuk “kopi susu”",
    body: "Coba kata lain atau hapus filter kategori.",
    tone: "neutral",
    action: "Hapus filter",
  },
  {
    key: "ramai",
    label: "TERLALU RAMAI",
    title: "Perbesar peta untuk melihat tempat",
    body: "35 destinasi tersebar di 15 kecamatan.",
    tone: "neutral",
    action: "35 destinasi · 15 kecamatan",
  },
] as const;

export function States() {
  return (
    <div className="t-app t-app--doc t-app--states">
      <div className="t-states">
        <header className="t-states__head">
          <span className="t-states__eyebrow">SISTEM · KEADAAN ANTARMUKA</span>
          <h1 className="t-states__title">Bukan hanya keadaan yang bahagia</h1>
          <p className="t-states__lead">
            Memuat, gagal, offline, izin ditolak, kosong, dan terlalu ramai. Semuanya punya bahasa
            dan jalan keluar.
          </p>
        </header>
        <div className="t-states__grid">
          {STATES.map((state) => (
            <article key={state.key} className={`t-state t-state--${state.tone}`}>
              <span className="t-state__label">{state.label}</span>
              <div className="t-state__body">
                <span className="t-state__title">{state.title}</span>
                <p className="t-state__text">{state.body}</p>
              </div>
              {state.action && (
                <div className="t-state__actions">
                  <span className={state.tone === "danger" ? "t-state__btn" : "t-state__link"}>
                    {state.action}
                  </span>
                  {"secondary" in state && state.secondary && (
                    <span className="t-state__link">{state.secondary}</span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export type AdminSection = "ringkasan" | "antrean" | "import" | "kontributor" | "riwayat";

const ADMIN_LINKS: Array<{ key: AdminSection; label: string; hash: string }> = [
  { key: "antrean", label: "Tinjau usulan", hash: "#admin" },
  { key: "import", label: "Verifikasi katalog", hash: "#admin-import" },
  { key: "riwayat", label: "Riwayat keputusan", hash: "#admin-history" },
];

/**
 * Menu pengelolaan yang sama untuk semua halaman admin, supaya perpindahan
 * antrean, import, kontributor, dan riwayat tidak terasa seperti halaman lain.
 */
export function AdminBar({ active }: { active: AdminSection }) {
  return (
    <header className="t-admintop">
      <TapetaLogo size={24} wordmarkSize={13} className="tapeta-logo--inverse" />
      <span className="t-admintop__sep" aria-hidden="true" />
      <span className="t-admintop__kicker">PENGELOLAAN</span>
      <nav className="t-admintop__nav" aria-label="Menu pengelolaan">
        {ADMIN_LINKS.map((link) =>
          link.key === active ? (
            <span key={link.key} className="t-admintop__link is-active" aria-current="page">{link.label}</span>
          ) : (
            <button
              key={link.key}
              type="button"
              className="t-admintop__link"
              onClick={() => { window.location.hash = link.hash; }}
            >
              {link.label}
            </button>
          ),
        )}
      </nav>

    </header>
  );
}

export interface AdminDashProps {
  destinations: Destination[];
  cityName: string;
  provinceName: string;
  onOpenCityPicker: () => void;
}

export function AdminDash({ destinations, cityName, provinceName, onOpenCityPicker }: AdminDashProps) {
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [queue, setQueue] = useState<Submission[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([loadSubmissions("admin"), supabase?.rpc("admin_summary")]).then(([rows, result]) => {
      if (!active) return;
      if (!result || result.error) throw new Error(result?.error?.message ?? "Backend belum dikonfigurasi.");
      setQueue(rows); setSummary(result.data as Record<string, number>);
    }).catch((cause) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const pending = queue.filter((item) => item.status === "menunggu").length;
  const revision = queue.filter((item) => item.status === "perbaikan").length;
  const reviewed = queue.filter((item) => item.status === "terbit").length;
  const dashboardStats = [
    { kicker: "MENUNGGU TINJAUAN", value: String(pending), sub: "antrean saat ini", tone: "dark" },
    { kicker: "TERVERIFIKASI", value: String(summary?.published_destinations ?? destinations.length), sub: "destinasi terbit", tone: "dark" },
    { kicker: "PERLU PERBAIKAN", value: String(revision), sub: "menunggu kontributor", tone: "dark" },
    { kicker: "KONTRIBUTOR AKTIF", value: String(summary?.active_contributors_30d ?? "Belum tersedia"), sub: "30 hari terakhir", tone: "light" },
  ];
  return (
    <div className="t-app t-app--account t-app--admin">
      <DesainTopbar active="my" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
      <AdminBar active="ringkasan" />
      <div className="t-dash">
        <span className="t-dash__eyebrow">RUANG KERJA ADMIN · PEKANBARU</span>
        <h1 className="t-dash__title">Ringkasan moderasi</h1>
        <p className="t-dash__lead">Pantau usulan, verifikasi tempat, dan kontribusi komunitas.</p>
        {loading && <p role="status">Memuat ringkasan…</p>}
        {error && <p role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>}

        <div className="t-dash__stats">
          {dashboardStats.map((stat) => (
            <div key={stat.kicker} className={`t-dashstat t-dashstat--${stat.tone}`}>
              <span className="t-dashstat__kicker">{stat.kicker}</span>
              <span className="t-dashstat__value">{stat.value}</span>
              <span className="t-dashstat__sub">{stat.sub}</span>
            </div>
          ))}
        </div>

        <div className="t-dash__grid">
          <section className="t-dashqueue">
            <header className="t-dashqueue__head">
              <span className="t-dashqueue__title">Antrean tinjauan</span>
              <span className="t-dashqueue__helper">Usulan terbaru yang membutuhkan keputusan</span>
              <button type="button" className="t-dashqueue__all" onClick={() => { window.location.hash = "#admin"; }}>
                Lihat semua →
              </button>
            </header>
            <div className="t-dashqueue__thead">
              <span>TEMPAT / PENGUSUL</span>
              <span>KATEGORI</span>
              <span>DIAJUKAN</span>
              <span>STATUS</span>
            </div>
            {queue.slice(0, 5).map((item) => (
              (() => { const row = { name: item.name, meta: `${item.submittedBy} · ${item.address}`, cat: item.categoryId, when: formatSubmitted(item.submittedAt), status: item.status === "perbaikan" ? "Perbaikan" : "Perlu ditinjau" }; return (
              <div key={row.name} className="t-dashqueue__row">
                <span className="t-dashqueue__main">
                  <span className="t-dashqueue__name">{row.name}</span>
                  <span className="t-dashqueue__meta">{row.meta}</span>
                </span>
                <span className="t-dashqueue__cat">{row.cat}</span>
                <span className="t-dashqueue__when">{row.when}</span>
                <span
                  className={`t-dashqueue__status${row.status === "Perbaikan" ? " t-dashqueue__status--fix" : ""}`}
                >
                  {row.status}
                </span>
              </div>
              ); })()
            ))}
            {queue.length === 0 && <p className="t-dashqueue__helper">{isBackendConfigured ? "Belum ada usulan di antrean." : "Hubungkan Supabase untuk memuat antrean moderasi."}</p>}
            <span className="t-dashqueue__count">
              {destinations.length} destinasi terverifikasi di basis data
            </span>
          </section>

          <aside className="t-dashside">
            <section className="t-dashcontrib">
              <div className="t-dashcontrib__head">
                <span className="t-dashcontrib__title">Kontributor</span>
                <span className="t-dashcontrib__range">30 hari terakhir ⌄</span>
              </div>
              <div className="t-dashcontrib__grid">
                {[
                  [String(summary?.active_contributors_30d ?? "Belum tersedia"), "kontributor aktif · 30 hari"],
                  [String(summary?.new_contributors_30d ?? "Belum tersedia"), "kontributor baru · 30 hari"],
                  [String(queue.length), "usulan dimuat"],
                  [String(reviewed), "usulan diterbitkan"],
                ].map(([value, label]) => (
                  <div key={label} className="t-dashcontrib__cell">
                    <span className="t-dashcontrib__value">{value}</span>
                    <span className="t-dashcontrib__label">{label}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="t-dashactivity">
              <span className="t-dashactivity__title">Aktivitas terbaru</span>
              <span className="t-dashactivity__item">{isBackendConfigured ? "Riwayat aksi admin akan tampil setelah event tersedia." : "Aktivitas belum tersedia sebelum backend dikonfigurasi."}</span>
              <button type="button" className="t-dashactivity__link" onClick={() => { window.location.hash = "#admin-history"; }}>
                Buka riwayat keputusan →
              </button>
            </section>
          </aside>
        </div>
      </div>
      <NoticeDialog open={Boolean(notice)} title={notice?.title ?? ""} body={notice?.body ?? ""} onClose={() => setNotice(null)} />
    </div>
  );
}

function adminDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }).format(date) + " WIB";
}

function adminDecision(row: Record<string, unknown>) {
  const actions: Record<string, string> = { published: "Diterbitkan", rejected: "Ditolak", needs_revision: "Perlu perbaikan", role_changed: "Peran diubah" };
  let note = String(row.note ?? "");
  if (row.action === "role_changed") {
    try {
      const roles: Record<string, string> = { admin: "Admin", moderator: "Moderator", contributor: "Kontributor" };
      const detail = JSON.parse(note);
      if (detail.previous_role && detail.new_role) note = `${roles[detail.previous_role] ?? detail.previous_role} → ${roles[detail.new_role] ?? detail.new_role}`;
    } catch { /* Older audit notes may be plain text. */ }
  }
  return `${actions[String(row.action)] ?? String(row.action ?? "Perubahan")} · ${String(row.actor_name ?? "Admin")}${note ? ` · ${note}` : ""}`;
}

export function AdminReports({ mode, cityName, provinceName, onOpenCityPicker }: AdminDashProps & { mode: "contributors" | "history" }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(() => isBackendConfigured ? null : "Backend Supabase belum dikonfigurasi.");
  useEffect(() => {
    if (!supabase) return;
    void supabase.rpc(mode === "contributors" ? "admin_contributors" : "admin_moderation_history")
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setRows((data ?? []) as Array<Record<string, unknown>>);
      });
  }, [mode]);
  const title = mode === "contributors" ? "Rekap kontributor" : "Riwayat keputusan";
  return (
    <div className="t-app t-app--account t-app--admin">
      <DesainTopbar active="my" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
      <AdminBar active={mode === "contributors" ? "kontributor" : "riwayat"} />
      <main className="t-dash">
        <span className="t-dash__eyebrow">PENGELOLAAN TAPETA</span>
        <h1 className="t-dash__title">{title}</h1>
        {error ? <p role="status">{error}</p> : rows.length === 0 ? <p role="status">Belum ada data untuk ditampilkan.</p> : (
          <div className="t-adminreport__list">
            {rows.map((row) => <article key={String(row.id)} className="t-adminreport__row">
              <strong>{String(row.display_name ?? row.place_name ?? "Perubahan moderasi")}</strong>
              <span>{mode === "contributors" ? `${String(row.total_submissions ?? 0)} usulan · ${String(row.published_submissions ?? 0)} diterbitkan${row.public_profile ? " · profil publik" : " · profil privat"}` : adminDecision(row)}</span>
              <time>{adminDate(row.last_contributed_at ?? row.created_at)}</time>
            </article>)}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import & stiker: meninjau hasil bulk import sebelum dipublikasikan.
// ---------------------------------------------------------------------------
interface ImportRow {
  id: string;
  name: string;
  category_id: string;
  address: string;
  hours: string | null;
  description: string | null;
  region_code: string | null;
  lat: number;
  lon: number;
  sticker_slug: string | null;
  sticker_path: string | null;
  sticker_published: boolean;
  publication_status: "draft" | "verified" | "published" | "archived";
  coordinate_source: string | null;
  coordinate_confidence: string | null;
  osm_type: string | null;
  osm_id: number | null;
  source_url: string | null;
  verified_at: string | null;
  import_batch: string | null;
}

const STATUS_LABEL_IMPORT: Record<ImportRow["publication_status"], string> = {
  draft: "Perlu verifikasi",
  verified: "Terverifikasi",
  published: "Terbit",
  archived: "Nonaktif",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  exact: "Koordinat OSM cocok",
  approximate: "Koordinat perkiraan",
};

type ImportFilter = "all" | ImportRow["publication_status"];

export function AdminImport({ cityName, provinceName, onOpenCityPicker }: Pick<AdminDashProps, "cityName" | "provinceName" | "onOpenCityPicker">) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<ImportFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ImportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase) {
        setLoading(false);
        setError("Backend belum dikonfigurasi.");
        return;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc("admin_destinations");
        if (!active) return;
        if (rpcError) throw rpcError;
        setRows((data ?? []) as ImportRow[]);
        setError(null);
      } catch (cause) {
        if (active) setError((cause as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [retry]);

  const counts = {
    all: rows.length,
    draft: rows.filter((row) => row.publication_status === "draft").length,
    verified: rows.filter((row) => row.publication_status === "verified").length,
    published: rows.filter((row) => row.publication_status === "published").length,
    archived: rows.filter((row) => row.publication_status === "archived").length,
  };

  const filtered = rows.filter((row) => {
    if (filter !== "all" && row.publication_status !== filter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [row.name, row.address ?? "", row.sticker_slug ?? "", row.category_id].join(" ").toLowerCase().includes(needle);
  });

  async function act(row: ImportRow, action: "verify" | "publish" | "unpublish" | "archive" | "restore" | "needs_review") {
    if (!supabase) return;
    setBusyId(row.id);
    try {
      const { error: rpcError } = await supabase.rpc("admin_verify_destination", { p_destination_id: row.id, p_action: action });
      if (rpcError) throw rpcError;
      setRetry((value) => value + 1);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="t-app t-app--account t-app--admin">
      <DesainTopbar active="my" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
      <AdminBar active="import" />
      <div className="t-dash">
        <span className="t-dash__eyebrow">RUANG KERJA ADMIN · {cityName.toUpperCase()}</span>
        <h1 className="t-dash__title">Import & stiker landmark</h1>
        <p className="t-dash__lead">Destinasi hasil import OSM. Periksa koordinat, verifikasi, lalu publikasikan. Hanya yang terbit tampil di Explore.</p>

        {loading && <p role="status">Memuat destinasi…</p>}
        {error && <p role="alert">{error} <button onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>}

        <div className="t-importbar">
          <div className="t-importbar__filters" role="group" aria-label="Filter status destinasi">
            {(["all", "draft", "verified", "published", "archived"] as ImportFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`t-importbar__filter${filter === key ? " is-active" : ""}`}
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? "Semua" : STATUS_LABEL_IMPORT[key]}
                <span className="t-importbar__count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="t-importbar__search">
            <span className="visually-hidden">Cari destinasi import</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, stiker, alamat…" />
          </label>
        </div>

        {!loading && filtered.length === 0 && (
          <p role="status" className="t-importempty">
            {rows.length === 0
              ? "Belum ada destinasi. Jalankan scripts/import-destinations.mjs --geocode --push untuk mengisi."
              : "Tidak ada destinasi pada filter ini."}
          </p>
        )}

        <div className="t-importlist">
          {filtered.map((row) => (
            <article key={row.id} className="t-importrow">
              <div className="t-importrow__art">
                {row.sticker_path ? <img src={row.sticker_path} alt="" width={72} height={72} loading="lazy" /> : <span aria-hidden="true">?</span>}
              </div>
              <div className="t-importrow__main">
                <h2 className="t-importrow__name">{row.name}</h2>
                <p className="t-importrow__meta">
                  {row.category_id} · {row.region_code ? `kecamatan ${row.region_code}` : "kecamatan dari peta"} ·{" "}
                  {row.lat.toFixed(5)}, {row.lon.toFixed(5)}
                </p>
                <p className="t-importrow__meta">
                  {row.coordinate_source === "atlas" || row.coordinate_source === "nominatim-lookup" ? "OSM ID atlas" : "Nominatim"}
                  {" · "}
                  {CONFIDENCE_LABEL[row.coordinate_confidence ?? ""] ?? "Sumber koordinat belum dicatat"}
                  {row.source_url && (
                    <>
                      {" · "}
                      <a href={row.source_url} target="_blank" rel="noreferrer">Buka OSM</a>
                    </>
                  )}
                </p>
                {row.sticker_slug && <p className="t-importrow__meta">Stiker: {row.sticker_slug}.png {row.sticker_published ? "(terbit)" : "(belum terbit)"}</p>}
              </div>
              <div className="t-importrow__status">
                <span className={`t-importrow__badge t-importrow__badge--${row.publication_status}`}>
                  {STATUS_LABEL_IMPORT[row.publication_status]}
                </span>
                <div className="t-importrow__actions">
                  <button type="button" className="t-importrow__btn" onClick={() => setEditing(row)}>Edit</button>
                  {row.publication_status === "draft" && (
                    <button type="button" className="t-importrow__btn t-importrow__btn--primary" disabled={busyId === row.id} onClick={() => void act(row, "verify")}>
                      Verifikasi
                    </button>
                  )}
                  {row.publication_status === "verified" && (
                    <button type="button" className="t-importrow__btn t-importrow__btn--primary" disabled={busyId === row.id} onClick={() => void act(row, "publish")}>
                      Publikasikan
                    </button>
                  )}
                  {row.publication_status === "published" && (
                    <button type="button" className="t-importrow__btn" disabled={busyId === row.id} onClick={() => void act(row, "unpublish")}>
                      Nonaktifkan
                    </button>
                  )}
                  {row.publication_status === "verified" && (
                    <button type="button" className="t-importrow__btn t-importrow__btn--quiet" disabled={busyId === row.id} onClick={() => void act(row, "needs_review")}>
                      Kembalikan ke verifikasi
                    </button>
                  )}
                  {row.publication_status !== "archived" && (
                    <button type="button" className="t-importrow__btn t-importrow__btn--quiet" disabled={busyId === row.id} onClick={() => void act(row, "archive")}>
                      Arsipkan
                    </button>
                  )}
                  {row.publication_status === "archived" && (
                    <button type="button" className="t-importrow__btn" disabled={busyId === row.id} onClick={() => void act(row, "restore")}>
                      Pulihkan
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      {editing && (
        <DestinationEditor
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setRetry((value) => value + 1); }}
        />
      )}
    </div>
  );
}

function DestinationEditor({ row, onClose, onSaved }: { row: ImportRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: row.name,
    categoryId: row.category_id,
    address: row.address ?? "",
    hours: row.hours ?? "",
    description: row.description ?? "",
    lat: String(row.lat),
    lon: String(row.lon),
    stickerSlug: row.sticker_slug ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("admin_update_destination", {
        p_destination_id: row.id,
        p_name: form.name,
        p_category_id: form.categoryId,
        p_address: form.address,
        p_hours: form.hours,
        p_description: form.description,
        p_lat: Number(form.lat),
        p_lon: Number(form.lon),
        p_region_code: row.region_code,
        p_sticker_slug: form.stickerSlug,
      });
      if (rpcError) throw rpcError;
      onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="t-editor" role="dialog" aria-modal="true" aria-labelledby="t-editor-title">
      <form className="t-editor__panel" onSubmit={save}>
        <h2 id="t-editor-title" className="t-editor__title">Edit destinasi</h2>
        <p className="t-editor__lead">Perubahan langsung dipakai Explore setelah destinasi terbit.</p>
        <label className="t-editor__field"><span>Nama</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></label>
        <label className="t-editor__field"><span>Kategori</span>
          <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
            {["kafe", "kuliner", "alam", "budaya", "rekreasi", "lainnya"].map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label className="t-editor__field"><span>Alamat</span><input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label className="t-editor__field"><span>Jam buka</span><input value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} placeholder="mis. 08.00 - 22.00" /></label>
        <label className="t-editor__field"><span>Deskripsi</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="t-editor__pair">
          <label className="t-editor__field"><span>Lintang</span><input type="number" step="0.000001" value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} required /></label>
          <label className="t-editor__field"><span>Bujur</span><input type="number" step="0.000001" value={form.lon} onChange={(event) => setForm({ ...form, lon: event.target.value })} required /></label>
        </div>
        <label className="t-editor__field"><span>Slug stiker</span><input value={form.stickerSlug} onChange={(event) => setForm({ ...form, stickerSlug: event.target.value })} placeholder="mis. tugu-zapin" /></label>
        {error && <p role="alert" className="t-editor__error">{error}</p>}
        <div className="t-editor__actions">
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>Batal</button>
          <button type="submit" className="t-btn t-btn--brick" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
        </div>
      </form>
    </div>
  );
}
