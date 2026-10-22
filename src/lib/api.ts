import osmtogeojson from "osmtogeojson";
import type {
  BoundaryCollection,
  CityMeta,
  CitySearchResult,
  Destination,
  RegionFeature,
} from "../types";
import { isBackendConfigured, supabase } from "./supabase";

export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

export const PEKANBARU_RELATION_ID = 16563796;

export const PEKANBARU_CITY: CityMeta = {
  relationId: PEKANBARU_RELATION_ID,
  name: "Pekanbaru",
  type: "city",
  province: "Riau",
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_INTERVAL_MS = 1100;
const CITY_TYPES = new Set([
  "city",
  "town",
  "county",
  "municipality",
  "city_district",
]);

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface NominatimPlace {
  boundingbox?: [string, string, string, string];
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  name?: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
}

interface OverpassResponse {
  elements?: unknown[];
  remark?: string;
}

interface OverpassGeoProperties {
  boundary?: string;
  admin_level?: string;
  name?: string;
  ref?: string;
  id?: string;
}

function isRegionFeature(value: unknown): value is RegionFeature {
  if (!value || typeof value !== "object") return false;
  const feature = value as Partial<RegionFeature>;
  return (
    feature.type === "Feature" &&
    typeof feature.properties?.name === "string" &&
    typeof feature.properties?.code === "string" &&
    (feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon")
  );
}

function abortError(): DOMException {
  return new DOMException("Permintaan dibatalkan.", "AbortError");
}

function signalWithTimeout(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      window.clearTimeout(timer);
      controller.abort();
    } else {
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(timer);
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return controller.signal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);
    function handleAbort() {
      window.clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

let lastNominatimRequest = 0;

async function fetchNominatim<T>(url: string, signal?: AbortSignal): Promise<T> {
  const wait = Math.max(
    0,
    NOMINATIM_INTERVAL_MS - (Date.now() - lastNominatimRequest),
  );
  if (wait > 0) await sleep(wait, signal);

  lastNominatimRequest = Date.now();
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": "id",
    },
  });

  if (!response.ok) {
    throw new DataError(
      response.status === 429
        ? "Pencarian kota sedang dibatasi. Tunggu sebentar lalu coba lagi."
        : `Layanan pencarian kota gagal menjawab (HTTP ${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

function placeName(place: NominatimPlace): string | null {
  if (place.name) return place.name;
  const address = place.address ?? {};
  return (
    address.city ??
    address.county ??
    address.town ??
    address.municipality ??
    place.display_name.split(",")[0]?.trim() ??
    null
  );
}

function toCityMeta(place: NominatimPlace): CityMeta | null {
  const name = placeName(place);
  if (!name || place.osm_type !== "relation") return null;
  return {
    relationId: place.osm_id,
    name,
    type: place.addresstype ?? "administrative",
    province: place.address?.state ?? null,
    bounds: place.boundingbox ? { south: Number(place.boundingbox[0]), north: Number(place.boundingbox[1]), west: Number(place.boundingbox[2]), east: Number(place.boundingbox[3]) } : undefined,
  };
}

export async function fetchRegions(
  signal?: AbortSignal,
): Promise<RegionFeature[]> {
  const response = await fetch("/data/pekanbaru-kecamatan.geojson", {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new DataError(
      `Batas wilayah gagal dimuat (HTTP ${response.status}).`,
    );
  }

  const payload = (await response.json()) as BoundaryCollection;
  if (
    payload.type !== "FeatureCollection" ||
    !Array.isArray(payload.features) ||
    payload.features.length === 0
  ) {
    throw new DataError("Berkas batas wilayah tidak berisi data kecamatan.");
  }

  const features = payload.features.filter(isRegionFeature);
  if (features.length !== payload.features.length) {
    throw new DataError("Sebagian data batas wilayah tidak valid.");
  }
  return features;
}

export async function fetchDestinations(cityId = `osm:relation:${PEKANBARU_RELATION_ID}`): Promise<Destination[]> {
  if (isBackendConfigured && supabase) {
    const { data, error } = await supabase.rpc("public_destinations", { p_city_id: cityId });
    if (error) throw new DataError(`Destinasi terverifikasi gagal dimuat: ${error.message}`);
    const serverDestinations = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      categoryId: String(row.category_id ?? "lainnya") as Destination["categoryId"],
      description: row.description ? String(row.description) : null,
      address: String(row.address ?? ""),
      regionCode: String(row.region_code ?? ""),
      lat: Number(row.lat),
      lon: Number(row.lon),
      openingHours: { status: "unknown" as const },
      publicationStatus: "published" as const,
      source: row.source_label || row.source_url ? { label: String(row.source_label ?? "Sumber terverifikasi"), url: String(row.source_url ?? "") } : null,
      updatedAt: String(row.updated_at ?? ""),
      sticker: typeof row.sticker_path === "string" && /^\/assets\/stickers\/[a-z0-9-]+\.png$/.test(row.sticker_path)
        ? { src: row.sticker_path, alt: String(row.sticker_alt ?? row.name) } : undefined,
    }));
    return serverDestinations;
  }
  return [];
}

export async function lookupCity(relationId: number, signal?: AbortSignal): Promise<CityMeta> {
  if (!Number.isSafeInteger(relationId) || relationId <= 0) throw new DataError("Identitas kota tidak valid.");
  if (relationId === PEKANBARU_RELATION_ID) return PEKANBARU_CITY;
  const places = await fetchNominatim<NominatimPlace[]>(`${NOMINATIM_URL}/lookup?osm_ids=R${relationId}&format=jsonv2&addressdetails=1`, signal);
  const city = places[0] ? toCityMeta(places[0]) : null;
  if (!city) throw new DataError("Kota pada tautan tidak ditemukan.");
  return city;
}

export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("/search", NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "id");
  url.searchParams.set("accept-language", "id");

  const payload = await fetchNominatim<NominatimPlace[]>(url.toString(), signal);
  const seen = new Set<number>();
  const results: CitySearchResult[] = [];

  for (const place of payload) {
    if (
      place.osm_type !== "relation" ||
      !place.addresstype ||
      !CITY_TYPES.has(place.addresstype) ||
      seen.has(place.osm_id)
    ) {
      continue;
    }
    const meta = toCityMeta(place);
    if (!meta) continue;
    seen.add(place.osm_id);
    results.push({ ...meta, displayName: place.display_name });
  }

  return results;
}

export async function reverseCity(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<CityMeta> {
  const url = new URL("/reverse", NOMINATIM_URL);
  url.searchParams.set("lat", lat.toFixed(6));
  url.searchParams.set("lon", lon.toFixed(6));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "8");
  url.searchParams.set("accept-language", "id");

  const place = await fetchNominatim<NominatimPlace & { error?: string }>(
    url.toString(),
    signal,
  );

  if (place.error) {
    throw new DataError("Kota tidak dapat dikenali dari lokasi ini.");
  }

  const countryCode = place.address?.country_code?.toLowerCase();
  if (countryCode && countryCode !== "id") {
    throw new DataError(
      "Tapeta saat ini hanya mencakup wilayah Indonesia. Pilih kota secara manual.",
    );
  }

  if (place.osm_type === "relation" && place.addresstype && CITY_TYPES.has(place.addresstype)) {
    const meta = toCityMeta(place);
    if (meta) return meta;
  }

  const fallbackName =
    place.address?.city ??
    place.address?.county ??
    place.address?.town ??
    place.address?.municipality ??
    place.name;

  if (fallbackName) {
    const state = place.address?.state;
    const results = await searchCities(
      [fallbackName, state, "Indonesia"].filter(Boolean).join(", "),
      signal,
    );
    if (results[0]) return results[0];
  }

  throw new DataError(
    "Kota tidak terdeteksi. Coba pilih kota secara manual.",
  );
}

function overpassQuery(relationId: number): string {
  return `[out:json][timeout:120];
rel(${relationId});
map_to_area -> .city;
rel["boundary"="administrative"]["admin_level"="6"](area.city);
out geom qt;`;
}

const OVERPASS_ATTEMPTS = [
  { endpoint: OVERPASS_ENDPOINTS[0], timeoutMs: 150_000, backoffMs: 2_500 },
  { endpoint: OVERPASS_ENDPOINTS[0], timeoutMs: 150_000, backoffMs: 5_000 },
  { endpoint: OVERPASS_ENDPOINTS[1], timeoutMs: 150_000, backoffMs: 0 },
];

async function fetchOverpass(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  for (const [index, attempt] of OVERPASS_ATTEMPTS.entries()) {
    if (signal?.aborted) throw abortError();

    const timeoutSignal = signalWithTimeout(signal, attempt.timeoutMs);

    try {
      const response = await fetch(attempt.endpoint, {
        method: "POST",
        signal: timeoutSignal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }).toString(),
      });

      if (!response.ok) {
        throw new DataError(
          `Layanan batas wilayah OSM menolak permintaan (HTTP ${response.status}).`,
        );
      }

      const text = await response.text();
      let payload: OverpassResponse;
      try {
        payload = JSON.parse(text) as OverpassResponse;
      } catch {
        throw new DataError("Layanan batas wilayah OSM mengirim data yang tidak valid.");
      }

      if (!Array.isArray(payload.elements) || payload.elements.length === 0) {
        throw new DataError(
          payload.remark ??
            "Layanan batas wilayah OSM tidak mengirim data wilayah.",
        );
      }

      return payload;
    } catch (error) {
      if (signal?.aborted) throw error;
      const isLast = index === OVERPASS_ATTEMPTS.length - 1;
      if (isLast) {
        if (error instanceof DataError) throw error;
        break;
      }
      await sleep(attempt.backoffMs, signal);
    }
  }

  throw new DataError(
    "Layanan batas wilayah OSM sedang penuh. Coba lagi beberapa saat lagi.",
  );
}

function toRegionFeatures(payload: OverpassResponse): RegionFeature[] {
  const converted = osmtogeojson(payload) as GeoJSON.FeatureCollection;
  const seen = new Set<string>();
  const regions: RegionFeature[] = [];

  for (const feature of converted.features) {
    const geometry = feature.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      continue;
    }

    const properties = (feature.properties ?? {}) as OverpassGeoProperties;
    if (properties.boundary !== "administrative" || properties.admin_level !== "6") {
      continue;
    }

    const name = properties.name?.trim();
    const osmId =
      properties.id ??
      (typeof feature.id === "string" ? feature.id : null);
    if (!name || !osmId || seen.has(osmId)) continue;
    seen.add(osmId);

    const code = properties.ref?.trim() || osmId.replace("relation/", "osm-");
    regions.push({
      type: "Feature",
      properties: {
        id: osmId,
        name,
        code,
        region_type: "kecamatan",
        source: "OpenStreetMap",
        source_url: `https://www.openstreetmap.org/${osmId}`,
        license: "ODbL 1.0",
      },
      geometry,
    });
  }

  return regions.sort((a, b) =>
    a.properties.name.localeCompare(b.properties.name, "id"),
  );
}

export async function fetchCityRegions(
  city: CityMeta,
  signal?: AbortSignal,
): Promise<RegionFeature[]> {
  if (city.relationId === PEKANBARU_RELATION_ID) {
    return fetchRegions(signal);
  }

  const payload = await fetchOverpass(overpassQuery(city.relationId), signal);
  const regions = toRegionFeatures(payload);

  if (regions.length === 0) {
    if (payload.remark) {
      throw new DataError(
        "Batas kecamatan kota ini belum lengkap di OpenStreetMap. Coba lagi nanti.",
      );
    }
    return [];
  }

  return regions;
}
