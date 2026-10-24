import { useEffect, useId, useRef, useState } from "react";
import type { Category, Destination } from "../types";
import { supabase } from "../lib/supabase";
import { CATEGORY_COLORS } from "../data/categories";
import { MARKER_GLYPHS } from "../lib/markerIcon";
import {
  badgeForVisitedCount,
  communityStoryText,
  loadCommunityProfile,
  loadCommunityLeaderboard,
  loadCommunityStories,
  loadCommunityVisitLeaderboard,
  type CommunityContributor,
  type CommunityProfile,
  type CommunityStory,
  type CommunityVisitLeaderboardEntry,
} from "../lib/community";
import { DesainTopbar } from "./Topbar";
import { useChrome } from "./ChromeContext";
import { SavePlaceButton } from "../components/SavePlaceButton";
import { VisitStories } from "../components/VisitStories";
import type { PersonalPlace } from "../lib/personal";

const GUIDE_SEEN_KEY = "tapeta:community-guide-dismissed:v1";

export interface CommunityProps {
  cityId: string;
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onBack: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
  onOpenAuth: () => void;
  onOpenContribute: () => void;
  onOpenPersonalPlace: (place: PersonalPlace) => Promise<void>;
}

type CommunityTab = "stories" | "contributors" | "leaderboard";
type LeaderboardScope = "local" | "national";

function readGuideSeen() {
  try {
    return window.localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    // The dialog remains dismissible if browser storage is unavailable.
  }
}

function shortDate(value: string | null) {
  if (!value) return "Tanggal belum tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}`.toUpperCase() : (parts[0]?.slice(0, 1) ?? "K").toUpperCase();
}

function badgeClass(key: string) {
  return `t-community__badge t-community__badge--${key}`;
}

const BADGE_LEVELS = [
  { key: "perintis", label: "Perintis", metal: "Perunggu", range: "1–4", first: 1 },
  { key: "penjelajah", label: "Penjelajah", metal: "Silver", range: "5–9", first: 5 },
  { key: "pemandu", label: "Pemandu", metal: "Gold", range: "10–14", first: 10 },
  { key: "pelopor", label: "Pelopor", metal: "Diamond", range: "15+", first: 15 },
] as const;

