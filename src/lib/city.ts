import type { CityContext, CityMeta } from "../types";
import { fetchCityRegions, PEKANBARU_RELATION_ID } from "./api";
import { readCachedCity, writeCachedCity } from "./cityCache";

export async function loadCityContext(
  city: CityMeta,
  signal?: AbortSignal,
): Promise<CityContext> {
  if (city.relationId === PEKANBARU_RELATION_ID) {
    const regions = await fetchCityRegions(city, signal);
    return {
      ...city,
      regions,
      fetchedAt: new Date().toISOString(),
      source: "local",
    };
  }

  const cached = await readCachedCity(city.relationId);
  if (cached) {
    return {
      ...cached,
      name: city.name,
      type: city.type,
      province: city.province,
      source: "cache",
    };
  }

  const regions = await fetchCityRegions(city, signal);
  const context: CityContext = {
    ...city,
    regions,
    fetchedAt: new Date().toISOString(),
    source: "osm",
  };
  await writeCachedCity(context);
  return context;
}
