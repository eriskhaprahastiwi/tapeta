import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MapView, type MapFocus } from "./components/MapView";
import { CityPicker } from "./components/CityPicker";
import { EntryLocationPrompt } from "./components/EntryLocationPrompt";
import { CATEGORY_BY_ID } from "./data/categories";
import { buildRegionStats } from "./lib/geo";
import { useMediaQuery } from "./lib/useMediaQuery";
import { fetchDestinations, lookupCity, PEKANBARU_CITY, reverseCity } from "./lib/api";
import { destinationLink } from "./lib/destinationLink";
import { loadCityContext } from "./lib/city";
import { readSavedCityMeta, saveCityMeta } from "./lib/cityCache";
import type {
  CategoryId,
  CityContext,
  CityMeta,
  Destination,
  RegionFeature,
  UserLocation,
  OsmLocation,
} from "./types";
import { AtlasView } from "./components/atlas/AtlasView";
import { PenFrames } from "./components/PenFrames";
import { IntroDesktop, IntroMobile } from "./tapeta/Intro";
import { ExploreDesktop } from "./tapeta/Explore";
import { Contribute } from "./tapeta/Contribute";
import { Perbaikan } from "./tapeta/Docs";
import { Community } from "./tapeta/Community";
import { AdminQueue, KotaBaru, MyTapeta } from "./tapeta/Account";
import { AdminDash, AdminImport, AdminReports, States } from "./tapeta/States";
import { MobileTapeta } from "./tapeta/Mobile";
import { AccountLayer, type AccountLayerState } from "./tapeta/AccountLayer";
import { ChromeContext } from "./tapeta/ChromeContext";
import { SubmissionResult } from "./tapeta/SubmissionResult";
import { placeSourceLabel, type PersonalPlace } from "./lib/personal";

