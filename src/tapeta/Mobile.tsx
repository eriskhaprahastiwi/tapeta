import { useMemo, useRef, useState } from "react";
import type { Category, CategoryId, CityContext, Destination, RegionFeature, RegionStats } from "../types";
import { CATEGORY_COLORS } from "../data/categories";
import { MARKER_GLYPHS } from "../lib/markerIcon";
import { MapView } from "../components/MapView";
import { TapetaLogo } from "../components/TapetaLogo";
import { useChrome } from "./ChromeContext";
import { shareDestination } from "../lib/destinationLink";

type MobileView = "home" | "explore" | "detail" | "my" | "komunitas" | "dash" | "admin" | "kota";

export interface MobileTapetaProps {
  selectedDestinationId: string | null;
  onSelectDestination: (id: string) => void;
  onClearSelection: () => void;
  city: CityContext | null;
  cityLoading: boolean;
  cityError: string | null;
  regions: RegionFeature[];
  regionStats: RegionStats[];
  destinations: Destination[];
  categoriesById: Map<CategoryId, Category>;
  regionNameByDestination: Map<string, string>;
  onOpenCityPicker: () => void;
  onOpenContribute: () => void;
  onExitToIntro: () => void;
  onRetry: () => void;
}

export function MobileTapeta(props: MobileTapetaProps) {
  const [view, setView] = useState<MobileView>("explore");
  const selectedId = props.selectedDestinationId;
  const setSelectedId = props.onSelectDestination;
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { account, navigate } = useChrome();
  const cityName = props.city?.name ?? "Pekanbaru";
  const province = props.city?.province ?? "Riau";
  const selected = selectedId ? props.destinations.find((item) => item.id === selectedId) ?? null : null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return props.destinations;
    return props.destinations.filter(
      (destination) =>
        destination.name.toLowerCase().includes(needle) ||
        destination.address.toLowerCase().includes(needle),
    );
  }, [props.destinations, query]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const tab = (key: MobileView) => {
    if (key === "my") return "my";
    if (key === "komunitas") return "komunitas";
    return "explore";
  };

  const nav = (
    <nav className="tm-nav" aria-label="Navigasi utama">
      {[
        { key: "explore" as MobileView, label: "Explore" },
        { key: "my" as MobileView, label: "My TAPETA" },
        { key: "komunitas" as MobileView, label: "Komunitas" },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          className={`tm-nav__link${tab(view) === item.key ? " is-active" : ""}`}
          onClick={() => item.key === "my" || item.key === "komunitas" ? navigate(item.key) : setView("explore")}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );

  if (selected) {
    return (
      <MobileDetail
        destination={selected}
        categoryName={props.categoriesById.get(selected.categoryId)?.shortName ?? "Tempat"}
        regionName={props.regionNameByDestination.get(selected.id) ?? selected.regionCode}
        destinations={props.destinations}
        regions={props.regions}
        regionStats={props.regionStats}
        categoriesById={props.categoriesById}
        onBack={() => { props.onClearSelection(); setView("explore"); }}
        onOpen={(id) => setSelectedId(id)}
        onOpenContribute={props.onOpenContribute}
      />
    );
  }

  if (view === "my") {
    return (
      <div className="tm-shell">
        <MobileHeader cityName={cityName} onCity={props.onOpenCityPicker} />
        {nav}
        <MobileMy onOpenContribute={props.onOpenContribute} />
        <MobileBottomNav active="my" onChange={setView} />
      </div>
    );
  }

  if (view === "komunitas") {
    return (
      <div className="tm-shell">
        <MobileHeader cityName={cityName} onCity={props.onOpenCityPicker} />
        {nav}
        <MobileCommunity onOpenContribute={props.onOpenContribute} />
        <MobileBottomNav active="komunitas" onChange={setView} />
      </div>
    );
  }

  if (view === "dash") {
    return (
      <div className="tm-shell">
        <MobileUserDash destinations={props.destinations} onOpen={openDetail} onOpenContribute={props.onOpenContribute} />
        <MobileBottomNav active="my" onChange={setView} />
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div className="tm-shell">
        <MobileAdminDash />
        <MobileBottomNav active="komunitas" onChange={setView} />
      </div>
    );
  }

  if (view === "kota") {
    return (
      <div className="tm-shell">
        <MobileKotaBaru onOpenContribute={props.onOpenContribute} />
        <MobileBottomNav active="explore" onChange={setView} />
      </div>
    );
  }

  if (view === "explore") {
    return (
      <div className="tm-shell tm-shell--map">
        <div className="tm-explore__top">
          <span className="tm-explore__brand">
            <TapetaLogo size={30} wordmarkSize={20} onClick={props.onExitToIntro} />
            <span>Jelajahi · {province}</span>
          </span>
          {account.signedIn ? (
            <button type="button" className="tm-explore__avatar" onClick={account.onOpenAccount} aria-label="Menu akun">
              {account.initials}
            </button>
          ) : (
            <button type="button" className="tm-explore__avatar tm-explore__avatar--masuk" onClick={account.onOpenAuth}>
              Masuk
            </button>
          )}
        </div>
        {nav}
        <label className="tm-explore__search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari destinasi, alamat…"
            aria-label="Cari destinasi"
          />
        </label>
        <span className="tm-explore__chip">
          {props.destinations.length} stiker di {cityName}
        </span>
        <div className="tm-explore__map">
          <MapView
            cityBounds={props.city?.bounds}
            regions={props.regions}
            regionStats={props.regionStats}
            destinations={filtered}
            categoriesById={props.categoriesById}
            cityName={cityName}
            selectedRegionId={null}
            selectedDestinationId={selectedId}
            userLocation={null}
            focus={null}
            resetNonce={0}
            isLoading={props.cityLoading}
            loadingLabel="Memuat peta"
            error={props.cityError}
            onRetry={props.onRetry}
            onSelectRegion={() => undefined}
            onSelectDestination={(id) => openDetail(id)}
            onClearSelection={() => undefined}
          />
        </div>
        <section className="tm-sheet" aria-label="Di sekitar">
          <span className="tm-sheet__handle" aria-hidden="true" />
          <div className="tm-sheet__head">
            <span className="tm-sheet__title">Di sekitar {cityName}</span>
            <span className="tm-sheet__count">{props.destinations.length} tempat</span>
          </div>
          <div className="tm-sheet__list">
            {filtered.length === 0 && <p style={{ color: "#f7f0e4" }}>Belum ada hasil. Coba pencarian lain atau <button className="tm-sheet__all" onClick={props.onOpenContribute}>usulkan tempat</button>.</p>}
            {(showAll ? filtered : filtered.slice(0, 4)).map((destination) => {
              const color = CATEGORY_COLORS[destination.categoryId];
              return (
                <button
                  key={destination.id}
                  type="button"
                  className="tm-sheet__row"
                  onClick={() => openDetail(destination.id)}
                >
                  <span className="tm-sheet__tile" style={{ background: `${color}26`, color }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="17"
                      height="17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: MARKER_GLYPHS[destination.categoryId] }}
                    />
                  </span>
                  <span className="tm-sheet__info">
                    <span className="tm-sheet__name">{destination.name}</span>
                    <span className="tm-sheet__meta">
                      {props.categoriesById.get(destination.categoryId)?.shortName ?? "Tempat"} ·{" "}
                      {props.regionNameByDestination.get(destination.id) ?? destination.regionCode}
                    </span>
                  </span>
                  <span className="tm-sheet__chev" aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="tm-sheet__all" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Ringkas daftar" : `Lihat semua ${filtered.length} destinasi`}
          </button>
        </section>
        <MobileBottomNav active="explore" onChange={setView} />
      </div>
    );
  }

  return (
    <div className="tm-shell">
      <MobileHome
        cityName={cityName}
        province={province}
        destinations={props.destinations}
        categories={[...props.categoriesById.values()]}
        onCity={props.onOpenCityPicker}
        onExplore={() => setView("explore")}
        onOpenContribute={props.onOpenContribute}
        onOpenDestination={openDetail}
        onExit={props.onExitToIntro}
        nav={nav}
      />
      <MobileBottomNav active="explore" onChange={setView} />
    </div>
  );
}

function MobileHeader({ cityName, onCity }: { cityName: string; onCity: () => void }) {
  const { account } = useChrome();
  return (
    <header className="tm-header">
      <TapetaLogo size={27} wordmarkSize={17} />
      <span className="tm-header__right">
        <button
          type="button"
          className="tm-header__notif"
          onClick={account.onOpenNotifications}
          aria-label="Notifikasi"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          {account.unreadCount > 0 && <i className="tm-header__dot" aria-hidden="true" />}
        </button>
        {account.signedIn ? (
          <button type="button" className="tm-header__avatar" onClick={account.onOpenAccount} aria-label="Menu akun">
            {account.initials}
          </button>
        ) : (
          <button type="button" className="tm-header__masuk" onClick={account.onOpenAuth}>
            Masuk
          </button>
        )}
        <button type="button" className="tm-header__city" onClick={onCity}>
          {cityName} <span aria-hidden="true">▾</span>
        </button>
      </span>
    </header>
  );
}

function MobileBottomNav({ active, onChange }: { active: "explore" | "my" | "komunitas"; onChange: (v: MobileView) => void }) {
  const { navigate } = useChrome();
  return (
    <nav className="tm-bottom" aria-label="Navigasi bawah">
      {[
        { key: "explore" as const, label: "Explore" },
        { key: "my" as const, label: "My TAPETA" },
        { key: "komunitas" as const, label: "Komunitas" },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          className={`tm-bottom__link${active === item.key ? " is-active" : ""}`}
          onClick={() => item.key === "explore" ? onChange("explore") : navigate(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function MobileHome({
  cityName,
  province,
  destinations,
  categories,
  onCity,
  onExplore,
  onOpenContribute,
  onOpenDestination,
  onExit,
  nav,
}: {
  cityName: string;
  province: string;
  destinations: Destination[];
  categories: Category[];
  onCity: () => void;
  onExplore: () => void;
  onOpenContribute: () => void;
  onOpenDestination: (id: string) => void;
  onExit: () => void;
  nav: React.ReactNode;
}) {
  const { account } = useChrome();
  return (
    <div className="tm-home">
      <div className="tm-home__top">
        <div className="tm-home__brandrow">
          <TapetaLogo size={30} wordmarkSize={23} onClick={onExit} />
          <span className="tm-home__brandright">
            <button type="button" className="tm-home__city" onClick={onCity}>
              {cityName}, {province} <span aria-hidden="true">▾</span>
            </button>
            {account.signedIn ? (
              <button type="button" className="tm-header__avatar" onClick={account.onOpenAccount} aria-label="Menu akun">
                {account.initials}
              </button>
            ) : (
              <button type="button" className="tm-header__masuk" onClick={account.onOpenAuth}>
                Masuk
              </button>
            )}
          </span>
        </div>
        {nav}
      </div>

      <section className="tm-home__hero">
        <span className="tm-home__kicker">TEMUKAN YANG DEKAT, CERITAKAN YANG BERMAKNA</span>
        <h1 className="tm-home__title">
          Temukan tempat,
          <br />
          Jelajahi peta
        </h1>
        <p className="tm-home__desc">
          Jelajahi destinasi lewat peta yang tumbuh dari pengetahuan lokal. Mulai dari {cityName}.
        </p>
        <button type="button" className="tm-home__cta" onClick={onExplore}>
          <span>Jelajahi peta</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <div className="tm-home__searchrow">
        <label className="tm-home__search">
          <span aria-hidden="true" className="tm-home__searchicon">⌕</span>
          <input type="search" placeholder="Cari tempat atau wilayah…" aria-label="Cari tempat" />
        </label>
        <button type="button" className="tm-home__filter" onClick={onExplore}>
          Filter
        </button>
      </div>

      <section className="tm-home__cats">
        <span className="tm-home__cathead">Jelajahi berdasarkan kategori</span>
        <div className="tm-home__catrows">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="tm-home__cat"
              onClick={onExplore}
            >
              <span
                className="tm-home__catdot"
                style={{ background: CATEGORY_COLORS[category.id] }}
                aria-hidden="true"
              />
              {category.id === "kuliner" ? "Makanan/minuman" : category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="tm-home__near">
        <div className="tm-home__nearhead">
          <span className="tm-home__cathead">Di sekitar {cityName}</span>
          <button type="button" className="tm-home__nearall" onClick={onExplore}>
            Lihat peta →
          </button>
        </div>
        {destinations.slice(0, 3).map((destination) => (
          <button
            key={destination.id}
            type="button"
            className="tm-home__nearrow"
            onClick={() => onOpenDestination(destination.id)}
          >
            <span className="tm-home__nearname">{destination.name}</span>
            <span className="tm-home__nearmeta">{destination.address.split(",")[0]}</span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </section>

      <section className="tm-home__community">
        <span className="tm-home__ckicker">KOMUNITAS TAPETA</span>
        <span className="tm-home__ctitle">Tahu tempat yang belum tercatat?</span>
        <p className="tm-home__cbody">
          Usulkan destinasi lokal. Tim TAPETA akan meninjau lokasi dan informasinya sebelum tampil
          untuk publik.
        </p>
        <button type="button" className="tm-home__cbtn" onClick={onOpenContribute}>
          Usulkan tempat <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className="tm-home__foot">
        <span className="tm-home__footbrand">TAPETA</span>
        <span className="tm-home__foottag">Temukan tempat, bagikan cerita.</span>
        <span className="tm-home__footattr">Peta © kontributor OpenStreetMap · ODbL</span>
      </footer>
    </div>
  );
}

function MobileDetail({
  destination,
  categoryName,
  regionName,
  destinations,
  regions,
  regionStats,
  categoriesById,
  onBack,
  onOpen,
  onOpenContribute,
}: {
  destination: Destination;
  categoryName: string;
  regionName: string;
  destinations: Destination[];
  regions: RegionFeature[];
  regionStats: RegionStats[];
  categoriesById: Map<CategoryId, Category>;
  onBack: () => void;
  onOpen: (id: string) => void;
  onOpenContribute: () => void;
}) {
  const mapSection = useRef<HTMLDivElement>(null);
  const [focusNonce, setFocusNonce] = useState(1);
  const [shareMessage, setShareMessage] = useState("");
  const share = () => { void shareDestination(destination.id, destination.name).then(setShareMessage).catch(() => setShareMessage("Salin tautan halaman melalui bilah alamat peramban.")); };
  const nearby = destinations
    .filter((item) => item.id !== destination.id && item.regionCode === destination.regionCode)
    .slice(0, 2);
  const coords = `${destination.lat.toFixed(4).replace(".", ",")}° LU · ${destination.lon
    .toFixed(4)
    .replace(".", ",")}° BT`;
  const updated = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(destination.updatedAt));
  return (
    <div className="tm-detail">
      <div className="tm-detail__media">
        <span className="tm-detail__mediacap">Foto berlisensi belum tersedia</span>
        <button type="button" className="tm-detail__icon" onClick={onBack} aria-label="Kembali">
          ‹
        </button>
        <button type="button" className="tm-detail__icon tm-detail__icon--right" aria-label="Bagikan" onClick={share}>
          ↗
        </button>
      </div>
      <div className="tm-detail__body">
        <span className="tm-detail__kicker">
          {categoryName.toUpperCase()} · KEC. {regionName.toUpperCase()}
        </span>
        <h1 className="tm-detail__name">{destination.name}</h1>
        <p className="tm-detail__addr">{destination.address}</p>
        <span className="tm-detail__verified">✓ Terverifikasi admin</span>
        <div className="tm-detail__actions">
          <button type="button" className="tm-detail__primary" onClick={() => { setFocusNonce((value) => value + 1); mapSection.current?.scrollIntoView({ block: "center" }); }}>Fokuskan</button>
          <a className="tm-detail__ghost" href={`https://www.openstreetmap.org/directions?to=${destination.lat}%2C${destination.lon}`} target="_blank" rel="noreferrer">Rute OSM</a>
          <button type="button" className="tm-detail__ghost" onClick={share}>Bagikan</button>
        </div>
        {shareMessage && <p role="status">{shareMessage}</p>}
        <div className="tm-detail__table">
          {[
            ["Jam buka", destination.openingHours.status === "verified" ? destination.openingHours.display : "Belum tersedia"],
            ["Koordinat", coords],
            ["Sumber", destination.source?.label ?? "Kontribusi komunitas · diverifikasi"],
            ["Diperbarui", updated],
          ].map(([key, value]) => (
            <div key={key} className="tm-detail__row">
              <span>{key}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="tm-detail__map" ref={mapSection}>
        <MapView
          regions={regions}
          regionStats={regionStats}
          destinations={[destination]}
          categoriesById={categoriesById}
          cityName={regionName}
          selectedRegionId={null}
          selectedDestinationId={destination.id}
          userLocation={null}
          focus={{ kind: "destination", id: destination.id, nonce: focusNonce }}
          resetNonce={0}
          isLoading={false}
          loadingLabel="Memuat"
          error={null}
          onRetry={() => undefined}
          onSelectRegion={() => undefined}
          onSelectDestination={() => undefined}
          onClearSelection={() => undefined}
        />
      </div>
      <div className="tm-detail__about">
        <span className="tm-detail__sectiontitle">Tentang tempat ini</span>
        <p>{destination.description ?? "Catatan tempat ini menyusul dari komunitas."}</p>
      </div>
      <div className="tm-detail__near">
        <span className="tm-detail__sectiontitle">Tempat lain di sekitar</span>
        {nearby.map((item) => (
          <button key={item.id} type="button" className="tm-detail__nearrow" onClick={() => onOpen(item.id)}>
            <span>{item.name}</span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <div className="tm-detail__foot">
        <button type="button" className="tm-detail__corr" onClick={onOpenContribute}>
          Usulkan koreksi
        </button>
        <span>Rute belum tersedia</span>
      </div>
    </div>
  );
}

function MobileMy({ onOpenContribute }: { onOpenContribute: () => void }) {
  return (
    <div className="tm-page">
      <span className="tm-page__kicker">RUANG PRIBADI</span>
      <h1 className="tm-page__title">My TAPETA</h1>
      <p className="tm-page__lead">
        Simpan perjalanan kontribusimu dan kelola preferensi akun dari satu tempat.
      </p>
      <section className="tm-card">
        <span className="tm-card__title">Profil kamu</span>
        <p className="tm-card__body">
          Kelola nama tampilan dan preferensi akun. Kontribusi dan status verifikasi tersimpan di
          sini.
        </p>
        <button type="button" className="tm-card__btn">Kelola profil</button>
      </section>
      <span className="tm-page__subtitle">Aktivitas akun</span>
      {[
        ["01", "Lacak status usulan tempat"],
        ["02", "Lihat kontribusi yang disetujui"],
        ["03", "Kelola nama tampilan dan privasi"],
      ].map(([num, label]) => (
        <div key={num} className="tm-row">
          <span className="tm-row__num">{num}</span>
          <span className="tm-row__label">{label}</span>
          <span aria-hidden="true">›</span>
        </div>
      ))}
      <p className="tm-page__note">
        Informasi profil dan kontribusi hanya dapat dilihat oleh pemilik akun.
      </p>
      <button type="button" className="tm-page__cta" onClick={onOpenContribute}>
        Usulkan tempat
      </button>
    </div>
  );
}

function MobileCommunity({ onOpenContribute }: { onOpenContribute: () => void }) {
  return (
    <div className="tm-page">
      <span className="tm-page__kicker">KOMUNITAS TAPETA</span>
      <h1 className="tm-page__title">Tempat dikenal lewat cerita lokal.</h1>
      <p className="tm-page__lead">
        Jelajahi kontribusi yang dipublikasikan dan bantu peta Indonesia tumbuh dengan data yang
        dapat dipercaya.
      </p>
      <section className="tm-community">
        <span className="tm-community__kicker">PUNYA REKOMENDASI LOKAL?</span>
        <span className="tm-community__title">Tambahkan tempat yang kamu tahu.</span>
        <p className="tm-community__body">
          Usulan akan ditinjau moderator. Hanya tempat yang disetujui yang tampil sebagai destinasi
          publik.
        </p>
        <button type="button" className="tm-community__btn" onClick={onOpenContribute}>
          Tambah kontribusi <span aria-hidden="true">→</span>
        </button>
      </section>
      <span className="tm-page__subtitle">Cara berkontribusi</span>
      {[
        ["01", "Pilih lokasi dan titik yang tepat"],
        ["02", "Lengkapi kategori dan sumber informasi"],
        ["03", "Tunggu verifikasi sebelum tampil publik"],
      ].map(([num, label]) => (
        <div key={num} className="tm-step">
          <span className="tm-step__num">{num}</span>
          <span className="tm-step__label">{label}</span>
        </div>
      ))}
      <p className="tm-page__note">
        Aktivitas kontributor hanya ditampilkan setelah dipublikasikan sesuai pilihan visibilitas
        mereka.
      </p>
    </div>
  );
}

function MobileUserDash({
  destinations,
  onOpen,
  onOpenContribute,
}: {
  destinations: Destination[];
  onOpen: (id: string) => void;
  onOpenContribute: () => void;
}) {
  const rows = destinations.slice(0, 3);
  return (
    <div className="tm-dash">
      <header className="tm-dash__top">
        <span className="tm-dash__brand">T</span>
        <span className="tm-dash__wordmark">TAPETA</span>
        <span className="tm-dash__nav">
          <span className="is-active">Explore</span>
          <span>My TAPETA</span>
          <span>Komunitas</span>
        </span>
      </header>
      <div className="tm-dash__body">
        <h1 className="tm-dash__hello">Halo, Rani 👋</h1>
        <p className="tm-dash__lead">
          Lihat progres kontribusi dan tempat yang sudah kamu bantu lengkapi.
        </p>
        <div className="tm-dash__grid">
          {[
            ["TEMPAT TERVERIFIKASI", "14", "dari 14 usulan", "dark"],
            ["SEDANG DITINJAU", "3", "biasanya 2–3 hari", "dark"],
            ["LENCANA", "2", "Penjelajah · Pewarta", "light"],
            ["POIN", "240", "60 lagi ke Pemandu", "light"],
          ].map(([kicker, value, sub, tone]) => (
            <div key={kicker} className={`tm-dashcard tm-dashcard--${tone}`}>
              <span className="tm-dashcard__kicker">{kicker}</span>
              <span className="tm-dashcard__value">{value}</span>
              <span className="tm-dashcard__sub">{sub}</span>
            </div>
          ))}
        </div>
        <div className="tm-dash__head">
          <span className="tm-dash__title">Kontribusiku</span>
          <button type="button" className="tm-dash__all">Lihat semua →</button>
        </div>
        {rows.map((destination, index) => (
          <button key={destination.id} type="button" className="tm-dashrow" onClick={() => onOpen(destination.id)}>
            <span className="tm-dashrow__info">
              <span className="tm-dashrow__name">{destination.name}</span>
              <span className="tm-dashrow__meta">
                {destination.address.split(",")[0]} · diajukan 14 Okt
              </span>
            </span>
            <span className={`tm-dashrow__status tm-dashrow__status--${index === 1 ? "fix" : index === 2 ? "pull" : "wait"}`}>
              {index === 1 ? "Perbaikan" : index === 2 ? "Ditarik" : "Diperiksa"}
            </span>
          </button>
        ))}
        <section className="tm-dash__cta">
          <span className="tm-dash__ctatitle">Bantu lengkapi peta lokal</span>
          <p className="tm-dash__ctabody">
            Temukan tempat yang belum tercatat dan bagikan ke komunitas.
          </p>
          <button type="button" className="tm-dash__ctabtn" onClick={onOpenContribute}>
            Usulkan tempat
          </button>
        </section>
        <p className="tm-page__note">
          Setiap usulan ditinjau sebelum tampil sebagai destinasi di peta.
        </p>
      </div>
    </div>
  );
}

function MobileAdminDash() {
  return (
    <div className="tm-dash">
      <header className="tm-dash__top tm-dash__top--admin">
        <span className="tm-dash__brand">T</span>
        <span className="tm-dash__wordmark">TAPETA Admin</span>
        <span className="tm-dash__nav">
          <span className="is-active">Ringkasan</span>
          <span>Tinjauan</span>
          <span>Kontributor</span>
          <span>Riwayat</span>
        </span>
      </header>
      <div className="tm-dash__body">
        <h1 className="tm-dash__hello">Ringkasan moderasi</h1>
        <span className="tm-dash__city">Pekanbaru · Riau</span>
        <div className="tm-dash__grid">
          {[
            ["MENUNGGU TINJAUAN", "42", "12 baru hari ini"],
            ["TERVERIFIKASI", "186", "18 hari ini"],
            ["PERLU PERBAIKAN", "9", "5 menunggu balasan"],
            ["KONTRIBUTOR AKTIF", "128", "+16 bulan ini"],
          ].map(([kicker, value, sub]) => (
            <div key={kicker} className="tm-dashcard tm-dashcard--light">
              <span className="tm-dashcard__kicker">{kicker}</span>
              <span className="tm-dashcard__value">{value}</span>
              <span className="tm-dashcard__sub">{sub}</span>
            </div>
          ))}
        </div>
        <div className="tm-dash__head">
          <span className="tm-dash__title">Antrean tinjauan</span>
          <button type="button" className="tm-dash__all">Lihat semua →</button>
        </div>
        {[
          ["Danau Bandar Khayangan", "Dewi A. · 3 foto · koordinat ada", "Tinjau"],
          ["Rumah Singgah Tuan Kadi", "Rani W. · sumber OSM", "Tinjau"],
          ["Pasar Bawah Pekanbaru", "Bagas P. · alamat belum lengkap", "Perbaikan"],
        ].map(([name, meta, status]) => (
          <div key={name} className="tm-dashrow tm-dashrow--static">
            <span className="tm-dashrow__info">
              <span className="tm-dashrow__name">{name}</span>
              <span className="tm-dashrow__meta">{meta}</span>
            </span>
            <span className={`tm-dashrow__status tm-dashrow__status--${status === "Tinjau" ? "wait" : "fix"}`}>
              {status}
            </span>
          </div>
        ))}
        <section className="tm-adminrekap">
          <span className="tm-adminrekap__title">Rekap kontributor · 30 hari</span>
          <span className="tm-adminrekap__value">128 aktif</span>
          <span className="tm-adminrekap__line">+16 kontributor baru</span>
          <span className="tm-adminrekap__line">84 tempat diusulkan · 62 terverifikasi</span>
        </section>
        <section className="tm-adminactivity">
          <span className="tm-adminactivity__title">Aktivitas hari ini</span>
          <span>18 diverifikasi · 5 perlu perbaikan · 2 ditolak</span>
        </section>
      </div>
    </div>
  );
}

function MobileKotaBaru({ onOpenContribute }: { onOpenContribute: () => void }) {
  return (
    <div className="tm-kota">
      <header className="tm-kota__head">
        <span className="tm-kota__brand">TAPETA</span>
        <span className="tm-kota__tagline">Peta cerita Indonesia</span>
        <span className="tm-kota__avatar" aria-hidden="true">E</span>
      </header>
      <div className="tm-kota__nav">
        <span className="is-active">Explore</span>
        <span>My TAPETA</span>
        <span>Komunitas</span>
      </div>
      <label className="tm-kota__search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Cari kota atau provinsi…" aria-label="Cari kota" />
      </label>
      <div className="tm-kota__map">
        <span className="tm-kota__badge">OPENSTREETMAP · PETA DASAR</span>
        <span className="tm-kota__empty">Belum ada stiker</span>
        <span className="tm-kota__area">AREA BELUM DIEKSPLORASI</span>
      </div>
      <section className="tm-kota__card">
        <span className="tm-kota__title">Kota berikutnya menunggu cerita.</span>
        <p className="tm-kota__body">
          Saat komunitas mulai menambahkan tempat, stiker akan muncul langsung di titik peta ini.
        </p>
        <button type="button" className="tm-kota__btn" onClick={onOpenContribute}>
          ＋ Usulkan destinasi pertama
        </button>
      </section>
      <p className="tm-kota__note">
        Peta OSM tetap tersedia · stiker muncul setelah destinasi diverifikasi
      </p>
    </div>
  );
}
