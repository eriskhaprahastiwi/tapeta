import { useEffect, useState } from "react";
import type { Category, Destination } from "../types";
import { formatSubmitted, listSubmissions, type Submission } from "../lib/submissions";
import { ChevronDownIcon } from "../components/Icons";
import { DesainTopbar } from "./Topbar";
import { NoticeDialog } from "../components/NoticeDialog";

const BADGES = [
  { icon: "✦", label: "Penjelajah" },
  { icon: "◆", label: "Pemandu" },
  { icon: "●", label: "Pewarta" },
  { icon: "✧", label: "Penjaga" },
];

interface FeedItem {
  initial: string;
  who: string;
  action: string;
  when: string;
  status: string;
  body: string;
  target: string | null;
  targetCat: string;
}

export interface CommunityProps {
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onBack: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
  onOpenAuth: () => void;
  onOpenContribute: () => void;
}

const CONTRIBUTORS = [
  { initial: "R", name: "Rani W.", count: 14, tint: "#e6ded0", ink: "#6f6555" },
  { initial: "D", name: "Dewi A.", count: 11, tint: "#dde6dc", ink: "#40604c" },
  { initial: "B", name: "Bagas P.", count: 8, tint: "#f3ddd6", ink: "#8f3f2c" },
  { initial: "S", name: "Sari M.", count: 6, tint: "#dde1e9", ink: "#3f4d6e" },
  { initial: "?", name: "Kamu", count: 0, tint: "#eee9dd", ink: "#6b6153" },
];

const FEED = [
  {
    initial: "R",
    who: "Rani W.",
    action: "menambahkan 3 tempat",
    when: "2 jam lalu · Kec. Senapelan",
    status: "Terverifikasi",
    body: "Senapelan dapat tiga tempat baru minggu ini — dua kafe kecil dan satu kedai kopi di dekat pasar.",
    target: "Coffe Toffe Pekanbaru",
    targetCat: "Kafe",
  },
  {
    initial: "D",
    who: "Dewi A.",
    action: "memperbarui jam buka",
    when: "5 jam lalu · Kec. Lima Puluh",
    status: "Terverifikasi",
    body: "Jam buka Coffe Toffe dikoreksi: sekarang tutup pukul 22.00, bukan 21.00. Terima kasih untuk laporannya.",
    target: "Coffe Toffe Pekanbaru",
    targetCat: "Kafe",
  },
  {
    initial: "B",
    who: "Bagas P.",
    action: "mengusulkan tempat baru",
    when: "Kemarin · Kec. Kulim",
    status: "Sedang diperiksa",
    body: "Danau Bandar Khayangan diajukan sebagai destinasi alam. Sedang diperiksa admin.",
    target: "Danau Bandar Khayangan",
    targetCat: "Alam",
  },
];