const EMPTY_REGIONS: RegionFeature[] = [];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toCityMeta(city: CityContext): CityMeta {
  return {
    relationId: city.relationId,
    name: city.name,
    type: city.type,
    province: city.province,
    bounds: city.bounds,
  };
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

export default function App() {
  const [view, setCurrentView] = useState<
    | "intro"
    | "app"
    | "atlas"
    | "design"
    | "contribute"
    | "komunitas"
    | "perbaikan"
    | "my"
    | "admin"
    | "kotabaru"
    | "adminDash"
    | "adminContributors"
    | "adminHistory"
    | "adminImport"
    | "states"
    | "contributeDone"
  >(() => {
    const hash = window.location.hash;
    if (hash === "#explore") return "app";
    if (hash === "#atlas") return "atlas";
    if (hash === "#design") return "design";
    if (hash === "#contribute") return "contribute";
    if (hash === "#komunitas") return "komunitas";
    if (hash === "#perbaikan") return "perbaikan";
    if (hash === "#my") return "my";
    if (hash === "#admin") return "admin";
    if (hash === "#kotabaru") return "kotabaru";
    if (hash === "#admin-dash") return "adminDash";
    if (hash === "#admin-contributors") return "adminContributors";
    if (hash === "#admin-history") return "adminHistory";
    if (hash === "#admin-import") return "adminImport";
    if (hash === "#states") return "states";
    return "intro";
  });
  const setView = useCallback((next: typeof view) => {
    const hashes: Record<typeof view, string> = {
      intro: "", app: "#explore", atlas: "#atlas", design: "#design", contribute: "#contribute",
      komunitas: "#komunitas", perbaikan: "#perbaikan", my: "#my", admin: "#admin", kotabaru: "#kotabaru",
      adminDash: "#admin-dash", adminContributors: "#admin-contributors", adminHistory: "#admin-history", adminImport: "#admin-import",
      states: "#states", contributeDone: "#contribute-done",
    };
    if (window.location.hash !== hashes[next]) window.history.pushState(null, "", window.location.pathname + window.location.search + hashes[next]);
    setCurrentView(next);
  }, []);
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash;
      const map: Record<string, typeof view> = {
        "": "intro",
        "#explore": "app",
        "#atlas": "atlas",
        "#design": "design",
        "#contribute": "contribute",
        "#komunitas": "komunitas",
        "#perbaikan": "perbaikan",
        "#my": "my",
        "#admin": "admin",
        "#kotabaru": "kotabaru",
        "#admin-dash": "adminDash",
        "#admin-contributors": "adminContributors",
        "#admin-history": "adminHistory",
        "#admin-import": "adminImport",
        "#states": "states",
        "#contribute-done": "contributeDone",
      };
      setView(map[hash] ?? "app");
    }
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [setView]);

  const [city, setCity] = useState<CityContext | null>(null);
  const [cityLoading, setCityLoading] = useState(true);
  const [cityError, setCityError] = useState<string | null>(null);
  const [pendingCityName, setPendingCityName] = useState<string | null>(null);

  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [query, setQuery] = useState("");
  const [osmSelection, setOsmSelection] = useState<{ cityId: number; place: OsmLocation } | null>(null);
  const [contributionPlace, setContributionPlace] = useState<OsmLocation | null>(null);
  const deferredQuery = useDeferredValue(query);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(new Set());
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [resetNonce] = useState(0);
  const focusNonceRef = useRef(0);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [entryLocationOpen, setEntryLocationOpen] = useState(false);
  const [entryCitySelection, setEntryCitySelection] = useState(false);
  const [entryContribution, setEntryContribution] = useState(false);
  const [unscopedMap, setUnscopedMap] = useState(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [detectingCity, setDetectingCity] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isMobile = useMediaQuery("(max-width: 860px)");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const cityAbortRef = useRef<AbortController | null>(null);
  const cityRequestRef = useRef(0);
  const cityRef = useRef<CityContext | null>(null);

  useEffect(() => {
    cityRef.current = city;
  }, [city]);

  const regions = city?.regions ?? EMPTY_REGIONS;

  const regionStats = useMemo(
    () => buildRegionStats(regions, destinations),
    [regions, destinations],
  );

  const regionNameByCode = useMemo(
    () => new Map(regions.map((region) => [region.properties.code, region.properties.name])),
    [regions],
  );

  const regionByDestinationId = useMemo(() => {
    const map = new Map<string, RegionFeature>();
    for (const stats of regionStats) {
      for (const destination of stats.destinations) {
        map.set(destination.id, stats.region);
      }
    }
    return map;
  }, [regionStats]);

  const filteredDestinations = useMemo(() => {
    const terms = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return destinations.filter((destination) => {
      if (activeCategories.size > 0 && !activeCategories.has(destination.categoryId)) {
        return false;
      }
      if (terms.length === 0) return true;
      const category = CATEGORY_BY_ID.get(destination.categoryId);
      const haystack = [
        destination.name,
        destination.address,
        destination.description ?? "",
        category?.name ?? "",
        category?.shortName ?? "",
        regionNameByCode.get(destination.regionCode) ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [destinations, activeCategories, deferredQuery, regionNameByCode]);

  const clearSelection = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("destination");
    window.history.replaceState(null, "", url);
    setSelectedDestinationId(null);
    setSelectedRegionCode(null);
  }, []);

  const loadCity = useCallback(
    async (meta: CityMeta, externalSignal?: AbortSignal): Promise<CityContext | null> => {
      cityAbortRef.current?.abort();
      const controller = new AbortController();
      cityAbortRef.current = controller;

      const handleExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
      }

      const requestId = ++cityRequestRef.current;
      setCityLoading(true);
      setCityError(null);
      setPendingCityName(meta.name);

      try {
        const context = await loadCityContext(meta, controller.signal);
        if (requestId !== cityRequestRef.current) return null;

        setCity(context);
        setDestinations([]);
        const nextDestinations = await fetchDestinations(`osm:relation:${context.relationId}`);
        if (requestId !== cityRequestRef.current) return null;

        setCity(context);
        setDestinations(nextDestinations);
        setQuery("");
        setActiveCategories(new Set());
        clearSelection();
        saveCityMeta(meta);
        return context;
      } catch (error) {
        if (requestId !== cityRequestRef.current) return null;
        if (controller.signal.aborted) return null;
        setCityError(errorMessage(error, "Wilayah gagal dimuat. Coba lagi."));
        return null;
      } finally {
        if (requestId === cityRequestRef.current) {
          setCityLoading(false);
          setPendingCityName(null);
        }
        externalSignal?.removeEventListener("abort", handleExternalAbort);
      }
    },
    [clearSelection],
  );

  const detectCity = useCallback(
    async (options: { auto?: boolean; signal?: AbortSignal } = {}) => {
      const auto = options.auto ?? false;
      const signal = options.signal;

      if (!("geolocation" in navigator)) {
        if (!auto) setLocationError("Peramban ini tidak mendukung layanan lokasi.");
        return;
      }

      if (auto) setDetectingCity(true);
      else setLocating(true);
      setLocationError(null);
      setCityError(null);

      try {
        const position = await getCurrentPosition();
        if (signal?.aborted) return;
        const location: UserLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        const meta = await reverseCity(location.lat, location.lon, signal);
        if (signal?.aborted) return;

        const current = cityRef.current;
        if (current && current.relationId === meta.relationId) {
          setUserLocation(location);
          saveCityMeta(meta);
          return;
        }

        const context = await loadCity(meta, signal);
        if (context) setUserLocation(location);
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        const code = (error as { code?: unknown } | null)?.code;
        if (typeof code === "number") {
          setLocationError(
            code === 1
              ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk memakai fitur ini."
              : "Lokasi tidak dapat diambil. Coba lagi sebentar lagi.",
          );
          return;
        }
        const message = errorMessage(
          error,
          "Lokasi tidak dapat dibaca. Coba lagi sebentar lagi.",
        );
        if (auto) setCityError(message);
        else setLocationError(message);
      } finally {
        if (auto) setDetectingCity(false);
        else setLocating(false);
      }
    },
    [loadCity],
  );

  useEffect(() => {
    const controller = new AbortController();

    const destinationId = new URLSearchParams(window.location.search).get("destination");
    const start = window.setTimeout(() => {
      const cityId = new URLSearchParams(window.location.search).get("city");
      const initial = cityId ? lookupCity(Number(cityId), controller.signal) : Promise.resolve(readSavedCityMeta() ?? PEKANBARU_CITY);
      void initial.then((meta) => loadCity(meta, controller.signal)).then((context) => {
        if (context && destinationId) {
          setSelectedDestinationId(destinationId);
          window.history.replaceState(null, "", destinationLink(destinationId, context.relationId));
        }
      }).catch((error) => { if (!controller.signal.aborted) { setCityError(error.message); setCityLoading(false); } });
    }, 0);

    return () => {
      window.clearTimeout(start);
      controller.abort();
    };
  }, [loadCity]);

  useEffect(() => {
    return () => cityAbortRef.current?.abort();
  }, []);

  const focusOn = useCallback((kind: MapFocus["kind"], id: string) => {
    focusNonceRef.current += 1;
    setFocus({ kind, id, nonce: focusNonceRef.current });
  }, []);

  const openDestination = useCallback(
    (id: string, focusMap: boolean) => {
      const destination = destinations.find((item) => item.id === id);
      if (!destination) return;
      const region = regionByDestinationId.get(id);
      setSelectedDestinationId(id);
      window.history.replaceState(null, "", destinationLink(id, cityRef.current?.relationId));
      setSelectedRegionCode(region?.properties.code ?? destination.regionCode);
      if (focusMap) focusOn("destination", id);
    },
    [destinations, focusOn, regionByDestinationId],
  );

  const openRegion = useCallback(
    (code: string, focusMap: boolean) => {
      setSelectedDestinationId(null);
      setSelectedRegionCode(code);
      if (focusMap) focusOn("region", code);
    },
    [focusOn],
  );

  const handleRetry = useCallback(() => {
    const meta = cityRef.current
      ? toCityMeta(cityRef.current)
      : readSavedCityMeta() ?? PEKANBARU_CITY;
    void loadCity(meta);
  }, [loadCity]);

  useEffect(() => {
    const refresh = () => { if (cityRef.current) void loadCity(toCityMeta(cityRef.current)); };
    window.addEventListener("tapeta:catalog", refresh);
    return () => window.removeEventListener("tapeta:catalog", refresh);
  }, [loadCity]);

  const handleSelectCity = useCallback(
    (meta: CityMeta) => {
      setCityPickerOpen(false);
      if (entryCitySelection) {
        setEntryCitySelection(false);
        if (entryContribution) {
          setEntryContribution(false);
          setView("contribute");
        } else {
          setUnscopedMap(false);
          setView("app");
        }
      }
      if (cityRef.current?.relationId === meta.relationId) {
        saveCityMeta(meta);
        return;
      }
      void loadCity(meta);
      const url = new URL(window.location.href);
      url.searchParams.set("city", String(meta.relationId));
      url.searchParams.delete("destination");
      window.history.replaceState(null, "", url);
    },
    [entryCitySelection, entryContribution, loadCity, setView],
  );

  const picker = cityPickerOpen ? (
    <CityPicker
      open={cityPickerOpen}
      currentCity={city ? toCityMeta(city) : null}
      locating={locating || detectingCity}
      onClose={() => setCityPickerOpen(false)}
      onSelect={handleSelectCity}
      onUseLocation={() => {
        setCityPickerOpen(false);
        void detectCity();
      }}
    />
  ) : null;

  const locationNotice = locationError ? (
    <div className="t-toast" role="status">
      <span>{locationError}</span>
      <button type="button" onClick={() => setLocationError(null)} aria-label="Tutup pemberitahuan">
        ×
      </button>
    </div>
  ) : null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (cityPickerOpen) return;

      if (event.key === "Escape") {
        if (selectedDestinationId || selectedRegionCode) {
          clearSelection();
        }
        return;
      }

      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (selectedDestinationId || selectedRegionCode) return;
      event.preventDefault();

      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cityPickerOpen,
    clearSelection,
    isMobile,
    selectedDestinationId,
    selectedRegionCode,
  ]);

  const loadingLabel = pendingCityName
    ? `Memuat batas kecamatan ${pendingCityName}`
    : "Memuat batas wilayah";

  const openMap = useCallback(() => {
    setEntryLocationOpen(true);
  }, []);

  const goHome = useCallback(() => {
    setView("intro");
  }, [setView]);

  const navigate = useCallback(
    (key: "explore" | "my" | "komunitas") => {
      if (key === "explore") setView("app");
      if (key === "my") setView("my");
      if (key === "komunitas") setView("komunitas");
    },
    [setView],
  );

  const openDestinationEverywhere = useCallback(
    (id: string) => {
      setView("app");
      openDestination(id, true);
    },
    [openDestination, setView],
  );

  const regionNameByDestination = useMemo(
    () =>
      new Map(
        regionStats.flatMap((stats) =>
          stats.destinations.map((d) => [d.id, stats.region.properties.name] as const),
        ),
      ),
    [regionStats],
  );

  const cityName = city?.name ?? "Pekanbaru";
  const provinceName = city?.province ?? "Riau";

  // Halaman yang memakai chrome (topbar + akun + notifikasi).
  const chromeView = (state: AccountLayerState) => (
    <ChromeContext.Provider
      value={{
        navigate,
        openHome: goHome,
        account: {
          signedIn: state.signedIn,
          initials: state.initials,
          unreadCount: state.unreadCount,
          accountMenuOpen: state.accountMenuOpen,
          notificationOpen: state.notificationOpen,
          onOpenAuth: state.onOpenAuth,
          onSessionUpdated: state.onSessionUpdated,
          onOpenAccount: state.onOpenAccount,
          onOpenProfileEditor: state.onOpenProfileEditor,
          onOpenNotifications: state.onOpenNotifications,
          onSignOut: state.onSignOut,
        },
      }}
    >
      {renderView(state)}
    </ChromeContext.Provider>
  );

  const renderView = (chromeState: AccountLayerState) => {
    const openPersonalPlace = async (place: PersonalPlace) => {
      const relationId = Number(place.relation_id);
      if (city?.relationId !== relationId) {
        const next = await loadCity({ relationId, name: place.city_name, province: place.province, type: "city" });
        if (!next) throw new Error("Kota tujuan belum berhasil dimuat. Coba lagi atau gunakan Petunjuk arah.");
      }
      clearSelection();
      setOsmSelection({ cityId: relationId, place: { id: `${place.osm_type ?? "saved"}:${place.osm_id ?? place.id}`, destinationId: place.destination_id ?? undefined, name: place.name, address: place.address, lat: place.lat, lon: place.lon, sourceUrl: place.source_url ?? `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}`, sourceLabel: placeSourceLabel(place) } });
      setView("app");
    };
    if ((view === "admin" || view === "adminDash" || view === "adminContributors" || view === "adminHistory" || view === "adminImport") && !["admin", "moderator"].includes(chromeState.role ?? "")) {
      return (
        <main className="t-app t-app--doc" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 480, padding: 32, borderRadius: 20, background: "#FFFCF6", border: "1px solid #D8C8B2", textAlign: "center" }}>
            <span className="t-eyebrow">AREA TERBATAS</span>
            <h1 style={{ color: "#1B2C35" }}>Dashboard admin</h1>
            <p style={{ color: "#786E5F" }}>Masuk dengan akun yang telah diberi peran moderator atau admin. Akses data juga dilindungi kebijakan server.</p>
            {chromeState.signedIn ? <button className="t-btn t-btn--brick" onClick={goHome}>Kembali ke TAPETA</button> : <button className="t-btn t-btn--brick" onClick={chromeState.onOpenAuth}>Masuk ke TAPETA</button>}
          </section>
        </main>
      );
    }
    if (view === "design") {
      return <PenFrames />;
    }

    if (view === "atlas") {
      return <AtlasView city={city} destinations={destinations} regionStats={regionStats} onOpenMap={openMap} onOpenHome={goHome} onOpenCityPicker={() => setCityPickerOpen(true)} onOpenDestination={openDestinationEverywhere} />;
    }

    if (view === "komunitas") {
      return (
        <Community
          onOpenPersonalPlace={openPersonalPlace}
          cityId={`osm:relation:${city?.relationId ?? PEKANBARU_CITY.relationId}`}
          cityName={cityName}
          provinceName={provinceName}
          destinations={destinations}
          categoriesById={CATEGORY_BY_ID}
          onBack={() => setView("app")}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onOpenDestination={openDestinationEverywhere}
          onOpenAuth={chromeState.onOpenAuth}
          onOpenContribute={() => setView("contribute")}
        />
      );
    }

    if (view === "perbaikan") {
      return (
        <Perbaikan
          cityName={cityName}
          provinceName={provinceName}
          destinations={destinations}
          categoriesById={CATEGORY_BY_ID}
          onOpenContribute={() => setView("contribute")}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onOpenDestination={openDestinationEverywhere}
        />
      );
    }

    if (view === "states") {
      return <States />;
    }

    if (view === "adminDash") {
      return <AdminDash destinations={destinations} cityName={cityName} provinceName={provinceName} onOpenCityPicker={() => setCityPickerOpen(true)} />;
    }

    if (view === "adminImport") {
      return <AdminImport cityName={cityName} provinceName={provinceName} onOpenCityPicker={() => setCityPickerOpen(true)} />;
    }

    if (view === "adminContributors" || view === "adminHistory") {
      return <AdminReports mode={view === "adminContributors" ? "contributors" : "history"} destinations={destinations} cityName={cityName} provinceName={provinceName} onOpenCityPicker={() => setCityPickerOpen(true)} />;
    }

    if (view === "kotabaru") {
      return (
        <KotaBaru
          cityName={cityName}
          provinceName={provinceName}
          onSearchCity={() => setCityPickerOpen(true)}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onOpenContribute={() => setView("contribute")}
          destinationCount={destinations.length}
        >
          <MapView cityBounds={city?.bounds} regions={regions} regionStats={regionStats} destinations={destinations}
            categoriesById={CATEGORY_BY_ID} cityName={cityName} selectedRegionId={null} selectedDestinationId={null}
            userLocation={null} focus={null} resetNonce={0} isLoading={cityLoading} loadingLabel={loadingLabel} error={cityError}
            onRetry={handleRetry} onSelectRegion={(code) => { setView("app"); openRegion(code, true); }}
            onSelectDestination={openDestinationEverywhere} onClearSelection={clearSelection} />
        </KotaBaru>
      );
    }

    if (view === "my") {
      const chromeAccount = chromeState;
      return (
        <MyTapeta
          onOpenPersonalPlace={openPersonalPlace}
          cityName={cityName}
          provinceName={provinceName}
          destinations={destinations}
          categoriesById={CATEGORY_BY_ID}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onOpenDestination={openDestinationEverywhere}
          onOpenAuth={chromeAccount.onOpenAuth}
          onOpenContribute={() => setView("contribute")}
          onOpenQueue={() => setView("admin")}
          onSessionUpdated={chromeState.onSessionUpdated}
        />
      );
    }

    if (view === "admin") {
      return (
        <AdminQueue
          cityName={cityName}
          provinceName={provinceName}
          onOpenCityPicker={() => setCityPickerOpen(true)}
        />
      );
    }

    const osmLocation = osmSelection?.cityId === (city?.relationId ?? PEKANBARU_CITY.relationId) ? osmSelection.place : null;
    const selectOsm = (place: OsmLocation) => {
      clearSelection();
      setOsmSelection({ cityId: city?.relationId ?? PEKANBARU_CITY.relationId, place: { ...place } });
    };
    const suggestOsm = (place: OsmLocation) => {
      setContributionPlace(place);
      setView("contribute");
    };

    if (view === "contribute") {
      return (
        <Contribute
          initialPlace={contributionPlace}
          cityId={`osm:relation:${city?.relationId ?? PEKANBARU_CITY.relationId}`}
          cityName={cityName}
          provinceName={provinceName}
          regions={regions}
          regionStats={regionStats}
          destinations={destinations}
          categories={[...CATEGORY_BY_ID.values()]}
          onClose={() => { setContributionPlace(null); setView("app"); }}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onSubmitted={(id) => {
            setContributionPlace(null);
            setView("contributeDone");
            setLastSubmissionId(id);
          }}
        />
      );
    }

    if (view === "contributeDone") {
      return (
        <SubmissionResult
          submissionId={lastSubmissionId}
          onBackToMap={() => setView("app")}
          onOpenQueue={() => navigate("my")}
        />
      );
    }

    if (view === "intro") {
      return isMobile ? <IntroMobile onEnter={openMap} /> : <IntroDesktop onEnter={openMap} />;
    }

    if (view === "app" && unscopedMap) {
      return (
        <main className="t-unscoped-map">
          <MapView cityBounds={undefined} regions={EMPTY_REGIONS} regionStats={[]} destinations={[]} categoriesById={CATEGORY_BY_ID} cityName={null} selectedRegionId={null} selectedDestinationId={null} userLocation={null} focus={null} resetNonce={0} isLoading={false} loadingLabel="" error={null} onRetry={() => undefined} onSelectRegion={() => undefined} onSelectDestination={() => undefined} onClearSelection={() => undefined} />
          <section className="t-unscoped-map__notice" aria-labelledby="t-unscoped-map-title">
            <p className="t-unscoped-map__eyebrow">PETA INDONESIA</p>
            <h1 id="t-unscoped-map-title">Lokasi ini belum dijelajahi di TAPETA</h1>
            <p>Pilih kota yang sudah memiliki cerita warga, atau pilih kota tujuanmu untuk menjadi kontributor pertama.</p>
            <button type="button" className="t-btn t-btn--brick" onClick={() => { setEntryCitySelection(true); setEntryContribution(false); setCityPickerOpen(true); }}>Lihat kota yang sudah dijelajahi</button>
            <button type="button" className="t-unscoped-map__contribute" onClick={() => { setEntryCitySelection(true); setEntryContribution(true); setCityPickerOpen(true); }}>Jadi kontributor pertama</button>
          </section>
        </main>
      );
    }

    if (!isMobile) {
      return (
        <ExploreDesktop
          osmLocation={osmLocation}
          onSelectOsm={selectOsm}
          onSuggestOsm={suggestOsm}
          city={city}
          cityLoading={cityLoading}
          cityError={cityError}
          regionStats={regionStats}
          regions={regions}
          destinations={destinations}
          filteredDestinations={filteredDestinations}
          categoriesById={CATEGORY_BY_ID}
          query={query}
          searchInputRef={searchInputRef}
          onQueryChange={setQuery}
          activeCategories={activeCategories}
          onToggleCategory={(category) =>
            setActiveCategories((current) => {
              const next = new Set(current);
              if (next.has(category)) next.delete(category);
              else next.add(category);
              return next;
            })
          }
          onResetCategories={() => setActiveCategories(new Set())}
          selectedRegionCode={selectedRegionCode}
          selectedDestinationId={selectedDestinationId}
          regionNameByCode={regionNameByCode}
          onSelectRegion={(code) => openRegion(code, true)}
          onSelectDestination={(id, focusMap) => openDestination(id, focusMap)}
          onClearSelection={clearSelection}
          onOpenCityPicker={() => setCityPickerOpen(true)}
          onDismissCityError={() => setCityError(null)}
          onOpenHome={goHome}
          onOpenAtlas={() => setView("atlas")}
          onOpenContribute={() => { setContributionPlace(null); setView("contribute"); }}
        >
          <MapView
            searchPoint={osmLocation}
            cityBounds={city?.bounds}
            regions={regions}
            regionStats={regionStats}
            destinations={destinations}
            categoriesById={CATEGORY_BY_ID}
            cityName={city?.name ?? null}
            selectedRegionId={selectedRegionCode}
            selectedDestinationId={selectedDestinationId}
            userLocation={userLocation}
            focus={focus}
            resetNonce={resetNonce}
            isLoading={cityLoading}
            loadingLabel={loadingLabel}
            error={cityError}
            onRetry={handleRetry}
            onSelectRegion={(code) => openRegion(code, false)}
            onSelectDestination={(id) => openDestination(id, false)}
            onClearSelection={clearSelection}
          />
        </ExploreDesktop>
      );
    }

    return (
      <MobileTapeta
        osmLocation={osmLocation}
        onSelectOsm={selectOsm}
        onSuggestOsm={suggestOsm}
        selectedDestinationId={selectedDestinationId}
        onSelectDestination={(id) => openDestination(id, true)}
        onClearSelection={clearSelection}
        onRetry={handleRetry}
        city={city}
        cityLoading={cityLoading}
        cityError={cityError}
        regions={regions}
        regionStats={regionStats}
        destinations={destinations}
        categoriesById={CATEGORY_BY_ID}
        regionNameByDestination={regionNameByDestination}
        onOpenCityPicker={() => setCityPickerOpen(true)}
        onOpenContribute={() => { setContributionPlace(null); setView("contribute"); }}
        onExitToIntro={goHome}
      />
    );
  };

  return (
    <AccountLayer onNavigate={navigate} onOpenMyTapeta={() => setView("my")}>
      {(state) => (
        <>
          {chromeView(state)}
          {picker}
          <EntryLocationPrompt
            open={entryLocationOpen}
            locating={locating || detectingCity}
            onClose={() => setEntryLocationOpen(false)}
            onUseLocation={() => {
              setEntryLocationOpen(false);
              setView("app");
              void detectCity();
            }}
            onChooseCity={() => {
              setEntryLocationOpen(false);
              setEntryCitySelection(true);
              setCityPickerOpen(true);
            }}
            onExploreWithoutCity={() => {
              setEntryLocationOpen(false);
              setCity(null);
              setDestinations([]);
              setUnscopedMap(true);
              setView("app");
            }}
          />
          {locationNotice}
        </>
      )}
    </AccountLayer>
  );
}
