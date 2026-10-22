import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  CategoryId,
  Destination,
  RegionFeature,
  RegionStats,
  UserLocation,
  Bounds,
} from "../types";
import { statusLabel } from "../lib/geo";
import { createMarkerIcon } from "../lib/markerIcon";
import { CATEGORY_COLORS } from "../data/categories";
import { PEKANBARU_WATERCOLOR } from "../data/pekanbaruWatercolor";
import { useMediaQuery } from "../lib/useMediaQuery";

const OSM_TILES = import.meta.env.VITE_OSM_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const STATUS_COLORS = {
  unexplored: { fill: "#eee9dd", stroke: "#a79d8a" },
  "in-progress": { fill: "#f4e7d4", stroke: "#b07d4f" },
  explored: { fill: "#cfdac9", stroke: "#6d8a70" },
} as const;

const SELECTED_STROKE = "#9C4935";
const LOCATION_COLOR = "#B4553F";
function tooltipText(value: string) {
  const element = document.createElement("span");
  element.textContent = value;
  return element;
}

export interface MapFocus {
  kind: "region" | "destination";
  id: string;
  nonce: number;
}

interface MapViewProps {
  cityBounds?: Bounds;
  regions: RegionFeature[];
  regionStats: RegionStats[];
  destinations: Destination[];
  categoriesById: Map<CategoryId, { shortName: string }>;
  cityName: string | null;
  selectedRegionId: string | null;
  selectedDestinationId: string | null;
  userLocation: UserLocation | null;
  focus: MapFocus | null;
  resetNonce: number;
  isLoading: boolean;
  loadingLabel: string;
  error: string | null;
  onRetry: () => void;
  onSelectRegion: (code: string) => void;
  onSelectDestination: (id: string) => void;
  onClearSelection: () => void;
  /** Opsional: mode pemilihan titik (alur usulkan tempat). */
  onPickPoint?: (lat: number, lon: number) => void;
  pickedPoint?: { lat: number; lon: number } | null;
}

