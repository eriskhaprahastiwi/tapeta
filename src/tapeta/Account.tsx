import { useEffect, useState, type ReactNode } from "react";
import { readSession } from "../lib/session";
import type { Category, Destination } from "../types";
import { DesainTopbar } from "./Topbar";
import { AdminBar } from "./States";
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
import { PersonalPlaces, type PersonalSection } from "../components/PersonalPlaces";
import { EVENT_LABELS, loadTimeline, refreshPersonal, usePersonalPlaces, type PersonalEvent, type PersonalPlace } from "../lib/personal";
import { VisitStories } from "../components/VisitStories";
import { BadgeCheckIcon, BookmarkIcon, CheckCircleIcon, ClockIcon, FileTextIcon, FlagIcon, HomeIcon, ListIcon, MapIcon, PenIcon, SendIcon, StarIcon, UserIcon } from "../components/Icons";

const SECTION_META: Record<"wishlist" | "visited" | "timeline" | "kontribusi" | "disetujui", { title: string; description: string }> = {
  wishlist: { title: "Ingin dikunjungi", description: "Tempat yang ingin kamu kunjungi. Simpan dari Explore, pencarian OSM, atau Komunitas." },
  visited: { title: "Sudah dikunjungi", description: "Tempat yang sudah kamu kunjungi beserta tanggal dan ceritanya." },
  timeline: { title: "Linimasa", description: "Riwayat simpanan, kunjungan, usulan, dan cerita kunjunganmu di TAPETA." },
  kontribusi: { title: "Kontribusiku", description: "Usulan tempat yang kamu kirim ke TAPETA dan status tinjauannya." },
  disetujui: { title: "Disetujui", description: "Usulanmu yang sudah diverifikasi admin dan tampil di peta." },
};

const visitDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));

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
  onOpenPersonalPlace: (place: PersonalPlace) => Promise<void>;
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
  onOpenPersonalPlace,
}: MyTapetaProps) {
  const session = readSession();
  const [subs, setSubs] = useState<Submission[]>(() => listSubmissions());
  const [filter, setFilter] = useState<"semua" | SubmissionStatus>("semua");
  const [section, setSection] = useState<"dashboard" | "kontribusi" | "disetujui" | PersonalSection>("dashboard");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [retry, setRetry] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [revision, setRevision] = useState<Submission | null>(null);
  const personal = usePersonalPlaces();
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const uid = session?.id ?? null;

  useEffect(() => {
    if (!uid || section !== "dashboard") return;
    let active = true, generation = 0;
    const load = () => {
      const version = ++generation;
      setEventsLoading(true); setEventsError(null);
      void loadTimeline().then((rows) => {
        if (active && version === generation && readSession()?.id === uid) setEvents(rows);
      }).catch((cause) => {
        if (active && version === generation) setEventsError(cause instanceof Error ? cause.message : "Riwayat gagal dimuat.");
      }).finally(() => {
        if (active && version === generation) setEventsLoading(false);
      });
    };
    load(); window.addEventListener("tapeta:personal", load);
    return () => { active = false; window.removeEventListener("tapeta:personal", load); };
  }, [uid, section]);

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
  const displayName = session?.name ?? "Tamu";
  const wishlist = personal.places.filter((place) => place.saved && !place.visited_on);
  const visited = personal.places.filter((place) => place.visited_on);
  const isStaff = session?.role === "admin" || session?.role === "moderator";
  const accountMeta = session
    ? `Akun TAPETA sejak ${formatSubmitted(session.createdAt)} · ${cityName}${provinceName ? `, ${provinceName}` : ""}`
    : `Belum masuk · ${cityName}${provinceName ? `, ${provinceName}` : ""}`;
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: HomeIcon },
    { key: "wishlist", label: "Ingin dikunjungi", icon: BookmarkIcon },
    { key: "visited", label: "Sudah dikunjungi", icon: CheckCircleIcon },
    { key: "timeline", label: "Linimasa", icon: ClockIcon },
    { key: "kontribusi", label: "Kontribusiku", icon: PenIcon },
    { key: "disetujui", label: "Disetujui", icon: BadgeCheckIcon },
  ] as const;
  const go = (key: (typeof navItems)[number]["key"]) => {
    if (key === "kontribusi") { setSection("kontribusi"); setFilter("semua"); }
    else if (key === "disetujui") { setSection("disetujui"); setFilter("terbit"); }
    else setSection(key);
  };

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
          <span className="t-account__sidekicker">Ruang pribadi</span>
          <nav className="t-account__navlist" aria-label="Menu My TAPETA">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`t-account__nav${section === item.key ? " is-active" : ""}`}
                  aria-current={section === item.key ? "page" : undefined}
                  onClick={() => go(item.key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {isStaff && (
              <button type="button" className="t-account__nav" onClick={onOpenQueue}>
                <BadgeCheckIcon size={18} />
                <span>Antrean moderasi</span>
              </button>
            )}
          </nav>
          <div className="t-account__sidefoot">
            {session ? (
              <>
                <span className="t-account__sidefootlabel">Akun</span>
                <span className="t-account__sidefootmail">{session.email}</span>
              </>
            ) : (
              "Masuk untuk menyimpan tempat dan melihat kontribusi melalui akun TAPETA."
            )}
          </div>
        </aside>

        <main className="t-account__main">
          <div className="t-account__inner">
            <div className="t-account__mobiletabs" role="group" aria-label="Bagian My TAPETA">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`t-account__mobiletab${section === item.key ? " is-active" : ""}`}
                    aria-pressed={section === item.key}
                    onClick={() => go(item.key)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {isStaff && (
                <button type="button" className="t-account__mobiletab" aria-pressed={false} onClick={onOpenQueue}>
                  <BadgeCheckIcon size={16} />
                  <span>Antrean</span>
                </button>
              )}
            </div>

            {section === "dashboard" ? (
              <>
                <header className="t-account__head">
                  <div className="t-account__herotext">
                    <span className="t-account__hello">Selamat datang,</span>
                    <h1 className="t-account__name">{displayName}</h1>
                    <p className="t-account__meta">{accountMeta}</p>
                  </div>
                  <div className="t-account__heroactions">
                    {session ? (
                      <button type="button" className="t-account__edit" onClick={() => setProfileOpen(true)}>
                        <UserIcon size={16} />
                        Kelola profil
                      </button>
                    ) : (
                      <button type="button" className="t-account__edit" onClick={onOpenAuth}>Masuk</button>
                    )}
                  </div>
                  <div className="t-account__heroart" aria-hidden="true">
                    <span className="t-account__sun" />
                    <img src="/assets/map/pekanbaru-watercolor-hero.jpg" alt="" loading="lazy" />
                  </div>
                </header>

                <div className="t-account__stats">
                  <article className="t-statcard t-statcard--sent">
                    <span className="t-statcard__icon" aria-hidden="true"><SendIcon size={22} /></span>
                    <div className="t-statcard__text">
                      <span className="t-statcard__kicker">Usulan terkirim</span>
                      <span className="t-statcard__value">{counts.semua}</span>
                      <span className="t-statcard__sub">dikirim dari akunmu</span>
                    </div>
                  </article>
                  <article className="t-statcard t-statcard--pending">
                    <span className="t-statcard__icon" aria-hidden="true"><ClockIcon size={22} /></span>
                    <div className="t-statcard__text">
                      <span className="t-statcard__kicker">Menunggu tinjauan</span>
                      <span className="t-statcard__value">{counts.menunggu + counts.perbaikan}</span>
                      <span className="t-statcard__sub">belum tampil di peta</span>
                    </div>
                  </article>
                  <article className="t-statcard t-statcard--approved">
                    <span className="t-statcard__icon" aria-hidden="true"><StarIcon size={22} /></span>
                    <div className="t-statcard__text">
                      <span className="t-statcard__kicker">Disetujui</span>
                      <span className="t-statcard__value">{counts.terbit}</span>
                      <span className="t-statcard__sub">terverifikasi admin</span>
                    </div>
                  </article>
                </div>

                <div className="t-myhead">
                  <h2>Ruang pribadimu</h2>
                  <p>Lihat dan kelola daftar tempat yang ingin kamu kunjungi, sudah dikunjungi, dan kontribusimu di TAPETA.</p>
                </div>

                <div className="t-mygrid">
                  <MyCard tone="wishlist" title="Ingin dikunjungi" icon={<MapIcon size={18} />} onSeeAll={() => go("wishlist")}>
                    {!session ? (
                      <DashEmpty icon={<MapIcon size={22} />} title="Masuk untuk menyimpan" body="Simpan tempat dari Explore, pencarian OSM, atau Komunitas agar tersedia di perangkat mana pun." cta="Masuk" onClick={onOpenAuth} />
                    ) : personal.loading ? (
                      <p className="t-mycard__note" role="status">Memuat wishlist…</p>
                    ) : personal.error ? (
                      <p className="t-mycard__note" role="alert">{personal.error} <button type="button" className="t-mycard__retry" onClick={refreshPersonal}>Coba lagi</button></p>
                    ) : wishlist.length === 0 ? (
                      <DashEmpty icon={<MapIcon size={22} />} title="Wishlist masih kosong" body="Simpan tempat dari Explore, pencarian OSM, atau Komunitas untuk mulai merencanakan kunjungan." cta="Simpan tempat" href="#explore" plus />
                    ) : (
                      <ul className="t-mycard__preview">
                        {wishlist.slice(0, 3).map((place) => (
                          <li key={place.id}><strong>{place.name}</strong><span>{place.city_name}</span></li>
                        ))}
                      </ul>
                    )}
                  </MyCard>

                  <MyCard tone="visited" title="Sudah dikunjungi" icon={<FlagIcon size={18} />} onSeeAll={() => go("visited")}>
                    {!session ? (
                      <DashEmpty icon={<FlagIcon size={22} />} title="Masuk untuk mencatat kunjungan" body="Catat tempat yang sudah kamu kunjungi agar tersimpan sebagai riwayat pribadi." cta="Masuk" onClick={onOpenAuth} />
                    ) : personal.loading ? (
                      <p className="t-mycard__note" role="status">Memuat kunjungan…</p>
                    ) : personal.error ? (
                      <p className="t-mycard__note" role="alert">{personal.error} <button type="button" className="t-mycard__retry" onClick={refreshPersonal}>Coba lagi</button></p>
                    ) : visited.length === 0 ? (
                      <DashEmpty icon={<FlagIcon size={22} />} title="Belum ada kunjungan yang dicatat" body="Tandai tempat yang sudah kamu kunjungi untuk menyusun linimasa." cta={wishlist.length ? "Tandai kunjungan" : "Jelajahi tempat"} onClick={wishlist.length ? () => go("wishlist") : undefined} href={wishlist.length ? undefined : "#explore"} plus />
                    ) : (
                      <ul className="t-mycard__preview">
                        {visited.slice(0, 3).map((place) => (
                          <li key={place.id}><strong>{place.name}</strong><span>Dikunjungi {visitDate(place.visited_on!)}</span></li>
                        ))}
                      </ul>
                    )}
                  </MyCard>

                  <MyCard tone="timeline" title="Linimasa" icon={<ListIcon size={18} />} onSeeAll={() => go("timeline")}>
                    {!session ? (
                      <DashEmpty icon={<ListIcon size={22} />} title="Masuk untuk melihat linimasa" body="Riwayat simpanan dan kunjunganmu hanya terlihat olehmu setelah masuk." cta="Masuk" onClick={onOpenAuth} />
                    ) : eventsLoading ? (
                      <p className="t-mycard__note" role="status">Memuat linimasa…</p>
                    ) : eventsError ? (
                      <p className="t-mycard__note" role="alert">{eventsError} <button type="button" className="t-mycard__retry" onClick={refreshPersonal}>Coba lagi</button></p>
                    ) : events.length === 0 ? (
                      <DashEmpty icon={<ListIcon size={22} />} title="Belum ada aktivitas" body="Setelah kamu menyimpan tempat atau mencatat kunjungan, aktivitasmu akan muncul di sini." />
                    ) : (
                      <ul className="t-mycard__preview">
                        {events.slice(0, 2).map((event) => (
                          <li key={event.id}><strong>{EVENT_LABELS[event.kind] ?? "Aktivitas tempat"}</strong><span>{event.place_name}</span></li>
                        ))}
                      </ul>
                    )}
                  </MyCard>

                  <MyCard tone="contrib" title="Kontribusiku" icon={<FileTextIcon size={18} />} onSeeAll={() => go("kontribusi")}>
                    {loading ? (
                      <p className="t-mycard__note" role="status">Memuat kontribusi…</p>
                    ) : loadError ? (
                      <p className="t-mycard__note" role="alert">{loadError} <button type="button" className="t-mycard__retry" onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>
                    ) : subs.length === 0 ? (
                      <DashEmpty icon={<FileTextIcon size={22} />} title="Belum ada kontribusi" body="Usulkan destinasi baru untuk membantu memperkaya data di TAPETA." cta="Usulkan tempat" onClick={onOpenContribute} plus />
                    ) : (
                      <ul className="t-mycard__preview">
                        {subs.slice(0, 2).map((item) => (
                          <li key={item.id}>
                            <strong>{item.name}</strong>
                            <span className={`t-mycard__chip t-mycard__chip--${item.status === "perbaikan" ? "perlu-perbaikan" : item.status}`}>{STATUS_LABEL[item.status]}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </MyCard>
                </div>
              </>
            ) : (
              <>
                <header className="t-subhead">
                  <h1>{SECTION_META[section].title}</h1>
                  <p>{SECTION_META[section].description}</p>
                </header>
                {section === "wishlist" || section === "visited" || section === "timeline" ? (
                  <PersonalPlaces
                    key={`${session?.id ?? "guest"}:${section}`}
                    section={section}
                    onOpenPlace={onOpenPersonalPlace}
                    onOpenAuth={onOpenAuth}
                    onOpenWishlist={() => go("wishlist")}
                  />
                ) : (
                  <div className="t-mine" aria-label={section === "disetujui" ? "Destinasi disetujui" : "Kontribusiku"}>
                    <div className="t-mine__toolbar">
                      <div className="t-mine__tabs" role="group" aria-label="Filter kontribusi">
                        {tabs.map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            aria-pressed={filter === tab.key}
                            className={`t-mine__tab${filter === tab.key ? " is-active" : ""}`}
                            onClick={() => setFilter(tab.key)}
                          >
                            {tab.label}
                            <span className="t-mine__count">{tab.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {loading ? (
                      <p className="t-mine__note" role="status">Memuat kontribusi…</p>
                    ) : loadError ? (
                      <p className="t-mine__note" role="alert">{loadError} <button type="button" onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>
                    ) : visible.length === 0 ? (
                      <div className="t-personal__empty">
                        <span className="t-personal__emptymark" aria-hidden="true"><PenIcon size={22} /></span>
                        <strong>{subs.length === 0 ? "Belum ada usulan" : "Tidak ada usulan di filter ini"}</strong>
                        <p>
                          {subs.length === 0
                            ? (session ? (isBackendConfigured ? "Usulan akunmu akan muncul di sini setelah tersimpan di server." : "Backend belum dikonfigurasi; data usulan server belum tersedia.") : "Masuk untuk melihat dan mengelola usulan milik akunmu.")
                            : "Ganti filter untuk melihat usulan lain."}
                        </p>
                        <button type="button" className="t-personal__cta" onClick={subs.length === 0 ? onOpenContribute : () => setFilter("semua")}>
                          {subs.length === 0 ? "Usulkan tempat" : "Tampilkan semua"}
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
                              {item.status === "perbaikan" && <button type="button" className="t-auth__link" onClick={() => setRevision(item)}>Perbaiki usulan</button>}
                            </span>
                            <span className="t-mine__when">{formatSubmitted(item.submittedAt)}</span>
                            <span className={`t-mine__status t-mine__status--${item.status === "perbaikan" ? "perlu-perbaikan" : item.status}`}>
                              {STATUS_LABEL[item.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="t-mine__actions">
                      {visible.length > 0 && (
                        <button type="button" className="t-mine__all" onClick={onOpenContribute}>Usulkan tempat lain</button>
                      )}
                      {isStaff && (
                        <button type="button" className="t-mine__all" onClick={onOpenQueue}>Buka antrean moderasi</button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function MyCard({
  tone,
  title,
  icon,
  onSeeAll,
  children,
}: {
  tone: string;
  title: string;
  icon: ReactNode;
  onSeeAll: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`t-mycard t-mycard--${tone}`}>
      <header className="t-mycard__head">
        <span className="t-mycard__icon" aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
        <button type="button" className="t-mycard__see" onClick={onSeeAll}>Lihat semua</button>
      </header>
      <div className="t-mycard__body">{children}</div>
    </section>
  );
}

function DashEmpty({
  icon,
  title,
  body,
  cta,
  onClick,
  href,
  plus,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  cta?: string;
  onClick?: () => void;
  href?: string;
  plus?: boolean;
}) {
  return (
    <div className="t-myempty">
      {icon ? <span className="t-myempty__mark" aria-hidden="true">{icon}</span> : null}
      <strong className="t-myempty__title">{title}</strong>
      <p className="t-myempty__body">{body}</p>
      {cta ? href ? (
        <a className="t-myempty__cta" href={href}>{plus ? <span aria-hidden="true">+</span> : null}{cta}</a>
      ) : (
        <button type="button" className="t-myempty__cta" onClick={onClick}>{plus ? <span aria-hidden="true">+</span> : null}{cta}</button>
      ) : null}
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
}

export function AdminQueue({
  cityName,
  provinceName,
  onOpenCityPicker,
}: AdminQueueProps) {
  const [items, setItems] = useState<Submission[]>(() => listSubmissions("admin"));
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [queueFilter, setQueueFilter] = useState<"semua" | SubmissionStatus>("semua");
  const [deciding, setDeciding] = useState(false);
  const [note, setNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const refreshQueue = () => {
    setLoadError(null);
    setLoading(true);
    setRetry((value) => value + 1);
  };

  useEffect(() => {
    const sync = () => {
      const next = listSubmissions("admin");
      setItems(next);
      setActiveId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    };
    void loadSubmissions("admin").then(sync).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
    window.addEventListener("tapeta:submissions", sync);
    return () => window.removeEventListener("tapeta:submissions", sync);
  }, [retry]);

  const active = items.find((item) => item.id === activeId) ?? null;
  const filtered = queueFilter === "semua" ? items : items.filter((item) => item.status === queueFilter);
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
    <div className="t-app t-app--account">
      <DesainTopbar
        active="my"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <AdminBar active="antrean" />
      <div className="t-admin">
        <VisitStories scope="admin" />
        <div className="t-admin__head">
          <span className="t-admin__eyebrow">ANTREAN · KOTA {cityName.toUpperCase()}</span>
          <h1 className="t-admin__title">Antrean tinjauan</h1>
          <p className="t-admin__lead">
            Usulan warga yang menunggu keputusan. Setiap keputusan dicatat di riwayat moderasi dan
            dikirim sebagai notifikasi ke pengusul.
          </p>
          <div className="t-admin__queuecontrols">
            <div className="t-queuefilters" role="group" aria-label="Filter status usulan">
              {(["semua", "menunggu", "perbaikan", "terbit", "ditolak"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`t-queuefilter${queueFilter === key ? " is-active" : ""}`}
                  aria-pressed={queueFilter === key}
                  onClick={() => setQueueFilter(key)}
                >
                  {key === "semua" ? "Semua status" : STATUS_LABEL[key]}
                  <span className="t-queuefilter__count">
                    {key === "semua" ? items.length : items.filter((item) => item.status === key).length}
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="t-queue-refresh" onClick={refreshQueue} disabled={loading || deciding}>
              {loading ? "Memuat antrean…" : "Muat ulang antrean"}
            </button>
          </div>
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

        {loading ? (
          <p role="status">Memuat antrean…</p>
        ) : loadError ? (
          <p role="alert">{loadError} <button onClick={() => setRetry((value) => value + 1)}>Coba lagi</button></p>
        ) : items.length === 0 ? (
          <section className="t-queueempty" aria-label="Antrean kosong">
            <span className="t-queueempty__title">Belum ada usulan warga yang menunggu</span>
            <p className="t-queueempty__body">
              Antrean ini hanya berisi usulan dari alur kontribusi warga. Destinasi hasil import stiker
              tidak lewat sini; periksa di halaman Import &amp; stiker.
            </p>
            <div className="t-queueempty__actions">
              <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={() => { window.location.hash = "#admin-import"; }}>
                Buka import &amp; stiker
              </button>
              <button type="button" className="t-btn t-btn--ghost t-btn--brick-sm" onClick={() => { window.location.hash = "#admin-dash"; }}>
                Kembali ke ringkasan
              </button>
            </div>
          </section>
        ) : filtered.length === 0 ? (
          <section className="t-queueempty" aria-label="Tidak ada usulan pada filter">
            <span className="t-queueempty__title">Tidak ada usulan dengan status ini</span>
            <p className="t-queueempty__body">Ganti filter untuk melihat usulan lain.</p>
            <button type="button" className="t-btn t-btn--ghost t-btn--brick-sm" onClick={() => setQueueFilter("semua")}>
              Tampilkan semua status
            </button>
          </section>
        ) : (
          <div className="t-admin__grid">
            <section className="t-queue" aria-label="Antrean usulan">
              <div className="t-queue__thead">
                <span>TEMPAT / USULAN</span>
                <span>PENGUSUL</span>
                <span>MASUK</span>
                <span>STATUS</span>
              </div>
              {filtered.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  className={`t-queue__row t-queue__row--btn${row.id === activeId ? " is-active" : ""}`}
                  aria-pressed={row.id === activeId}
                  onClick={() => { setActiveId(row.id); setNote(""); }}
                >
                  <span className="t-queue__main">
                    <span className="t-queue__name">{row.name}</span>
                    <span className="t-queue__kind">
                      {row.categoryId} · {row.regionName || "kecamatan belum terdeteksi"}
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
                  <span className="t-review__code">{active.id.slice(0, 8)}</span>
                </div>
                <h2 className="t-review__name">{active.name}</h2>
                <p className="t-review__meta">
                  {active.categoryId} ·{" "}
                  {active.regionName ? `Kec. ${active.regionName}` : "kecamatan belum terdeteksi"}
                </p>
                <a
                  className="t-review__maplink"
                  href={`https://www.openstreetmap.org/?mlat=${active.lat}&mlon=${active.lon}#map=17/${active.lat}/${active.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Periksa titik di OpenStreetMap
                </a>
                <div className="t-review__table">
                  {[
                    ["Alamat", active.address || "Belum diisi"],
                    ["Jam buka", active.hours || "Tidak dicantumkan"],
                    ["Sumber", active.source || "Tidak dicantumkan"],
                    ["Koordinat", `${active.lat.toFixed(5)}, ${active.lon.toFixed(5)}`],
                    ["Pengusul", active.submittedBy],
                    ["Catatan", active.moderatorNote || "Belum ada"],
                  ].map(([label, value]) => (
                    <div key={label} className="t-review__row">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                <p className="t-review__desc">{active.description || "Tidak ada deskripsi."}</p>
                <div className="t-review__criteria">
                  <span className="t-review__crittitle">Periksa sebelum memutuskan</span>
                  <ul>
                    {CRITERIA.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <label className="t-review__notefield">
                  <span>Catatan untuk pengusul (wajib jika meminta perbaikan atau menolak)</span>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Tulis alasan yang bisa ditindaklanjuti"
                  />
                </label>
                <div className="t-review__actions">
                  <button type="button" className="t-review__publish" disabled={deciding || active.status !== "menunggu"} onClick={() => void decide("terbit")}>
                    {deciding ? "Menyimpan…" : "Terbitkan"}
                  </button>
                  <button type="button" className="t-review__fix" disabled={deciding || active.status !== "menunggu"} onClick={() => void decide("perbaikan")}>
                    Minta perbaikan
                  </button>
                  <button type="button" className="t-review__reject" disabled={deciding || active.status !== "menunggu"} onClick={() => void decide("ditolak")}>
                    Tolak usulan
                  </button>
                </div>
                {active.status !== "menunggu" && (
                  <p className="t-review__storage">Usulan ini sudah diputuskan ({STATUS_LABEL[active.status]}).</p>
                )}
              </aside>
            )}
          </div>
        )}

        <section className="t-admin__crosslink" aria-label="Tautan pengelolaan lain">
          <div>
            <span className="t-admin__crosslinktitle">Mencari destinasi hasil import stiker?</span>
            <p>Landmark hasil import OSM diverifikasi lewat halaman Import &amp; stiker, bukan antrean usulan warga.</p>
          </div>
          <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={() => { window.location.hash = "#admin-import"; }}>
            Buka import &amp; stiker
          </button>
        </section>
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
