import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { EXPLORATION_THRESHOLD } from "../data/categories";
import type {
  Destination,
  ExplorationStatus,
  RegionFeature,
  RegionStats,
} from "../types";

export function explorationStatus(
  count: number,
  threshold = EXPLORATION_THRESHOLD,
): ExplorationStatus {
  if (count <= 0) return "unexplored";
  if (count < threshold) return "in-progress";
  return "explored";
}

export function findRegionForPoint(
  regions: RegionFeature[],
  lon: number,
  lat: number,
): RegionFeature | null {
  for (const region of regions) {
    if (
      region.geometry.type !== "Polygon" &&
      region.geometry.type !== "MultiPolygon"
    ) {
      continue;
    }
    const geometry = {
      type: "Feature" as const,
      properties: {},
      geometry: region.geometry,
    };
    if (booleanPointInPolygon([lon, lat], geometry)) return region;
  }
  return null;
}

export function buildRegionStats(
  regions: RegionFeature[],
  destinations: Destination[],
): RegionStats[] {
  return regions.map((region) => {
    const inRegion = destinations.filter((destination) => {
      if (destination.publicationStatus !== "published") return false;
      return findRegionForPoint([region], destination.lon, destination.lat) !== null;
    });
    return {
      region,
      destinations: inRegion,
      count: inRegion.length,
      status: explorationStatus(inRegion.length),
      threshold: EXPLORATION_THRESHOLD,
    };
  });
}

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return `${meters.toLocaleString("id-ID")} m`;
  }
  return `${km.toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
}

export function formatCoordinate(value: number, axis: "lat" | "lon"): string {
  const hemisphere =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(5)}° ${hemisphere}`;
}

export function statusLabel(status: ExplorationStatus): string {
  switch (status) {
    case "unexplored":
      return "Belum dijelajah";
    case "in-progress":
      return "Sedang dijelajah";
    case "explored":
      return "Sudah dijelajah";
  }
}

export function statusHint(
  status: ExplorationStatus,
  count: number,
  threshold: number,
): string {
  switch (status) {
    case "unexplored":
      return "Belum ada destinasi terbit di wilayah ini.";
    case "in-progress":
      return `${count} dari ${threshold} destinasi menuju status sudah dijelajah.`;
    case "explored":
      return `${count} destinasi terbit, ambang wilayah sudah terpenuhi.`;
  }
}
