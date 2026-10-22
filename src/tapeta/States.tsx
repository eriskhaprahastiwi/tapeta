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
            Memuat, gagal, offline, izin ditolak, kosong, dan terlalu ramai — semuanya punya bahasa
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
    { kicker: "KONTRIBUTOR AKTIF", value: String(summary?.active_contributors_30d ?? "—"), sub: "30 hari terakhir", tone: "light" },
  ];
  return (
    <div className="t-app t-app--account">
      <DesainTopbar active="my" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
      <header className="t-admintop">
        <TapetaLogo size={24} wordmarkSize={13} className="tapeta-logo--inverse" />
        <span className="t-admintop__sep" aria-hidden="true" />
        <span className="t-admintop__kicker">PENGELOLAAN</span>
        <nav className="t-admintop__nav" aria-label="Menu pengelolaan">
          <span className="t-admintop__link is-active">Ringkasan</span>
          <button type="button" className="t-admintop__link" onClick={() => { window.location.hash = "#admin"; }}>Tinjau usulan</button>
          <button type="button" className="t-admintop__link" onClick={() => { window.location.hash = "#admin-contributors"; }}>Kontributor</button>
          <button type="button" className="t-admintop__link" onClick={() => { window.location.hash = "#admin-history"; }}>Riwayat keputusan</button>
        </nav>
        <span className="t-admintop__city">Pekanbaru · Riau</span>
      </header>
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
              <button type="button" className="t-dashqueue__all" onClick={() => setNotice({ title: "Antrean penuh", body: "Daftar lengkap antrean moderasi tersedia di halaman Admin · Antrean (menu #admin)." })}>
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
                  [String(summary?.active_contributors_30d ?? "—"), "kontributor aktif · 30 hari"],
                  [String(summary?.new_contributors_30d ?? "—"), "kontributor baru · 30 hari"],
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
    <div className="t-app t-app--account">
      <DesainTopbar active="my" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />
      <main className="t-dash">
        <span className="t-dash__eyebrow">PENGELOLAAN TAPETA</span>
        <h1 className="t-dash__title">{title}</h1>
        <nav className="t-adminreport__nav" aria-label="Menu admin">
          <button onClick={() => { window.location.hash = "#admin-dash"; }}>Ringkasan</button>
          <button onClick={() => { window.location.hash = "#admin"; }}>Tinjauan</button>
          <button onClick={() => { window.location.hash = "#admin-contributors"; }}>Kontributor</button>
          <button onClick={() => { window.location.hash = "#admin-history"; }}>Riwayat</button>
        </nav>
        {error ? <p role="status">{error}</p> : rows.length === 0 ? <p role="status">Belum ada data untuk ditampilkan.</p> : (
          <div className="t-adminreport__list">
            {rows.map((row) => <article key={String(row.id)} className="t-adminreport__row">
              <strong>{String(row.display_name ?? row.place_name ?? "Perubahan moderasi")}</strong>
              <span>{mode === "contributors" ? `${String(row.total_submissions ?? 0)} usulan · ${String(row.published_submissions ?? 0)} diterbitkan${row.public_profile ? " · profil publik" : " · profil privat"}` : `${String(row.action ?? "")} · ${String(row.actor_name ?? "Admin")}${row.note ? ` · ${String(row.note)}` : ""}`}</span>
              <time>{String(row.last_contributed_at ?? row.created_at ?? "")}</time>
            </article>)}
          </div>
        )}
      </main>
    </div>
  );
}
