import { useEffect, useRef, useState } from "react";
import type { Category, Destination } from "../types";
import { supabase } from "../lib/supabase";
import { CATEGORY_COLORS } from "../data/categories";
import { MARKER_GLYPHS } from "../lib/markerIcon";
import {
  badgeForPublishedCount,
  communityStoryText,
  loadCommunityProfile,
  loadCommunityLeaderboard,
  loadCommunityStories,
  type CommunityContributor,
  type CommunityProfile,
  type CommunityStory,
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

type CommunityTab = "stories" | "contributors";

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
  const [stories, setStories] = useState<CommunityStory[]>([]);
  const [contributors, setContributors] = useState<CommunityContributor[]>([]);
  const [storyCityId, setStoryCityId] = useState(cityId);
  const [storiesLoading, setStoriesLoading] = useState(Boolean(supabase));
  const [contributorsLoading, setContributorsLoading] = useState(Boolean(supabase));
  const [storiesError, setStoriesError] = useState<string | null>(supabase ? null : "Komunitas belum terhubung ke server.");
  const [contributorsError, setContributorsError] = useState<string | null>(supabase ? null : "Papan kontributor belum terhubung ke server.");
  const [storiesRetry, setStoriesRetry] = useState(0);
  const [contributorsRetry, setContributorsRetry] = useState(0);
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

  const openStory = (destinationId: string) => onOpenDestination(destinationId);

  return (
    <div className="t-app t-app--doc t-community">
      <DesainTopbar active="komunitas" cityName={cityName} provinceName={provinceName} onOpenCityPicker={onOpenCityPicker} />

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
                <p>Ganti kota untuk membaca cerita warga setempat. Tempat hanya muncul setelah ditinjau admin.</p>
              </aside>
            </header>

            <div className="t-community__tabs" role="group" aria-label="Konten komunitas">
              <button type="button" aria-label="Cerita warga" aria-pressed={tab === "stories"} className={tab === "stories" ? "is-active" : ""} onClick={() => setTab("stories")}>
                Cerita warga <span aria-hidden="true">{visibleStories.length}</span>
              </button>
              <button type="button" aria-label="Kontributor" aria-pressed={tab === "contributors"} className={tab === "contributors" ? "is-active" : ""} onClick={() => setTab("contributors")}>
                Kontributor <span aria-hidden="true">{contributors.length}</span>
              </button>
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
            ) : (
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

  const badge = badgeForPublishedCount(profile.publishedCount);
  return (
    <section className="t-community__profile" aria-labelledby="t-community-profile-title">
      <button type="button" className="t-community__back" onClick={onBack}>‹ Kembali ke komunitas</button>
      <header className="t-community__profile-head">
        <span className="t-community__profile-avatar" aria-hidden="true">{initials(profile.displayName)}</span>
        <div>
          <h1 id="t-community-profile-title">{profile.displayName}</h1>
          <p>{profile.publishedCount} tempat diterbitkan</p>
        </div>
        {badge && <span className={badgeClass(badge.key)}>{badge.label}</span>}
      </header>
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
