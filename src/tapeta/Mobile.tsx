import { useMemo, useRef, useState } from "react";
import type { Category, CategoryId, CityContext, Destination, RegionFeature, RegionStats } from "../types";
import { CATEGORY_COLORS } from "../data/categories";
import { MARKER_GLYPHS } from "../lib/markerIcon";
import { MapView } from "../components/MapView";
import { TapetaLogo } from "../components/TapetaLogo";
import { ListIcon, MapIcon, PenIcon, PinIcon, SearchIcon, UserIcon } from "../components/Icons";
import { useChrome } from "./ChromeContext";
import { shareDestination } from "../lib/destinationLink";
import { OsmPlaceSearch } from "../components/OsmPlaceSearch";
import type { OsmLocation } from "../types";
import { SavePlaceButton } from "../components/SavePlaceButton";

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
  osmLocation: OsmLocation | null;
  onSelectOsm: (place: OsmLocation) => void;
  onSuggestOsm: (place: OsmLocation) => void;
}

export function MobileTapeta(props: MobileTapetaProps) {
  const selectedId = props.selectedDestinationId;
  const setSelectedId = props.onSelectDestination;
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(new Set());

  const { account, navigate } = useChrome();
  const cityName = props.city?.name ?? "Pekanbaru";
  const province = props.city?.province ?? "Riau";
  const selected = selectedId ? props.destinations.find((item) => item.id === selectedId) ?? null : null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return props.destinations;
    return props.destinations.filter(
      (destination) =>
        (activeCategories.size === 0 || activeCategories.has(destination.categoryId)) &&
        (destination.name.toLowerCase().includes(needle) ||
          destination.address.toLowerCase().includes(needle)),
    );
  }, [activeCategories, props.destinations, query]);

  const toggleCategory = (categoryId: CategoryId) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const openDetail = (id: string) => setSelectedId(id);

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
        onBack={props.onClearSelection}
        onOpen={(id) => setSelectedId(id)}
        onOpenContribute={props.onOpenContribute}
      />
    );
  }

  return (
    <div className="tm-shell tm-shell--map">
      <div className="tm-explore__top">
        <h1 className="visually-hidden">Jelajahi {cityName}</h1>
        <TapetaLogo size={34} wordmarkSize={22} tagline="PETA EKSPLORASI INDONESIA" onClick={props.onExitToIntro} />
        <span className="tm-explore__topactions">
          <button type="button" className="tm-explore__notification" onClick={account.onOpenNotifications} aria-label="Notifikasi" aria-expanded={account.notificationOpen}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </button>
          {account.signedIn ? (
            <button type="button" className="tm-explore__avatar" onClick={account.onOpenAccount} aria-label="Menu akun">
              {account.initials}
            </button>
          ) : (
            <button type="button" className="tm-explore__avatar tm-explore__avatar--masuk" onClick={account.onOpenAuth}>
              Masuk
            </button>
          )}
        </span>
      </div>
      <div className="tm-explore__map">
        <MapView
          cityBounds={props.city?.bounds}
          searchPoint={props.osmLocation}
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
        <button type="button" className="tm-explore__citypicker" onClick={props.onOpenCityPicker} aria-label={`Pilih kota: ${cityName}, ${province}`}>
          <PinIcon size={17} />
          <strong>{cityName}</strong>
          <span>{province}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <span className="tm-explore__status" aria-label={`${props.regionStats.filter((item) => item.status === "explored").length} sudah dijelajahi, ${props.regionStats.filter((item) => item.status === "in-progress").length} sedang dijelajahi, ${props.regionStats.filter((item) => item.status === "unexplored").length} belum dijelajahi`}>
          <i className="is-explored" />{props.regionStats.filter((item) => item.status === "explored").length}
          <i className="is-progress" />{props.regionStats.filter((item) => item.status === "in-progress").length}
          <i className="is-unexplored" />{props.regionStats.filter((item) => item.status === "unexplored").length}
        </span>
      </div>
      <section className="tm-sheet tm-sheet--paper" aria-label="Di sekitar">
        <span className="tm-sheet__handle" aria-hidden="true" />
        <div className="tm-sheet__head">
          <span>
            <span className="tm-sheet__eyebrow">DI SEKITAR {cityName.toUpperCase()}</span>
            <span className="tm-sheet__title">{props.destinations.length} destinasi</span>
          </span>
          <button type="button" className="tm-sheet__view" onClick={() => setListOpen((current) => !current)} aria-pressed={listOpen}>
            <ListIcon size={15} />
            {listOpen ? "Kartu" : "Daftar"}
          </button>
        </div>
        <div className="tm-sheet__searchrow">
          <label className="tm-explore__search">
            <SearchIcon size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari destinasi atau alamat…"
              aria-label="Cari destinasi"
            />
          </label>
          <button type="button" className="tm-sheet__filter" onClick={() => setFiltersOpen((current) => !current)} aria-label="Filter kategori" aria-expanded={filtersOpen}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="17" r="1.5" fill="currentColor" /></svg>
          </button>
        </div>
        {filtersOpen && (
          <div className="tm-sheet__filters" aria-label="Filter kategori">
            {(["kafe", "kuliner", "alam", "budaya", "rekreasi", "lainnya"] as CategoryId[]).map((categoryId) => (
              <button key={categoryId} type="button" aria-pressed={activeCategories.has(categoryId)} onClick={() => toggleCategory(categoryId)}>
                {props.categoriesById.get(categoryId)?.shortName ?? categoryId}
              </button>
            ))}
          </div>
        )}
        <div className="tm-sheet__results">
          {(query.trim().length >= 3 || props.osmLocation) && (
            <OsmPlaceSearch key={`${props.city?.relationId}:${query}`} city={props.city} query={query} cityName={cityName} regions={props.regions} selected={props.osmLocation} onSelect={props.onSelectOsm} onSuggest={props.onSuggestOsm} />
          )}
          {filtered.length === 0 && (
            <p className="tm-sheet__empty">
              Belum ada hasil. Coba pencarian lain atau{" "}
              <button type="button" className="tm-sheet__inlinelink" onClick={props.onOpenContribute}>
                usulkan tempat
              </button>
              .
            </p>
          )}
          {!listOpen && filtered.length > 0 && (
            <div className="tm-sheet__cards">
              {filtered.map((destination) => {
                const color = CATEGORY_COLORS[destination.categoryId];
                return (
                  <button key={destination.id} type="button" className="tm-sheet__card" onClick={() => openDetail(destination.id)}>
                    <span className="tm-sheet__art" style={{ background: `${color}26` }}>
                      {destination.sticker ? <img src={destination.sticker.src} alt="" /> : <span style={{ color }}><MapIcon size={24} /></span>}
                    </span>
                    <span className="tm-sheet__cardname">{destination.name}</span>
                    <span className="tm-sheet__cardmeta">{props.categoriesById.get(destination.categoryId)?.shortName ?? "Tempat"} · {props.regionNameByDestination.get(destination.id) ?? destination.regionCode}</span>
                  </button>
                );
              })}
            </div>
          )}
          {listOpen && filtered.map((destination) => {
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
      </section>
      <nav className="tm-bottomnav" aria-label="Navigasi utama">
        <button type="button" className="tm-bottomnav__link is-active" onClick={props.onClearSelection} aria-current="page"><MapIcon size={21} /><span>Explore</span></button>
        <button type="button" className="tm-bottomnav__link" onClick={props.onOpenContribute}><PenIcon size={21} /><span>Usulkan</span></button>
        <button type="button" className="tm-bottomnav__link" onClick={() => navigate("my")}><UserIcon size={21} /><span>My TAPETA</span></button>
        <button type="button" className="tm-bottomnav__link" onClick={() => navigate("komunitas")}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.8 20c.6-3.3 2.8-5.2 5.2-5.2s4.6 1.9 5.2 5.2M15 15.5c2.5.1 4.5 1.6 5.2 4.5" /></svg><span>Komunitas</span></button>
      </nav>
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
          <SavePlaceButton target={{ destinationId: destination.id }} />
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
