import { useMemo, useState, type RefObject } from "react";
import type {
  Category,
  CategoryId,
  CityContext,
  Destination,
  RegionFeature,
  RegionStats,
} from "../types";
import { ChevronDownIcon, MapIcon } from "../components/Icons";
import { DesainTopbar } from "./Topbar";
import { statusLabel } from "../lib/geo";
import { MARKER_GLYPHS } from "../lib/markerIcon";
import { CATEGORY_COLORS as CAT_COLOR } from "../data/categories";
import { shareDestination } from "../lib/destinationLink";
import { OsmPlaceSearch } from "../components/OsmPlaceSearch";
import type { OsmLocation } from "../types";
import { SavePlaceButton } from "../components/SavePlaceButton";

const CAT_ORDER: CategoryId[] = ["kafe", "kuliner", "alam", "budaya", "rekreasi", "lainnya"];

const FEATURED_BG: Record<string, string> = {
  "asia-heritage": "#f4dfad",
  "danau-bandar-khayangan": "#cbdcbd",
  "masjid-raya-an-nur": "#f0c4a6",
  "taman-wisata-okura": "#e8c5c9",
  "rumah-singgah-tuan-kadi": "#cbdcbd",
  "perpustakaan-soeman-hs": "#f4dfad",
};

interface ExploreProps {
  city: CityContext | null;
  cityLoading: boolean;
  cityError: string | null;
  regionStats: RegionStats[];
  regions: RegionFeature[];
  destinations: Destination[];
  filteredDestinations: Destination[];
  categoriesById: Map<CategoryId, Category>;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  activeCategories: Set<CategoryId>;
  onToggleCategory: (category: CategoryId) => void;
  onResetCategories: () => void;
  selectedRegionCode: string | null;
  selectedDestinationId: string | null;
  regionNameByCode: Map<string, string>;
  onSelectRegion: (code: string) => void;
  onSelectDestination: (id: string, focusMap: boolean) => void;
  onClearSelection: () => void;
  onOpenCityPicker: () => void;
  onDismissCityError: () => void;
  onOpenHome: () => void;
  onOpenAtlas: () => void;
  onOpenContribute: () => void;
  osmLocation: OsmLocation | null;
  onSelectOsm: (place: OsmLocation) => void;
  onSuggestOsm: (place: OsmLocation) => void;
  children?: React.ReactNode;
}

type ViewTab = "peta" | "daftar" | "atlas";