function BadgeMedal({ badge, large = false }: { badge: NonNullable<ReturnType<typeof badgeForVisitedCount>>; large?: boolean }) {
  const id = useId().replace(/:/g, "");
  const material = badge.key === "perintis" ? "bronze" : badge.key === "penjelajah" ? "silver" : badge.key === "pemandu" ? "gold" : "diamond";
  return (
    <span className={`t-community__badge-medal t-community__badge-medal--${material}${large ? " is-large" : ""}`} role="img" aria-label={`Lencana ${badge.label}, ${material}`}>
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--badge-light)" /><stop offset=".52" stopColor="var(--badge-main)" /><stop offset="1" stopColor="var(--badge-dark)" /></linearGradient>
          <linearGradient id={`${id}-field`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--badge-field)" /><stop offset="1" stopColor="var(--badge-main)" /></linearGradient>
        </defs>
        <path d="M21 75 12 96l19-5 9 16 13-21m18 0 13 21 9-16 19 5-9-21" fill={`url(#${id}-metal)`} stroke="var(--badge-outline)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M56 5 91 20l16 31-12 39-39 16-39-16L5 51l16-31Z" fill={`url(#${id}-metal)`} stroke="var(--badge-outline)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M56 13 85 26l13 26-10 31-32 14-32-14-10-31 13-26Z" fill={`url(#${id}-field)`} stroke="rgba(255,250,235,.9)" strokeWidth="2" />
        <path d="M25 67q15-13 31-5 16-8 31 5v14L56 93 25 81Z" fill="var(--badge-leaf)" opacity=".9" />
        <path d="M31 69q-10-2-11-13 10 0 15 8m46 5q10-2 11-13-10 0-15 8" fill="none" stroke="var(--badge-leaf)" strokeWidth="4" strokeLinecap="round" />
        {badge.key === "perintis" && <g><path d="M56 67V39m0 8Q40 47 38 31q16 0 18 14m0 2q15 0 18-16-16 0-18 14" fill="none" stroke="var(--badge-ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M38 69q18-9 36 0" fill="none" stroke="#f0d59a" strokeWidth="2" strokeLinecap="round"/></g>}
        {badge.key === "penjelajah" && <g><path d="m22 59 17-20 12 13 12-18 28 25" fill="var(--badge-peak)" stroke="var(--badge-ink)" strokeWidth="2.5" strokeLinejoin="round"/><path d="m34 46 5-7 5 6m14-3 5-8 6 8" fill="none" stroke="#fff8e8" strokeWidth="2"/><path d="M37 59h38m-31-1v13m24-13v13" stroke="var(--badge-ink)" strokeWidth="4"/><circle cx="44" cy="72" r="8" fill="none" stroke="var(--badge-ink)" strokeWidth="4"/><circle cx="68" cy="72" r="8" fill="none" stroke="var(--badge-ink)" strokeWidth="4"/><path d="M51 70h10" stroke="var(--badge-ink)" strokeWidth="4"/></g>}
        {badge.key === "pemandu" && <g><path d="M56 73V34" stroke="var(--badge-ink)" strokeWidth="5" strokeLinecap="round"/><path d="M57 38h30L78 48h9L74 59H57Z" fill="var(--badge-board)" stroke="var(--badge-ink)" strokeWidth="2.5" strokeLinejoin="round"/><path d="M56 54H27l9 9h-9l13 10h16Z" fill="var(--badge-board)" stroke="var(--badge-ink)" strokeWidth="2.5" strokeLinejoin="round"/><path d="M63 44h14M37 62h12" stroke="#fff5dd" strokeWidth="2" strokeLinecap="round"/></g>}
        {badge.key === "pelopor" && <g><path d="m25 69 16-18 10 11 13-25 25 32" fill="var(--badge-peak)" stroke="var(--badge-ink)" strokeWidth="3" strokeLinejoin="round"/><path d="m49 61 9-15 7 9-6-2-4 8" fill="#fff9eb"/><path d="M70 48V27" stroke="var(--badge-ink)" strokeWidth="3"/><path d="M71 28h19L80 37H71Z" fill="var(--badge-flag)" stroke="var(--badge-ink)" strokeWidth="2" strokeLinejoin="round"/><path d="M23 74h66" stroke="#fff4d9" strokeWidth="3" strokeLinecap="round"/></g>}
        <path d="m56 83 2.7 5.4 6 .9-4.4 4.2 1 6-5.3-2.9-5.3 2.9 1-6-4.4-4.2 6-.9Z" fill="#fff1c8" stroke="var(--badge-outline)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="t-community__badge-medal-label">{badge.label}</span>
    </span>
  );
}

function BadgeGallery() {
  return (
    <div className="t-community__badge-gallery" aria-label="Jenjang lencana kunjungan">
      {BADGE_LEVELS.map((level) => (
        <div key={level.key}>
          <BadgeMedal badge={badgeForVisitedCount(level.first)!} />
          <span>{level.range} kunjungan</span>
        </div>
      ))}
    </div>
  );
}

function StoryArtwork({ story, categoryName }: { story: CommunityStory; categoryName: string }) {
  const categoryId = story.categoryId as keyof typeof MARKER_GLYPHS;
  const glyph = MARKER_GLYPHS[categoryId] ?? MARKER_GLYPHS.lainnya;
  const categoryColor = CATEGORY_COLORS[categoryId] ?? CATEGORY_COLORS.lainnya;
  return (
    <div className="t-community__story-art">
      {story.stickerPath ? (
        <img src={story.stickerPath} alt={story.stickerAlt ?? ""} loading="lazy" />
      ) : (
        <span className="t-community__story-fallback" style={{ backgroundColor: `${categoryColor}22` }} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glyph }} />
        </span>
      )}
      <span className="t-community__story-category">{categoryName}</span>
    </div>
  );
}