export function Community({
  cityName,
  provinceName,
  destinations,
  categoriesById,
  onOpenDestination,
  onOpenCityPicker,
  onOpenAuth,
  onOpenContribute,
}: CommunityProps) {
  const [sort, setSort] = useState<"terbaru" | "membantu" | "foto" | "kecamatan">("terbaru");
  const [subs, setSubs] = useState<Submission[]>(() => listSubmissions());
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    const sync = () => setSubs(listSubmissions());
    window.addEventListener("tapeta:submissions", sync);
    return () => window.removeEventListener("tapeta:submissions", sync);
  }, []);

  const findDestination = (name: string) =>
    destinations.find((item) => item.name.toLowerCase().includes(name.split(" ")[0].toLowerCase())) ?? null;

  // Aktivitas nyata = usulan lokal. Contoh dari desain hanya tampil bila diminta.
  const localFeed: FeedItem[] = subs.map((item) => ({
    initial: (item.submittedBy || "?").slice(0, 1).toUpperCase(),
    who: item.submittedBy,
    action: "mengusulkan tempat baru",
    when: `${formatSubmitted(item.submittedAt)} · ${item.regionName ? `Kec. ${item.regionName}` : "kecamatan belum terdeteksi"}`,
    status:
      item.status === "terbit"
        ? "Disetujui"
        : item.status === "ditolak"
          ? "Ditolak"
          : item.status === "perbaikan"
            ? "Perlu perbaikan"
            : "Sedang diperiksa",
    body: `${item.name} diajukan sebagai destinasi ${item.categoryId}${
      item.description ? ` — ${item.description}` : ""
    }. Usulan tersimpan lokal dan belum tampil di peta.`,
    target: null,
    targetCat: item.categoryId,
  }));

  const examples: FeedItem[] = FEED.map((item) => ({ ...item, target: item.target }));
  const feed = showExamples ? [...localFeed, ...examples] : localFeed;
  const sortedFeed =
    sort === "kecamatan" ? [...feed].sort((a, b) => a.when.localeCompare(b.when)) : feed;
  const board = showExamples ? CONTRIBUTORS : CONTRIBUTORS.filter((person) => person.count > 0);

  return (
    <div className="t-app t-app--doc">
      <DesainTopbar
        active="komunitas"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-doc">
        <div className="t-doc__head">
          <span className="t-doc__eyebrow">KOMUNITAS · {cityName.toUpperCase()}</span>
          <h1 className="t-doc__title">Cerita dari warga {cityName}</h1>
          <div className="t-doc__tabs" role="tablist" aria-label="Pilih urutan aktivitas">
            {(
              [
                ["terbaru", "Terbaru"],
                ["membantu", "Paling membantu"],
                ["foto", "Foto & cerita"],
                ["kecamatan", "Per kecamatan"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={sort === key}
                className={`t-doc__tab${sort === key ? " is-active" : ""}`}
                onClick={() => setSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="t-feed__notice">
            {sort === "membantu" || sort === "foto"
              ? "Urutan “"
              : ""}
            {sort === "membantu"
              ? "Paling membantu” memerlukan backend penilaian; sementara ditampilkan urutan terbaru."
              : sort === "foto"
                ? "Foto & cerita memerlukan backend unggahan; belum ada foto komunitas yang tersimpan."
                : ""}
          </p>
        </div>

        <div className="t-doc__grid">
          <div className="t-feed">
            {sortedFeed.length === 0 && (
              <div className="t-queueempty">
                <span className="t-queueempty__title">Belum ada cerita dari komunitas</span>
                <p className="t-queueempty__body">
                  Cerita muncul setelah ada usulan yang dikirim lewat alur kontribusi. Kamu bisa
                  memulai dengan mengusulkan tempat yang belum tercatat.
                </p>
                <div className="t-mine__actions">
                  <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={onOpenContribute}>
                    Usulkan tempat
                  </button>
                  <button type="button" className="t-notes__withdraw" onClick={() => setShowExamples(true)}>
                    Lihat contoh dari desain
                  </button>
                </div>
              </div>
            )}
            {sortedFeed.map((item, index) => {
              const target = item.target ? findDestination(item.target) : null;
              const category = target ? categoriesById.get(target.categoryId) : null;
              return (
                <article key={`${item.who}-${index}`} className="t-feed__card">
                  <header className="t-feed__head">
                    <span className="t-feed__avatar" aria-hidden="true">
                      {item.initial}
                    </span>
                    <span className="t-feed__who">
                      <span className="t-feed__name">
                        {item.who} <span className="t-feed__action">{item.action}</span>
                      </span>
                      <span className="t-feed__when">{item.when}</span>
                    </span>
                    <span
                      className={`t-feed__status${item.status === "Sedang diperiksa" ? " t-feed__status--wait" : ""}`}
                    >
                      {item.status}
                    </span>
                  </header>
                  <p className="t-feed__body">{item.body}</p>
                  <footer className="t-feed__foot">
                    <span className="t-feed__target">
                      {item.target}
                      <span className="t-feed__cat">{category?.shortName ?? item.targetCat}</span>
                    </span>
                    {target && (
                      <button
                        type="button"
                        className="t-feed__map"
                        onClick={() => onOpenDestination(target.id)}
                      >
                        Lihat di peta →
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
            <button
              type="button"
              className="t-feed__more"
              onClick={() => setShowExamples(true)}
              disabled={showExamples}
            >
              {showExamples ? "Semua aktivitas sudah dimuat" : "Muat contoh aktivitas lain"}
            </button>
          </div>

          <aside className="t-board">
            <div className="t-board__head">
              <span className="t-board__title">Papan kontributor</span>
              <span className="t-board__kicker">BULAN INI</span>
            </div>
            <ol className="t-board__list">
              {board.map((person, index) => (
                <li key={person.name} className="t-board__row">
                  <span className="t-board__rank">{person.count === 0 ? "" : index + 1}</span>
                  <span
                    className="t-board__avatar"
                    style={{ background: person.tint, color: person.ink }}
                    aria-hidden="true"
                  >
                    {person.initial}
                  </span>
                  <span className="t-board__name">{person.name}</span>
                  <span className="t-board__count">
                    {person.count === 0 ? (
                      <button type="button" className="t-board__join" onClick={onOpenAuth}>
                        Masuk untuk ikut
                      </button>
                    ) : (
                      `${person.count} tempat`
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className="t-board__note">
              Poin dan peringkatmu hanya terlihat setelah masuk.
            </p>
            <div className="t-badges">
              <span className="t-badges__title">Lencana</span>
              <div className="t-badges__row">
                {BADGES.map((badge) => (
                  <span key={badge.label} className="t-badges__item">
                    <span className="t-badges__icon" aria-hidden="true">{badge.icon}</span>
                    {badge.label}
                  </span>
                ))}
              </div>
              <span className="t-badges__note">Masuk untuk mulai mengumpulkan.</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export interface PerbaikanProps {
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onOpenContribute: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
}

const NOTES = [
  {
    icon: "!",
    title: "Alamat terlalu umum",
    body: "Tambahkan nama jalan atau patokan yang bisa dipakai pengunjung untuk menemukan tempatnya.",
  },
  {
    icon: "!",
    title: "Foto bukan milik sendiri",
    body: "Ganti dengan foto berlisensi, atau kosongkan saja. Usulan tetap bisa terbit tanpa foto.",
  },
];

export function Perbaikan({
  cityName,
  provinceName,
  destinations,
  categoriesById,
  onOpenContribute,
  onOpenCityPicker,
  onOpenDestination,
}: PerbaikanProps) {
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const featured = destinations[0] ?? null;
  const category = featured ? categoriesById.get(featured.categoryId) : null;
  return (
    <div className="t-app t-app--doc">
      <DesainTopbar
        active="my"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-doc t-doc--narrow">
        <div className="t-doc__head">
          <span className="t-doc__eyebrow">USULAN · 14 OKT 2026 · ID USR-2481</span>
          <h1 className="t-doc__title t-doc__title--xl">Usulanmu perlu sedikit perbaikan</h1>
          <p className="t-doc__lead">
            Admin sudah meninjau usulanmu dan menandai dua hal. Perbaiki lalu kirim ulang — kamu
            tidak perlu memulai dari awal.
          </p>
          <span className="t-pillstatus">
            <i aria-hidden="true" />
            Perlu perbaikan
          </span>
        </div>

        <section className="t-notes">
          <header className="t-notes__head">
            <span className="t-notes__avatar" aria-hidden="true">R</span>
            <span className="t-notes__who">
              <span className="t-notes__name">Catatan admin · Rani</span>
              <span className="t-notes__when">15 Oktober 2026 · 10.12</span>
            </span>
          </header>
          <div className="t-notes__list">
            {NOTES.map((note) => (
              <div key={note.title} className="t-notes__item">
                <span className="t-notes__icon" aria-hidden="true">{note.icon}</span>
                <span className="t-notes__text">
                  <span className="t-notes__title">{note.title}</span>
                  <span className="t-notes__body">{note.body}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="t-notes__actions">
            <button type="button" className="t-btn t-btn--brick t-notes__fix" onClick={onOpenContribute}>
              Perbaiki usulan
            </button>
            <button type="button" className="t-notes__withdraw" onClick={onOpenContribute}>
              Perbaiki &amp; kirim ulang
            </button>
          </div>
          <div className="t-notes__foot">
            <button
              type="button"
              className="t-notes__guide"
              onClick={() =>
                setNotice({
                  title: "Panduan kontribusi",
                  body: "Panduan lengkap pengusulan dan perbaikan tempat sedang disusun. Sementara ini, gunakan alur kontribusi untuk mengirim usulan baru atau perbaikan.",
                })
              }
            >
              Bingung cara memperbaiki? Baca panduan kontribusi →
            </button>
            <span className="t-notes__privacy">Data pribadi tidak pernah ditampilkan publik.</span>
          </div>
        </section>

        {featured && (
          <button
            type="button"
            className="t-summary"
            onClick={() => onOpenDestination(featured.id)}
          >
            <span className="t-summary__info">
              <span className="t-summary__name">{featured.name}</span>
              <span className="t-summary__meta">
                {category?.shortName ?? "Kafe"} · {featured.address}
              </span>
            </span>
            <span className="t-summary__id">
              <span className="t-summary__code">USR-2481</span>
              <span className="t-summary__when">Dikirim 14 Okt · 09.41</span>
            </span>
            <ChevronDownIcon size={14} className="t-summary__chev" />
          </button>
        )}
      </div>
      <NoticeDialog open={Boolean(notice)} title={notice?.title ?? ""} body={notice?.body ?? ""} onClose={() => setNotice(null)} />
    </div>
  );
}