export function ExploreDesktop(props: ExploreProps) {
  const {
    city,
    cityLoading,
    cityError,
    regionStats,
    destinations,
    filteredDestinations,
    regions,
    categoriesById,
    query,
    searchInputRef,
    onQueryChange,
    activeCategories,
    onToggleCategory,
    onResetCategories,
    selectedRegionCode,
    selectedDestinationId,
    onSelectRegion,
    onSelectDestination,
    onClearSelection,
    onOpenCityPicker,
    onDismissCityError,
    onOpenHome,
    onOpenAtlas,
    onOpenContribute,
  } = props;

  const [viewTab, setViewTab] = useState<ViewTab>("peta");
  const [kecFilter, setKecFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statsByCode = useMemo(
    () => new Map(regionStats.map((stats) => [stats.region.properties.code, stats])),
    [regionStats],
  );

  const catCount = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    for (const destination of destinations) {
      counts.set(destination.categoryId, (counts.get(destination.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [destinations]);

  const regionNameByDestination = useMemo(() => {
    const map = new Map<string, string>();
    for (const stats of regionStats) {
      for (const destination of stats.destinations) {
        map.set(destination.id, stats.region.properties.name);
      }
    }
    return map;
  }, [regionStats]);

  const list = useMemo(() => {
    const regionCode = selectedRegionCode ?? kecFilter;
    return filteredDestinations.filter((destination) => {
      if (regionCode && destination.regionCode !== regionCode) return false;
      if (statusFilter) {
        const status = statsByCode.get(destination.regionCode)?.status ?? "unexplored";
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [filteredDestinations, kecFilter, statusFilter, statsByCode, selectedRegionCode]);

  const explored = regionStats.filter((item) => item.status === "explored").length;
  const inProgress = regionStats.filter((item) => item.status === "in-progress").length;
  const unexplored = regionStats.length - explored - inProgress;

  const selectedRegionRaw = (() => {
    if (!selectedRegionCode) return null;
    const stats = statsByCode.get(selectedRegionCode);
    if (stats) return stats;
    const region = regions.find((item) => item.properties.code === selectedRegionCode);
    if (!region) return null;
    return {
      region,
      count: 0,
      status: "unexplored" as const,
      destinations: [] as Destination[],
    };
  })();
  const selectedDestination = selectedDestinationId
    ? destinations.find((item) => item.id === selectedDestinationId) ?? null
    : null;
  const selectedRegion = selectedDestination ? null : selectedRegionRaw;
  const featuredDestinations = useMemo(() => {
    const withSticker = destinations.filter((destination) => destination.sticker);
    return withSticker.slice(0, 8).map((destination) => ({
      slug: destination.sticker!.src.split("/").pop()!.replace(/\.png$/, ""),
      name: destination.name,
      bg: FEATURED_BG[destination.sticker!.src.split("/").pop()!.replace(/\.png$/, "")] ?? "#efe3cf",
      destination,
    }));
  }, [destinations]);

  const nearbyDestinations = useMemo(() => {
    if (!selectedDestination) return [];
    const haversineKm = (a: Destination, b: Destination) => {
      const rad = Math.PI / 180;
      const dLat = (b.lat - a.lat) * rad;
      const dLon = (b.lon - a.lon) * rad;
      const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.asin(Math.sqrt(h));
    };
    return destinations
      .filter((destination) => destination.id !== selectedDestination.id)
      .map((destination) => ({ destination, km: haversineKm(selectedDestination, destination) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 2);
  }, [destinations, selectedDestination]);

  return (
    <div className="t-app">
      <DesainTopbar
        active="explore"
        cityName={city?.name ?? (cityLoading ? "Memuat…" : "Pekanbaru")}
        provinceName={city?.province ?? city?.name ?? "Pekanbaru"}
        onOpenHome={onOpenHome}
        onOpenCityPicker={onOpenCityPicker}
        showCityPicker={false}
      />

      <div className={`t-app__main${selectedDestination ? " has-destination" : ""}`}>
        <aside className={`t-panel${selectedDestination || viewTab === "daftar" || selectedRegion ? " t-panel--wide" : ""}`} aria-label="Panel hasil">
          <div className="t-panel__scroll">
            {!selectedDestination && (
              <>
                <div className="t-coverage">
                  <span className="t-coverage__kicker">
                    PAKET ILUSTRASI · {regionStats.length} KECAMATAN
                  </span>
                  <h1 className="t-coverage__title">
                    {city ? `${city.name}, ${city.province}` : "Memuat wilayah"}
                  </h1>
                  <div className="t-coverage__stats">
                    <span className="t-statline">
                      <i className="t-statline__dot" style={{ background: "#5E7C64" }} />
                      {explored} selesai
                    </span>
                    <span className="t-statline">
                      <i className="t-statline__dot" style={{ background: "#b07d4f" }} />
                      {inProgress} mulai
                    </span>
                    <span className="t-statline">
                      <i className="t-statline__dot" style={{ background: "#786E5F" }} />
                      {unexplored} belum
                    </span>
                  </div>
                </div>

                <div className="t-pcount">
                  <h2 className="t-pcount__num">{destinations.length} destinasi</h2>
                  <span className="t-pcount__ctx">Terbit &amp; terverifikasi admin</span>
                  <div className="t-viewtabs" role="group" aria-label="Pilih tampilan">
                    <button
                      type="button"
                      aria-pressed={viewTab === "peta"}
                      className={viewTab === "peta" ? "is-active" : ""}
                      onClick={() => setViewTab("peta")}
                    >
                      <MapIcon size={13} />
                      Peta
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewTab === "daftar"}
                      className={viewTab === "daftar" ? "is-active" : ""}
                      onClick={() => setViewTab("daftar")}
                    >
                      Daftar
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewTab === "atlas"}
                      className={viewTab === "atlas" ? "is-active" : ""}
                      onClick={() => {
                        setViewTab("atlas");
                        onOpenAtlas();
                      }}
                    >
                      Atlas Stiker
                    </button>
                  </div>
                </div>

                <label className="t-search">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9ae97" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Cari destinasi, kecamatan, alamat…"
                    aria-label="Cari destinasi, kecamatan, alamat"
                  />
                  <span className="t-search__kbd" aria-hidden="true">⌘K</span>
                </label>

                <OsmPlaceSearch key={`${city?.relationId}:${query}`} city={city} query={query} cityName={city?.name ?? "Pekanbaru"} regions={regions} selected={props.osmLocation} onSelect={props.onSelectOsm} onSuggest={props.onSuggestOsm} />
                <div className="t-chips">
                  <div className="t-chips__row">
                    {CAT_ORDER.slice(0, 3).map((id) => (
                      <Chip key={id} id={id} count={catCount.get(id) ?? 0} active={activeCategories.has(id)} onToggle={onToggleCategory} />
                    ))}
                  </div>
                  <div className="t-chips__row">
                    {CAT_ORDER.slice(3).map((id) => (
                      <Chip
                        key={id}
                        id={id}
                        name={categoriesById.get(id)?.shortName}
                        count={catCount.get(id) ?? 0}
                        active={activeCategories.has(id)}
                        onToggle={onToggleCategory}
                      />
                    ))}
                  </div>
                </div>

                <div className="t-filters">
                  <label className="t-filter">
                    <select
                      value={kecFilter}
                      onChange={(event) => setKecFilter(event.target.value)}
                      aria-label="Filter kecamatan"
                    >
                      <option value="">Semua kecamatan</option>
                      {[...regionStats]
                        .sort((a, b) =>
                          a.region.properties.name.localeCompare(b.region.properties.name, "id"),
                        )
                        .map((stats) => (
                          <option key={stats.region.properties.code} value={stats.region.properties.code}>
                            {stats.region.properties.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="t-filter">
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      aria-label="Filter status wilayah"
                    >
                      <option value="">Semua status</option>
                      <option value="explored">Sudah dijelajahi</option>
                      <option value="in-progress">Sedang berjalan</option>
                      <option value="unexplored">Belum ada data</option>
                    </select>
                  </label>
                </div>

                <div className="t-list">
                  {destinations.length === 0 ? (
                    <p className="t-list__empty">
                      Batas kecamatan {(city?.name ?? "kota ini").toLowerCase()} sudah dimuat, katalog
                      destinasi belum tersedia.
                    </p>
                  ) : list.length === 0 ? (
                    <div className="t-list__emptywrap">
                      <p className="t-list__empty">Tidak ada yang cocok.</p>
                      {(query || activeCategories.size > 0 || kecFilter || statusFilter) && (
                        <button
                          type="button"
                          className="t-list__reset"
                          onClick={() => {
                            onQueryChange("");
                            onResetCategories();
                            setKecFilter("");
                            setStatusFilter("");
                          }}
                        >
                          Tampilkan semua destinasi
                        </button>
                      )}
                    </div>
                  ) : (
                    list.map((destination) => {
                      const category = categoriesById.get(destination.categoryId);
                      if (!category) return null;
                      const color = CAT_COLOR[destination.categoryId];
                      return (
                        <button
                          type="button"
                          key={destination.id}
                          className={`t-destrow${destination.id === selectedDestinationId ? " is-active" : ""}`}
                          onClick={() => onSelectDestination(destination.id, true)}
                        >
                          <span className="t-destrow__tile" style={{ background: `${color}26`, color }}>
                            <svg
  viewBox="0 0 24 24"
  width="19"
  height="19"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.7"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
  dangerouslySetInnerHTML={{ __html: MARKER_GLYPHS[destination.categoryId] }}
/>
                          </span>
                          <span className="t-destrow__info">
                            <span className="t-destrow__name">{destination.name}</span>
                            <span className="t-destrow__meta">
                              {category.shortName} ·{" "}
                              {regionNameByDestination.get(destination.id) ?? destination.regionCode}
                            </span>
                          </span>
                          <svg className="t-destrow__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b8f7e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m9 5 7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="t-pfoot">
                  {destinations.length > 0 && (
                    <button type="button" className="t-pfoot__all" onClick={() => onResetCategories()}>
                      Tampilkan semua {destinations.length} destinasi
                    </button>
                  )}
                  <button type="button" className="t-propose" onClick={onOpenContribute}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fdf9ef" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Usulkan tempat di {city?.name ?? "kota ini"}
                  </button>
                  <span className="t-pfoot__note">Butuh akun · diperiksa admin sebelum terbit</span>
                  {cityError && (
                    <p className="t-pfoot__alert" role="alert">
                      <span>{cityError}</span>
                      <button type="button" onClick={onDismissCityError}>
                        Tutup
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}


            {!selectedDestination && selectedRegion && (
              <div className="t-regioncard">
                <div className="t-regioncard__head">
                  <span className="t-regioncard__kicker">
                    KEC. {selectedRegion.region.properties.name.toUpperCase()} ·{" "}
                    {selectedRegion.region.properties.code}
                  </span>
                  <button
                    type="button"
                    className="t-regioncard__close"
                    onClick={onClearSelection}
                    aria-label="Tutup filter wilayah"
                  >
                    ×
                  </button>
                </div>
                <span className="t-regioncard__title">
                  {selectedRegion.count} destinasi · {statusLabel(selectedRegion.status)}
                </span>
                <button
                  type="button"
                  className="t-regioncard__link"
                  onClick={() => onSelectRegion(selectedRegion.region.properties.code)}
                >
                  Tampakkan wilayah di peta →
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className={`t-mapwrap${selectedDestination ? " t-mapwrap--solo" : ""}${viewTab === "daftar" && !selectedRegion && !selectedDestination ? " t-mapwrap--list" : ""}`}>
          {viewTab === "daftar" && !selectedRegion && !selectedDestination ? (
            <ListMainView
              city={city}
              destinations={destinations}
              categoriesById={categoriesById}
              regionNameByDestination={regionNameByDestination}
              selectedDestinationId={selectedDestinationId}
              onSelectDestination={(id) => onSelectDestination(id, false)}
            />
          ) : (
            <>
              <div className="t-mapstage">
                {props.children}
                {!selectedDestination && (
                  <button
                    type="button"
                    className="t-map-citypicker"
                    onClick={onOpenCityPicker}
                    aria-label={`Pilih kota: ${city?.name ?? "Pekanbaru"}, ${city?.province ?? "Riau"}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.3 4.5 8.5 4.5 8.5s4.5-5.2 4.5-8.5A4.5 4.5 0 0 0 8 1.5Zm0 2.8a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" />
                    </svg>
                    <span>{city?.name ?? "Pekanbaru"}</span>
                    <small>{city?.province ?? "Riau"}</small>
                    <ChevronDownIcon size={14} className="t-map-citypicker__chevron" />
                  </button>
                )}
            {selectedRegion && selectedRegion.count === 0 && !selectedDestination && (
              <div className="t-mapempty" role="status">
                <span className="t-mapempty__code">
                  KEC. {selectedRegion.region.properties.name.toUpperCase()} ·{" "}
                  {selectedRegion.region.properties.code}
                </span>
                <span className="t-mapempty__title">Belum ada tempat terverifikasi di area ini</span>
                <p className="t-mapempty__body">
                  Wilayah ini masih netral. Kalau kamu tahu tempatnya, usulkan supaya bisa diperiksa
                  admin TAPETA.
                </p>
                <div className="t-mapempty__actions">
                  <button
                    type="button"
                    className="t-btn t-btn--brick t-btn--brick-sm"
                    onClick={onOpenContribute}
                  >
                    Usulkan tempat pertama
                  </button>
                  <button type="button" className="t-mapempty__other" onClick={onClearSelection}>
                    Jelajahi kecamatan lain →
                  </button>
                </div>
                <span className="t-mapempty__status">
                  <i aria-hidden="true" />
                  Status: Belum ada data terverifikasi
                </span>
              </div>
            )}
          </div>
          <section className="t-featured" aria-label="Pilihan lokasi">
            <div className="t-featured__head">
              <span className="t-featured__title">Pilihan lokasi</span>
              <span className="t-featured__helper">
                Geser untuk menjelajah · pilih stiker untuk melihat peta
              </span>
            </div>
            <div className="t-featured__row">
              {featuredDestinations.map((item) => (
                <button
                  type="button"
                  key={item.destination.id}
                  className="t-fcard"
                  onClick={() => onSelectDestination(item.destination.id, true)}
                  title={`${item.name}, tampakkan di peta`}
                >
                  <span className="t-fcard__art" style={{ background: item.bg }}>
                    <img src={item.destination.sticker!.src} alt="" loading="lazy" />
                  </span>
                  <span className="t-fcard__name">{item.name}</span>
                  <span className="t-fcard__cat">{categoriesById.get(item.destination.categoryId)?.name ?? ""}</span>
                </button>
              ))}
              {!destinations.some((item) => item.sticker) && <p>Belum ada stiker destinasi yang diterbitkan untuk kota ini.</p>}
              </div>
            </section>
            </>
          )}
        </main>

        {selectedDestination && (
          <DestinationDetail
            destination={selectedDestination}
            categoryName={categoriesById.get(selectedDestination.categoryId)?.name ?? ""}
            categoryNameShort={categoriesById.get(selectedDestination.categoryId)?.shortName ?? ""}
            regionName={regionNameByDestination.get(selectedDestination.id) ?? selectedDestination.regionCode}
            cityName={city?.name ?? "Pekanbaru"}
            nearby={nearbyDestinations}
            categoryColor={CAT_COLOR[selectedDestination.categoryId]}
            onOpenContribute={onOpenContribute}
            onFocusMap={() => onSelectDestination(selectedDestination.id, true)}
            onSelectDestination={(id) => onSelectDestination(id, false)}
            onClose={onClearSelection}
          />
        )}
      </div>
    </div>
  );
}

function Chip({
  id,
  name,
  count,
  active,
  onToggle,
}: {
  id: CategoryId;
  name?: string;
  count: number;
  active: boolean;
  onToggle: (id: CategoryId) => void;
}) {
  const color = CAT_COLOR[id];
  return (
    <button
      type="button"
      className={`t-chip${active ? " is-active" : ""}`}
      onClick={() => onToggle(id)}
      aria-pressed={active}
    >
      <i className="t-chip__dot" style={{ background: color }} aria-hidden="true" />
      <span className="t-chip__name">{name ?? id}</span>
      <span className="t-chip__count">{count}</span>
    </button>
  );
}

const CARD_MEDIA_BG: Record<CategoryId, string> = {
  kafe: "#f3ddd6",
  kuliner: "#efd6cf",
  alam: "#dde6dc",
  budaya: "#dde1e9",
  rekreasi: "#e9d7dd",
  lainnya: "#e5e1d6",
};

function ListMainView({
  city,
  destinations,
  categoriesById,
  regionNameByDestination,
  selectedDestinationId,
  onSelectDestination,
}: {
  city: CityContext | null;
  destinations: Destination[];
  categoriesById: Map<CategoryId, Category>;
  regionNameByDestination: Map<string, string>;
  selectedDestinationId: string | null;
  onSelectDestination: (id: string) => void;
}) {
  const updated = useMemo(() => {
    if (destinations.length === 0) return "";
    return destinations
      .map((destination) => destination.updatedAt)
      .sort()
      .reverse()[0];
  }, [destinations]);
  const [visible, setVisible] = useState(4);
  const updatedLabel = useMemo(() => {
    if (!updated) return null;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" })
      .format(new Date(updated))
      .replace(" ?", "");
  }, [updated]);
  return (
    <div className="t-daftar" role="tabpanel">
      <div className="t-daftar__head">
        <div>
          <span className="t-daftar__eyebrow">
            {(city?.name ?? "Pekanbaru").toUpperCase()} · {(city?.province ?? "Riau").toUpperCase()} ·{" "}
            {destinations.length} DESTINASI
          </span>
          <h2 className="t-daftar__title">Daftar destinasi terverifikasi</h2>
          <p className="t-daftar__sub">
            Semua kecamatan · semua status{updatedLabel ? ` · diperbarui ${updatedLabel}` : ""}
          </p>
        </div>
        <label className="t-sortlist">
          <select defaultValue="baru" aria-label="Urutkan destinasi">
            <option value="baru">Urutkan: Terbaru</option>
            <option value="nama">Urutkan: Nama</option>
          </select>
        </label>
      </div>
      <div className="t-daftar__grid">
        {destinations.slice(0, visible).map((destination) => {
          const category = categoriesById.get(destination.categoryId);
          if (!category) return null;
          const color = CAT_COLOR[destination.categoryId];
          return (
            <button
              type="button"
              key={destination.id}
              className={`t-dcard${destination.id === selectedDestinationId ? " is-active" : ""}`}
              onClick={() => onSelectDestination(destination.id)}
            >
              <span className="t-dcard__media" style={{ background: CARD_MEDIA_BG[destination.categoryId] }}>
                <span className="t-dcard__mark" style={{ borderColor: color }}>
                  <i style={{ background: color }} />
                </span>
                <span className="t-dcard__note">Foto berlisensi belum tersedia</span>
              </span>
              <span className="t-dcard__body">
                <span className="t-dcard__labels">
                  <span className="t-dcard__cat">
                    <i style={{ background: color }} />
                    {category.shortName}
                  </span>
                  <span className="t-dcard__ver">Terverifikasi admin</span>
                </span>
                <span className="t-dcard__name">{destination.name}</span>
                <span className="t-dcard__loc">
                  Kec. {regionNameByDestination.get(destination.id) ?? destination.regionCode} ·{" "}
                  {city?.name ?? "Pekanbaru"}
                </span>
                <span className="t-dcard__foot">
                  <span>Diperbarui {formatShortDate(destination.updatedAt)}</span>
                  <span className="t-dcard__open">Lihat detail →</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {destinations.length > visible && (
        <div className="t-daftar__more">
          <span>
            Menampilkan {Math.min(visible, destinations.length)} dari {destinations.length} destinasi
          </span>
          <button
            type="button"
            className="t-daftar__morebtn"
            onClick={() => setVisible((count) => count + 8)}
          >
            Muat {Math.min(8, destinations.length - visible)} destinasi lainnya{" "}
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      )}
    </div>
  );
}

function formatShortDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function DestinationDetail({
  destination,
  categoryName,
  categoryNameShort,
  regionName,
  cityName,
  nearby,
  categoryColor,
  onFocusMap,
  onOpenContribute,
  onSelectDestination,
  onClose,
}: {
  destination: Destination;
  categoryName: string;
  categoryNameShort: string;
  regionName: string;
  cityName: string;
  nearby: { destination: Destination; km: number }[];
  categoryColor: string;
  onFocusMap: () => void;
  onOpenContribute: () => void;
  onSelectDestination: (id: string) => void;
  onClose: () => void;
}) {
  const coords = `${destination.lat.toFixed(4).replace(".", ",")}° LU · ${destination.lon
    .toFixed(4)
    .replace(".", ",")}° BT`;
  const updated =
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(destination.updatedAt),
    ) || "Belum tersedia";
  const verified = destination.publicationStatus === "published";
  const [shareMessage, setShareMessage] = useState("");
  return (
    <aside className="t-dpanel" aria-label={`Detail ${destination.name}`}>
      <div className="t-dpanel__head">
        <nav className="t-dpanel__crumb" aria-label="Posisi detail">
          <span>{cityName}</span>
          <span className="t-dpanel__sep" aria-hidden="true"> / </span>
          <span>{regionName}</span>
          <span className="t-dpanel__sep" aria-hidden="true"> / </span>
          <span className="t-dpanel__crumbcat">{categoryNameShort}</span>
        </nav>
        <button type="button" className="t-dpanel__close" onClick={onClose} aria-label="Tutup detail">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="t-dpanel__scroll">
        <div className="t-dpanel__labelrow">
          <span className="t-dpanel__catpill" style={{ background: `${categoryColor}26` }}>
            <i style={{ background: categoryColor }} />
            {categoryNameShort}
          </span>
          <span className="t-dpanel__verpill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#40604c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
            {verified ? "Terverifikasi admin" : "Menunggu moderasi"}
          </span>
        </div>
        <h2 className="t-dpanel__name">{destination.name}</h2>
        <p className="t-dpanel__addr">{destination.address}</p>
        <div className="t-dpanel__table">
          <Row k="Kategori" v={categoryName} muted={false} />
          <Row
            k="Jam buka"
            v={destination.openingHours.status === "verified" ? destination.openingHours.display : "Belum tersedia"}
            muted={destination.openingHours.status !== "verified"}
          />
          <Row k="Koordinat" v={coords} muted={false} />
          <Row
            k="Sumber"
            v={destination.source ? `${destination.source.label} · diverifikasi` : "Kontribusi komunitas · diverifikasi"}
            muted={false}
          />
          <Row k="Terakhir diperbarui" v={updated} muted={false} />
        </div>
        {destination.description && <p className="t-dpanel__desc">{destination.description}</p>}
        <div className="t-dpanel__actions">
          <SavePlaceButton target={{ destinationId: destination.id }} />
          <button type="button" className="t-btn t-btn--brick" onClick={onFocusMap}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fdf9ef" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m15.5 8.5-2 5-5 2 2-5Z" />
            </svg>
            Fokuskan di peta
          </button>
          <a
            className="t-dpanel__rute"
            href={`https://www.openstreetmap.org/directions?to=${destination.lat}%2C${destination.lon}`}
            target="_blank"
            rel="noreferrer"
            title="Buka rute di OpenStreetMap"
          >
            Lihat rute ↗
          </a>
        </div>
        <button type="button" className="t-dpanel__corr" onClick={onOpenContribute}>
          Usulkan koreksi informasi →
        </button>
        <button type="button" className="t-dpanel__corr" onClick={() => {
          void shareDestination(destination.id, destination.name).then(setShareMessage).catch(() => setShareMessage("Tautan belum bisa disalin. Salin alamat halaman dari peramban."));
        }}>Bagikan destinasi</button>
        {shareMessage && <p role="status">{shareMessage}</p>}
        {nearby.length > 0 && (
          <div className="t-dpanel__nearwrap">
            <div className="t-dpanel__nearhead">
              <span className="t-dpanel__neartitle">Tempat lain di sekitar</span>
              <button
                type="button"
                className="t-dpanel__nearall"
                onClick={() => onNextRegion(onSelectDestination, nearby)}
                title="Prototipe"
              >
                Lihat semua →
              </button>
            </div>
            {nearby.map(({ destination: other, km }) => (
              <button
                type="button"
                key={other.id}
                className="t-dpanel__near"
                onClick={() => onSelectDestination(other.id)}
              >
                <span className="t-dpanel__neardot" style={{ background: CAT_COLOR[other.categoryId] }} />
                <span className="t-dpanel__nearinfo">
                  <span className="t-dpanel__nearname">{other.name}</span>
                  <span className="t-dpanel__nearmeta">
                    {CATEGORY_SHORT[other.categoryId]} · {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`}
                  </span>
                </span>
                <span className="t-dpanel__neararr" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function onNextRegion(
  onSelectDestination: (id: string) => void,
  nearby: { destination: Destination; km: number }[],
) {
  if (nearby[0]) onSelectDestination(nearby[0].destination.id);
}

const CATEGORY_SHORT: Record<CategoryId, string> = {
  kafe: "Kafe",
  kuliner: "Kuliner",
  alam: "Alam",
  budaya: "Budaya",
  rekreasi: "Rekreasi",
  lainnya: "Lainnya",
};

function Row({ k, v, muted }: { k: string; v: string; muted: boolean }) {
  return (
    <div className="t-dpanel__row">
      <span className="t-dpanel__k">{k}</span>
      <span className={`t-dpanel__v${muted ? " t-dpanel__v--muted" : ""}`}>{v}</span>
    </div>
  );
}
