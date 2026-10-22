export type CategoryId =
  | "kafe"
  | "kuliner"
  | "alam"
  | "budaya"
  | "rekreasi"
  | "lainnya";

export type ExplorationStatus = "unexplored" | "in-progress" | "explored";

export type OpeningHours =
  | { status: "verified"; display: string; source: string }
  | { status: "unknown" };

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
}

export interface Destination {
  id: string;
  name: string;
  categoryId: CategoryId;
  description: string | null;
  address: string;
  regionCode: string;
  lat: number;
  lon: number;
  openingHours: OpeningHours;
  publicationStatus: "published" | "archived";
  source: {
    label: string;
    url: string;
  } | null;
  updatedAt: string;
  sticker?: { src: string; alt: string };
}

export interface RegionProperties {
  id: string;
  name: string;
  code: string;
  region_type: string;
  source: string;
  source_url: string;
  license: string;
}

export interface RegionFeature {
  type: "Feature";
  properties: RegionProperties;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface BoundaryCollection {
  type: "FeatureCollection";
  metadata: {
    name: string;
    region: string;
    retrieved_at: string;
    source: string;
    license: string;
    note: string;
  };
  features: RegionFeature[];
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface RegionStats {
  region: RegionFeature;
  destinations: Destination[];
  count: number;
  status: ExplorationStatus;
  threshold: number;
}

export interface UserLocation {
  lat: number;
  lon: number;
  accuracy: number;
}

export interface CityMeta {
  relationId: number;
  name: string;
  type: string;
  province: string | null;
  bounds?: Bounds;
}

export interface CitySearchResult extends CityMeta {
  displayName: string;
}

export interface CityContext extends CityMeta {
  regions: RegionFeature[];
  fetchedAt: string;
  source: "local" | "cache" | "osm";
}