export function MapView({
  cityBounds,
  regions,
  regionStats,
  destinations,
  categoriesById,
  cityName,
  selectedRegionId,
  selectedDestinationId,
  userLocation,
  focus,
  resetNonce,
  isLoading,
  loadingLabel,
  error,
  onRetry,
  onSelectRegion,
  onSelectDestination,
  onClearSelection,
  onPickPoint,
  pickedPoint = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const watercolorLayerRef = useRef<L.ImageOverlay | null>(null);
  const regionLayersRef = useRef(new Map<string, L.Polygon>());
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const lastFocusNonceRef = useRef(0);
  const [tileError, setTileError] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [showIllustration, setShowIllustration] = useState(true);
  const compactViewport = useMediaQuery("(max-width: 860px)");

  const statsMap = useMemo(
    () => new Map(regionStats.map((stats) => [stats.region.properties.code, stats])),
    [regionStats],
  );
  const isPekanbaru = cityName?.trim().toLocaleLowerCase("id-ID") === "pekanbaru";

  const statsMapRef = useRef(statsMap);
  const selectRegionRef = useRef(onSelectRegion);
  const selectDestinationRef = useRef(onSelectDestination);
  const clearSelectionRef = useRef(onClearSelection);
  const pickPointRef = useRef(onPickPoint);
  const pickMarkerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    statsMapRef.current = statsMap;
  }, [statsMap]);

  useEffect(() => {
    selectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    pickPointRef.current = onPickPoint;
  }, [onPickPoint]);

  useEffect(() => {
    selectDestinationRef.current = onSelectDestination;
  }, [onSelectDestination]);

  useEffect(() => {
    clearSelectionRef.current = onClearSelection;
  }, [onClearSelection]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-2.2, 118],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.5,
    });

    const watercolorPane = map.createPane("pekanbaruWatercolor");
    watercolorPane.style.zIndex = "350";
    watercolorPane.style.pointerEvents = "none";

    L.tileLayer(OSM_TILES, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
      className: "osm-tiles",
    })
      .on("tileerror", () => setTileError(true))
      .on("load", () => setTileError(false))
      .addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    map.on("click", (event) => {
      const onPick = pickPointRef.current;
      if (onPick) {
        onPick(event.latlng.lat, event.latlng.lng);
        return;
      }
      const target = event.originalEvent?.target as Element | null;
      if (target && typeof target.closest === "function" && target.closest(".leaflet-interactive")) {
        return;
      }
      clearSelectionRef.current();
    });

    mapRef.current = map;
    map.on("zoomend", () => setZoom(map.getZoom()));
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      geoLayerRef.current = null;
      watercolorLayerRef.current = null;
      markerLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoLayerRef.current) {
      geoLayerRef.current.remove();
      regionLayersRef.current.clear();
    }
    watercolorLayerRef.current?.remove();
    watercolorLayerRef.current = null;
    if (regions.length === 0) {
      if (cityBounds) map.fitBounds([[cityBounds.south, cityBounds.west], [cityBounds.north, cityBounds.east]], { padding: [24, 24] });
      return;
    }

    const layer = L.geoJSON(regions as unknown as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const code = String(feature?.properties?.code ?? "");
        const status = statsMapRef.current.get(code)?.status ?? "unexplored";
        const palette = STATUS_COLORS[status];
        return {
          color: isPekanbaru ? "#82947a" : palette.stroke,
          fillColor: palette.fill,
          fillOpacity: isPekanbaru ? 0.035 : status === "unexplored" ? 0.3 : 0.44,
          weight: isPekanbaru ? 1.1 : 1.6,
          dashArray: !isPekanbaru && status === "unexplored" ? "3 5" : undefined,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const code = String(feature.properties.code);
        const name = String(feature.properties.name);
        regionLayersRef.current.set(code, featureLayer as L.Polygon);

        featureLayer.bindTooltip(tooltipText(name), {
          permanent: true,
          direction: "center",
          className: "region-label",
          opacity: 1,
        });

        featureLayer.on("click", (event) => {
          if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          if (pickPointRef.current) {
            pickPointRef.current(event.latlng.lat, event.latlng.lng);
            return;
          }
          selectRegionRef.current(code);
        });

        featureLayer.on("mouseover", () => {
          const layerPath = featureLayer as L.Path;
          layerPath.setStyle({ weight: 2.6, fillOpacity: isPekanbaru ? 0.12 : 0.52 });
        });
        featureLayer.on("mouseout", () => {
          const layerPath = featureLayer as L.Path;
          const selected = layerPath.getElement()?.classList.contains("is-selected");
          if (selected) return;
          const status =
            statsMapRef.current.get(code)?.status ?? ("unexplored" as const);
          const palette = STATUS_COLORS[status];
          layerPath.setStyle({
            weight: isPekanbaru ? 1.1 : 1.6,
            fillOpacity: isPekanbaru ? 0.035 : status === "unexplored" ? 0.3 : 0.44,
            color: isPekanbaru ? "#82947a" : palette.stroke,
            fillColor: palette.fill,
          });
        });
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      if (isPekanbaru) {
        // Bounds hasil kalibrasi mengikat raster ke koordinat OSM, sehingga Leaflet
        // menangani pan dan zoom tanpa meregangkan gambar melalui SVG/CSS.
        const { west, south, east, north } = PEKANBARU_WATERCOLOR.bounds;
        watercolorLayerRef.current = L.imageOverlay(
          PEKANBARU_WATERCOLOR.src,
          [[south, west], [north, east]],
          { pane: "pekanbaruWatercolor", interactive: false, opacity: 0.96, className: "pekanbaru-watercolor-overlay" },
        ).addTo(map);
      }
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [regions, isPekanbaru, cityBounds]);

  useEffect(() => {
    watercolorLayerRef.current?.setOpacity(showIllustration ? 0.96 : 0);
  }, [showIllustration, regions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [code, layer] of regionLayersRef.current) {
      const stats = statsMap.get(code);
      const status = stats?.status ?? "unexplored";
      const palette = STATUS_COLORS[status];
      const selected = code === selectedRegionId;
      layer.setStyle({
        fillColor: palette.fill,
        fillOpacity: selected ? (isPekanbaru ? 0.14 : 0.55) : isPekanbaru ? 0.035 : status === "unexplored" ? 0.3 : 0.44,
        color: selected ? SELECTED_STROKE : isPekanbaru ? "#82947a" : palette.stroke,
        weight: selected ? 3 : isPekanbaru ? 1.1 : 1.6,
        dashArray: status === "unexplored" && !selected ? "3 5" : undefined,
      });
      const element = layer.getElement();
      if (element) element.classList.toggle("is-selected", selected);

      if (stats) {
        const tooltip = layer.getTooltip();
        const label = tooltipText(stats.region.properties.name);
        label.className = "region-label__name";
        const count = tooltipText(`${stats.count} tempat`);
        count.className = "region-label__meta";
        label.append(count);
        tooltip?.setContent(label);
      }
    }
  }, [regionStats, selectedRegionId, statsMap, isPekanbaru]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerLayerRef.current) {
      markerLayerRef.current.remove();
      markerLayerRef.current = null;
    }

    const group = L.layerGroup();
    for (const destination of destinations) {
      const active = destination.id === selectedDestinationId;
      const marker = L.marker([destination.lat, destination.lon], {
        icon: destination.sticker && zoom >= 14 ? L.icon({
          iconUrl: destination.sticker.src, iconSize: [64, 64], iconAnchor: [32, 64],
          className: "destination-sticker",
        }) : createMarkerIcon(
          destination.categoryId,
          active,
          zoom < 13,
          CATEGORY_COLORS[destination.categoryId],
        ),
        title: destination.name,
        alt: `${destination.name}, ${categoriesById.get(destination.categoryId)?.shortName ?? "destinasi"}`,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: active ? 1000 : 0,
      });

      marker.bindTooltip(tooltipText(destination.name), {
        direction: "top",
        offset: [0, -38],
        className: "marker-tooltip",
      });

      marker.on("click", (event) => {
        if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
        selectDestinationRef.current(destination.id);
      });

      marker.addTo(group);
    }

    group.addTo(map);
    markerLayerRef.current = group;
  }, [destinations, selectedDestinationId, categoriesById, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }
    if (!pickedPoint) return;

    pickMarkerRef.current = L.circleMarker([pickedPoint.lat, pickedPoint.lon], {
      radius: 6,
      color: "#a64e38",
      weight: 2,
      fillColor: "#b4553f",
      fillOpacity: 1,
      className: "pick-point",
    }).addTo(map);
  }, [pickedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLayerRef.current) {
      userLayerRef.current.remove();
      userLayerRef.current = null;
    }

    if (!userLocation) return;

    const group = L.layerGroup();
    L.circle([userLocation.lat, userLocation.lon], {
      radius: Math.min(userLocation.accuracy, 250),
      color: LOCATION_COLOR,
      weight: 1,
      opacity: 0.6,
      fillColor: LOCATION_COLOR,
      fillOpacity: 0.1,
    }).addTo(group);

    L.circleMarker([userLocation.lat, userLocation.lon], {
      radius: 6,
      color: "#FBF7EE",
      weight: 2,
      fillColor: LOCATION_COLOR,
      fillOpacity: 1,
    })
      .bindTooltip("Lokasi kamu", {
        direction: "top",
        offset: [0, -8],
        className: "marker-tooltip",
      })
      .addTo(group);

    group.addTo(map);
    userLayerRef.current = group;
    map.flyTo([userLocation.lat, userLocation.lon], 14.5, { duration: 0.9 });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || focus.nonce === lastFocusNonceRef.current) return;
    lastFocusNonceRef.current = focus.nonce;

    if (focus.kind === "region") {
      const layer = regionLayersRef.current.get(focus.id);
      const bounds = layer?.getBounds();
      if (bounds?.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
      }
      return;
    }

    const destination = destinations.find((item) => item.id === focus.id);
    if (destination) {
      map.flyTo([destination.lat, destination.lon], 15, { duration: 0.8 });
    }
  }, [focus, destinations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || resetNonce === 0) return;
    const layer = geoLayerRef.current;
    if (!layer) return;
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 });
    }
  }, [resetNonce]);

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label={
          cityName
            ? `Peta interaktif batas kecamatan dan destinasi di ${cityName}`
            : "Peta interaktif batas kecamatan Indonesia"
        }
      />

      <div className="map-meta" role="status">
        <span className="map-meta__strong">{regionStats.reduce((sum, item) => sum + item.count, 0)} destinasi</span>
        <span className="map-meta__divider" aria-hidden="true" />
        <span>{regions.length} kecamatan</span>
      </div>

      {tileError && (
        <p className="map-notice">
          Basemap gagal dimuat. Katalog dan daftar destinasi tetap dapat digunakan.
        </p>
      )}

      {(isLoading || error) && (
        <div className="map-overlay">
          {isLoading ? (
            <div className="map-overlay__panel">
              <p className="eyebrow">Menyiapkan peta</p>
              <p className="map-overlay__title">{loadingLabel}</p>
              <p className="map-overlay__body">
                Kunjungan pertama bisa memakan waktu beberapa menit bila server OSM
                penuh. Setelah termuat, batas wilayah tersimpan di peramban.
              </p>
              <div className="loading-bar" aria-hidden="true">
                <span />
              </div>
            </div>
          ) : (
            <div className="map-overlay__panel" role="alert">
              <p className="eyebrow">Peta tidak tersedia</p>
              <p className="map-overlay__title">{error}</p>
              <p className="map-overlay__body">
                Periksa koneksi lalu muat ulang data batas wilayah.
              </p>
              <button type="button" className="button button--solid" onClick={onRetry}>
                Muat ulang batas wilayah
              </button>
            </div>
          )}
        </div>
      )}

      {!onPickPoint && <details className="map-legend" open={!compactViewport} aria-label="Legenda status wilayah">
        <summary className="map-legend__title">Status wilayah dan ilustrasi</summary>
        {(
          [
            ["explored", regionStats.filter((item) => item.status === "explored").length],
            ["in-progress", regionStats.filter((item) => item.status === "in-progress").length],
            ["unexplored", regionStats.filter((item) => item.status === "unexplored").length],
          ] as Array<[keyof typeof STATUS_COLORS, number]>
        ).map(([status, count]) => (
          <span
            key={status}
            className={`map-legend__item map-legend__item--${status}`}
          >
            <i style={{ background: STATUS_COLORS[status].fill }} aria-hidden="true" />
            {statusLabel(status)}
            <span className="map-legend__count">{count}</span>
          </span>
        ))}
        <span className="map-legend__note">
          Abu-abu: data TAPETA belum tersedia, bukan berarti tidak ada
        </span>
        {regions.length === 0 && <span className="map-legend__note">Batas kecamatan belum tersedia.</span>}
        {isPekanbaru && <label style={{ display: "flex", alignItems: "center", minHeight: 44, gap: 8 }}>
          <input type="checkbox" checked={showIllustration} onChange={(event) => setShowIllustration(event.target.checked)} /> Ilustrasi cat air
        </label>}
        {isPekanbaru && <span className="map-legend__note">Ilustrasi perkiraan. Matikan untuk memeriksa jalan OSM.</span>}
      </details>}
    </div>
  );
}