export function Community({
  cityId,
  cityName,
  provinceName,
  categoriesById,
  onOpenCityPicker,
  onOpenDestination,
  onOpenAuth,
  onOpenContribute,
  onOpenPersonalPlace,
}: CommunityProps) {
  const { account } = useChrome();
  const [tab, setTab] = useState<CommunityTab>("stories");
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>("local");
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [contributors, setContributors] = useState<CommunityContributor[]>([]);
  const [visitLeaders, setVisitLeaders] = useState<CommunityVisitLeaderboardEntry[]>([]);
  const [visitLeaderboardCityId, setVisitLeaderboardCityId] = useState<string | null>(null);
  const [storyCityId, setStoryCityId] = useState(cityId);
  const [storiesLoading, setStoriesLoading] = useState(Boolean(supabase));
  const [contributorsLoading, setContributorsLoading] = useState(Boolean(supabase));
  const [visitLeadersLoading, setVisitLeadersLoading] = useState(Boolean(supabase));
  const [storiesError, setStoriesError] = useState<string | null>(supabase ? null : "Komunitas belum terhubung ke server.");
  const [contributorsError, setContributorsError] = useState<string | null>(supabase ? null : "Papan kontributor belum terhubung ke server.");
  const [visitLeadersError, setVisitLeadersError] = useState<string | null>(supabase ? null : "Leaderboard belum terhubung ke server.");
  const [storiesRetry, setStoriesRetry] = useState(0);
  const [contributorsRetry, setContributorsRetry] = useState(0);
  const [visitLeadersRetry, setVisitLeadersRetry] = useState(0);
  const [profileRetry, setProfileRetry] = useState(0);
  const [profileKey, setProfileKey] = useState<string | null>(null);
  const [profileState, setProfileState] = useState<{ key: string; profile: CommunityProfile | null; error: string | null } | null>(null);
  const [guideOpen, setGuideOpen] = useState(() => typeof window !== "undefined" && !readGuideSeen());
  const guideRef = useRef<HTMLDialogElement | null>(null);
  const guideTriggerRef = useRef<HTMLElement | null>(null);
  const guideButtonRef = useRef<HTMLButtonElement | null>(null);
  const visibleStories = storyCityId === cityId ? stories : [];
  const visibleStoriesLoading = storiesLoading || storyCityId !== cityId;
  const visibleStoriesError = storyCityId === cityId ? storiesError : null;
  const visibleVisitLeaders = leaderboardScope === "local" && visitLeaderboardCityId !== cityId ? [] : visitLeaders;
  const visibleVisitLeadersLoading = visitLeadersLoading || (leaderboardScope === "local" && visitLeaderboardCityId !== cityId);

  useEffect(() => {
    const dialog = guideRef.current;
    if (!dialog) return;
    if (guideOpen && !dialog.open) dialog.showModal();
    else if (!guideOpen && dialog.open) dialog.close();
  }, [guideOpen]);

  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };

    void loadCommunityStories(supabase, cityId)
      .then((rows) => { if (active) { setStories(rows); setStoryCityId(cityId); setStoriesError(null); } })
      .catch((cause) => { if (active) { setStoryCityId(cityId); setStoriesError(cause instanceof Error ? cause.message : "Cerita warga gagal dimuat."); } })
      .finally(() => { if (active) setStoriesLoading(false); });

    return () => { active = false; };
  }, [cityId, storiesRetry]);

  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    void loadCommunityLeaderboard(supabase)
      .then((rows) => { if (active) { setContributors(rows); setContributorsError(null); } })
      .catch((cause) => { if (active) setContributorsError(cause instanceof Error ? cause.message : "Papan kontributor gagal dimuat."); })
      .finally(() => { if (active) setContributorsLoading(false); });
    return () => { active = false; };
  }, [contributorsRetry]);
  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    void loadCommunityVisitLeaderboard(supabase, leaderboardScope === "local" ? cityId : null)
      .then((rows) => { if (active) { setVisitLeaders(rows); setVisitLeaderboardCityId(leaderboardScope === "local" ? cityId : null); setVisitLeadersError(null); } })
      .catch((cause) => { if (active) setVisitLeadersError(cause instanceof Error ? cause.message : "Leaderboard gagal dimuat."); })
      .finally(() => { if (active) setVisitLeadersLoading(false); });
    return () => { active = false; };
  }, [cityId, leaderboardScope, visitLeadersRetry]);
  useEffect(() => {
    if (!profileKey || !supabase) return;
    let active = true;
    void loadCommunityProfile(supabase, profileKey)
      .then((value) => { if (active) setProfileState({ key: profileKey, profile: value, error: null }); })
      .catch((cause) => { if (active) setProfileState({ key: profileKey, profile: null, error: cause instanceof Error ? cause.message : "Profil kontributor gagal dimuat." }); });
    return () => { active = false; };
  }, [profileKey, profileRetry]);

  const dismissGuide = () => {
    writeGuideSeen();
    setGuideOpen(false);
    window.setTimeout(() => (guideTriggerRef.current ?? guideButtonRef.current)?.focus(), 0);
  };

  const openGuide = () => {
    if (document.activeElement instanceof HTMLElement) guideTriggerRef.current = document.activeElement;
    setGuideOpen(true);
  };

  const startContribute = () => {
    dismissGuide();
    if (!account.signedIn) onOpenAuth();
    else onOpenContribute();
  };

  const retryStories = () => {
    setStoriesLoading(true);
    setStoriesError(null);
    setStoriesRetry((value) => value + 1);
  };

  const retryContributors = () => {
    setContributorsLoading(true);
    setContributorsError(null);
    setContributorsRetry((value) => value + 1);
  };
  const retryVisitLeaders = () => { setVisitLeadersLoading(true); setVisitLeadersError(null); setVisitLeadersRetry((value) => value + 1); };

  const openStory = (destinationId: string) => onOpenDestination(destinationId);

  return (
    <div className="t-app t-app--doc t-community">
      <DesainTopbar active="komunitas" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} showCityPicker={false} />

      <main className="t-community__main">
        {profileKey ? (
          <ContributorProfileView
            profile={profileState?.key === profileKey ? profileState.profile : null}
            loading={profileState?.key !== profileKey}
            error={profileState?.key === profileKey ? profileState.error : null}
            onBack={() => setProfileKey(null)}
            onRetry={() => setProfileRetry((value) => value + 1)}
            onOpenDestination={openStory}
            categoriesById={categoriesById}
          />
        ) : (
          <>
            <header className="t-community__hero">
              <div className="t-community__hero-copy">
                <h1 className="t-community__title">Cerita warga lokal</h1>
                <p className="t-community__lead">
                  Tempat yang diterbitkan warga, beserta catatan untuk membantu orang lain menemukannya.
                </p>
                <div className="t-community__actions">
                  <button type="button" className="t-btn t-btn--brick" onClick={() => account.signedIn ? onOpenContribute() : onOpenAuth()}>
                    Tambah kontribusi
                  </button>
                  <button type="button" className="t-community__guide-link" ref={guideButtonRef} onClick={openGuide}>
                    Panduan
                  </button>
                </div>
              </div>
              <aside className="t-community__note" aria-label="Tentang komunitas">
                <span className="t-community__note-mark" aria-hidden="true">T</span>
                <div className="t-community__note-body">
                  <button type="button" className="t-community__citypicker" onClick={onOpenCityPicker} aria-label={`Pilih kota: ${cityName}, ${provinceName}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    <span><strong>{cityName}</strong><small>{provinceName}</small></span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                  <p>Ganti kota untuk membaca cerita warga setempat. Tempat hanya muncul setelah ditinjau admin.</p>
                </div>
              </aside>
            </header>

            <div className="t-community__tabs" role="group" aria-label="Konten komunitas">
              <button type="button" aria-label="Cerita warga" aria-pressed={tab === "stories"} className={tab === "stories" ? "is-active" : ""} onClick={() => setTab("stories")}>
                Cerita warga <span aria-hidden="true">{visibleStories.length}</span>
              </button>
              <button type="button" aria-label="Kontributor" aria-pressed={tab === "contributors"} className={tab === "contributors" ? "is-active" : ""} onClick={() => setTab("contributors")}>
                Kontributor <span aria-hidden="true">{contributors.length}</span>
              </button>
              <button type="button" aria-label="Leaderboard" aria-pressed={tab === "leaderboard"} className={tab === "leaderboard" ? "is-active" : ""} onClick={() => setTab("leaderboard")}>Leaderboard</button>
            </div>

            {tab === "stories" ? (
              <section className="t-community__stories" aria-labelledby="t-community-stories-title">
                <VisitStories key={cityId} scope="public" cityId={cityId} onOpenPlace={onOpenPersonalPlace} />
                <div className="t-community__sectionhead">
                  <div>
                    <h2 id="t-community-stories-title">Tempat dari warga {cityName}</h2>
                    <p>Tempat yang sudah ditinjau dan diterbitkan.</p>
                  </div>
                </div>
                {visibleStoriesLoading ? (
                  <p className="t-community__state" role="status">Memuat cerita warga…</p>
                ) : visibleStoriesError ? (
                  <p className="t-community__state t-community__state--error" role="alert">
                    {visibleStoriesError} {supabase && <button type="button" onClick={retryStories}>Coba lagi</button>}
                  </p>
                ) : visibleStories.length === 0 ? (
                  <div className="t-community__empty">
                    <h3>Belum ada cerita warga</h3>
                    <p>Kontribusi yang sudah ditinjau dan diterbitkan akan muncul di sini. Mulai dengan mengusulkan tempat yang kamu kenal.</p>
                    <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={() => account.signedIn ? onOpenContribute() : onOpenAuth()}>
                      Usulkan tempat
                    </button>
                  </div>
                ) : (
                  <div className="t-community__storylist">
                    {visibleStories.map((story) => (
                      <article key={story.destinationId} className="t-community__story">
                        <StoryArtwork story={story} categoryName={categoriesById.get(story.categoryId)?.shortName ?? "Tempat"} />
                        <div className="t-community__story-body">
                          <div className="t-community__story-meta">
                            <span>{story.regionName || cityName}</span>
                            <span aria-hidden="true">·</span>
                            <span>Ditinjau {shortDate(story.reviewedAt ?? story.publishedAt)}</span>
                            <span className="t-community__published">Terbit</span>
                          </div>
                          <h3>{story.placeName}</h3>
                          <p className="t-community__story-copy">
                            {communityStoryText(story.description)}
                          </p>
                          <div className="t-community__story-foot">
                            <SavePlaceButton target={{ destinationId: story.destinationId }} />
                            {story.profileKey ? (
                              <button type="button" className="t-community__author" onClick={() => setProfileKey(story.profileKey)}>
                                {story.authorLabel}
                              </button>
                            ) : (
                              <span className="t-community__author">{story.authorLabel}</span>
                            )}
                            <button type="button" className="t-community__place-link" onClick={() => openStory(story.destinationId)}>
                              Buka tempat
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : tab === "contributors" ? (
              <section className="t-community__contributors" aria-labelledby="t-community-contributors-title">
                <div className="t-community__sectionhead">
                  <div>
                    <h2 id="t-community-contributors-title">Kontributor</h2>
                    <p>Papan ini mencakup semua akun yang pernah mengirim usulan. Nama mengikuti pilihan privasi masing-masing.</p>
                  </div>
                  <span className="t-community__leaderboard-label">Tempat terbit</span>
                </div>
                {contributorsLoading ? (
                  <p className="t-community__state" role="status">Memuat kontributor…</p>
                ) : contributorsError ? (
                  <p className="t-community__state t-community__state--error" role="alert">
                    {contributorsError} {supabase && <button type="button" onClick={retryContributors}>Coba lagi</button>}
                  </p>
                ) : contributors.length === 0 ? (
                  <div className="t-community__empty">
                    <h3>Belum ada kontributor</h3>
                    <p>Profil akan muncul setelah warga mengirim usulan pertama.</p>
                    <button type="button" className="t-btn t-btn--brick t-btn--brick-sm" onClick={() => account.signedIn ? onOpenContribute() : onOpenAuth()}>
                      Jadi kontributor
                    </button>
                  </div>
                ) : (
                  <ol className="t-community__leaderboard">
                    {contributors.map((person, index) => {
                      const row = (
                        <>
                          <span className="t-community__rank">{index + 1}</span>
                          <span className={`t-community__avatar${person.publicProfile ? " is-public" : ""}`} aria-hidden="true">
                            {person.publicProfile ? initials(person.displayLabel) : "·"}
                          </span>
                          <span className="t-community__person">
                            <span className="t-community__person-name">{person.displayLabel}</span>
                            <span className="t-community__person-sub">{person.publicProfile ? "Profil publik" : "Profil privat"}</span>
                          </span>
                          {person.badge && <span className={badgeClass(person.badge.key)}>{person.badge.label}</span>}
                          <span className="t-community__score">
                            <strong>{person.publishedCount}</strong>
                            <span>{person.publishedCount === 1 ? "tempat terbit" : "tempat terbit"}</span>
                          </span>
                          {person.publicProfile && <span className="t-community__chevron" aria-hidden="true">›</span>}
                        </>
                      );

                      return (
                        <li key={person.profileKey ?? `private-${index}`}>
                          {person.profileKey ? (
                            <button type="button" className="t-community__leader" onClick={() => setProfileKey(person.profileKey)}>
                              {row}
                            </button>
                          ) : (
                            <div className="t-community__leader is-private">{row}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            ) : (
              <section className="t-community__contributors" aria-labelledby="t-community-leaderboard-title">
                <div className="t-community__sectionhead"><div><h2 id="t-community-leaderboard-title">Leaderboard kunjungan</h2><p>Diurutkan dari tempat TAPETA yang sudah dikunjungi.</p></div></div>
                <div className="t-community__scope" role="group" aria-label="Cakupan leaderboard">
                  <button type="button" className={leaderboardScope === "local" ? "is-active" : ""} aria-pressed={leaderboardScope === "local"} onClick={() => { setVisitLeadersLoading(true); setLeaderboardScope("local"); }}>Lokal: {cityName}</button>
                  <button type="button" className={leaderboardScope === "national" ? "is-active" : ""} aria-pressed={leaderboardScope === "national"} onClick={() => { setVisitLeadersLoading(true); setLeaderboardScope("national"); }}>Seluruh Indonesia</button>
                </div>
                {visibleVisitLeadersLoading ? <p className="t-community__state" role="status">Memuat leaderboard…</p> : visitLeadersError ? <p className="t-community__state t-community__state--error" role="alert">{visitLeadersError} {supabase && <button type="button" onClick={retryVisitLeaders}>Coba lagi</button>}</p> : visibleVisitLeaders.length === 0 ? <div className="t-community__empty"><h3>Belum ada kunjungan yang dibagikan</h3><p>Tempat TAPETA yang ditandai sudah dikunjungi akan membentuk leaderboard di sini.</p><BadgeGallery /></div> : <ol className="t-community__leaderboard">{visibleVisitLeaders.map((person, index) => <li key={person.profileKey ?? `private-visit-${index}`}>{person.profileKey ? <button type="button" className="t-community__leader t-community__leader--visits" onClick={() => setProfileKey(person.profileKey)}><span className="t-community__rank">{index + 1}</span><span className="t-community__person"><span className="t-community__person-name">{person.displayLabel}</span><span className="t-community__person-sub">Profil publik</span></span>{person.badge && <span className="t-community__leader-badge"><BadgeMedal badge={person.badge} /></span>}<span className="t-community__score"><strong>{person.visitedCount}</strong><span>kunjungan</span></span></button> : <div className="t-community__leader t-community__leader--visits is-private"><span className="t-community__rank">{index + 1}</span><span className="t-community__person"><span className="t-community__person-name">Kontributor</span><span className="t-community__person-sub">Profil privat</span></span><span className="t-community__score"><strong>{person.visitedCount}</strong><span>kunjungan</span></span></div>}</li>)}</ol>}
              </section>
            )}
          </>
        )}
      </main>

      <dialog
        ref={guideRef}
        className="t-community-guide"
        aria-labelledby="t-community-guide-title"
        onCancel={(event) => { event.preventDefault(); dismissGuide(); }}
        onClick={(event) => { if (event.target === event.currentTarget) dismissGuide(); }}
      >
        <section className="t-community-guide__panel">
          <button type="button" className="t-community-guide__close" aria-label="Tutup panduan" onClick={dismissGuide}>×</button>
          <p className="t-community-guide__eyebrow">KONTRIBUSI TAPETA</p>
          <h2 id="t-community-guide-title">Cara berkontribusi</h2>
          <p className="t-community-guide__lead">Tempat yang kamu kenal bisa membantu warga lain menjelajahi kota.</p>
          <ol className="t-community-guide__steps">
            <li><strong>Tandai titiknya.</strong><span>Pilih lokasi yang tepat di peta.</span></li>
            <li><strong>Ceritakan tempatnya.</strong><span>Isi nama, alamat, kategori, dan sumber yang bisa diperiksa.</span></li>
            <li><strong>Kirim untuk ditinjau.</strong><span>Pantau keputusan dan catatan moderator di My TAPETA.</span></li>
          </ol>
          <button type="button" className="t-btn t-btn--brick t-community-guide__start" onClick={startContribute}>Mulai kontribusi</button>
        </section>
      </dialog>
    </div>
  );
}

function ContributorProfileView({
  profile,
  loading,
  error,
  onBack,
  onRetry,
  onOpenDestination,
  categoriesById,
}: {
  profile: CommunityProfile | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
  onOpenDestination: (id: string) => void;
  categoriesById: Map<string, Category>;
}) {
  if (loading) return <section className="t-community__profile"><button type="button" className="t-community__back" onClick={onBack}>Kembali ke komunitas</button><p role="status">Memuat profil…</p></section>;
  if (error) return <section className="t-community__profile"><button type="button" className="t-community__back" onClick={onBack}>Kembali ke komunitas</button><p role="alert">{error} <button type="button" onClick={onRetry}>Coba lagi</button></p></section>;
  if (!profile) return <section className="t-community__profile"><button type="button" className="t-community__back" onClick={onBack}>Kembali ke komunitas</button><p role="status">Profil ini tidak tersedia untuk publik.</p></section>;

  const badge = badgeForVisitedCount(profile.visitedCount);
  return (
    <section className="t-community__profile" aria-labelledby="t-community-profile-title">
      <button type="button" className="t-community__back" onClick={onBack}>‹ Kembali ke komunitas</button>
      <header className="t-community__profile-head">
        <span className="t-community__profile-avatar" aria-hidden="true">{initials(profile.displayName)}</span>
        <div>
          <h1 id="t-community-profile-title">{profile.displayName}</h1>
          <p>{profile.visitedCount} tempat dikunjungi · {profile.publishedCount} kontribusi terbit</p>
        </div>
        {badge && <BadgeMedal badge={badge} large />}
      </header>
      <section className="t-community__badge-section" aria-labelledby="t-community-badge-title">
        <div className="t-community__sectionhead"><div><h2 id="t-community-badge-title">Perjalanan lencana</h2><p>Level lencana bertambah saat kamu mengunjungi destinasi TAPETA.</p></div></div>
        <div className="t-community__badge-progression">
          {BADGE_LEVELS.map((level) => {
            const levelBadge = badgeForVisitedCount(level.first)!;
            const earned = profile.visitedCount >= level.first;
            return <article key={level.key} className={`t-community__badge-level${badge?.key === level.key ? " is-current" : ""}${earned ? " is-earned" : ""}`}>
              <BadgeMedal badge={levelBadge} large />
              <strong>{level.label}</strong><span>{level.metal}</span><small>{level.range} kunjungan</small>
            </article>;
          })}
        </div>
      </section>
      <div className="t-community__sectionhead t-community__visits-head">
        <div><h2>Tempat yang dikunjungi</h2><p>Destinasi TAPETA yang dibagikan ke komunitas.</p></div>
        <span className="t-community__visit-total">{profile.visitedCount} tempat</span>
      </div>
      {profile.visitedPlaces.length === 0 ? (
        <p className="t-community__state">Belum ada kunjungan yang dibagikan.</p>
      ) : (
        <div className="t-community__storylist t-community__visited-list">
          {profile.visitedPlaces.map((place) => (
            <article key={place.destinationId} className="t-community__story">
              <StoryArtwork story={place} categoryName={categoriesById.get(place.categoryId)?.shortName ?? "Tempat"} />
              <div className="t-community__story-body">
                <div className="t-community__story-meta"><span>{place.cityName}</span><span aria-hidden="true">·</span><span>Dikunjungi {shortDate(place.visitedOn ?? null)}</span></div>
                <h3>{place.placeName}</h3>
                <button type="button" className="t-community__place-link" onClick={() => onOpenDestination(place.destinationId)}>Buka tempat</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="t-community__sectionhead">
        <div>
          <h2>Kontribusi terbit</h2>
          <p>Tempat yang sudah ditinjau admin dan tampil di peta.</p>
        </div>
      </div>
      {profile.contributions.length === 0 ? (
        <p className="t-community__state">Belum ada kontribusi terbit.</p>
      ) : (
        <div className="t-community__storylist">
          {profile.contributions.map((place) => (
            <article key={place.destinationId} className="t-community__story">
              <StoryArtwork story={place} categoryName={categoriesById.get(place.categoryId)?.shortName ?? "Tempat"} />
              <div className="t-community__story-body">
                <div className="t-community__story-meta">
                  <span>{place.cityName}</span>
                  <span>Ditinjau {shortDate(place.reviewedAt ?? place.publishedAt)}</span>
                  <span className="t-community__published">Terbit</span>
                </div>
                <h3>{place.placeName}</h3>
                <p className="t-community__story-copy">{communityStoryText(place.description)}</p>
                <SavePlaceButton target={{ destinationId: place.destinationId }} />
                <button type="button" className="t-community__place-link" onClick={() => onOpenDestination(place.destinationId)}>Buka tempat</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
