import { useEffect, useMemo, useRef, useState } from "react";
import { searchOsmLocations } from "../lib/api";
import { findRegionForPoint } from "../lib/geo";
import type { Bounds, CityMeta, OsmLocation, RegionFeature } from "../types";
import { PEKANBARU_CITY } from "../lib/api";
import { SavePlaceButton } from "./SavePlaceButton";

interface Props {
  city: CityMeta | null;
  query: string;
  cityName: string;
  regions: RegionFeature[];
  selected: OsmLocation | null;
  onSelect: (place: OsmLocation) => void;
  onSuggest: (place: OsmLocation) => void;
}

export function OsmPlaceSearch({ city, query, cityName, regions, selected, onSelect, onSuggest }: Props) {
  const [results, setResults] = useState<OsmLocation[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bounds = useMemo<Bounds | null>(() => {
    if (!regions.length) return null;
    const coordinates = regions.flatMap((region) => region.geometry.type === "Polygon" ? region.geometry.coordinates.flat() : region.geometry.coordinates.flat(2));
    return coordinates.reduce((box, [lon, lat]) => ({ south: Math.min(box.south, lat), north: Math.max(box.north, lat), west: Math.min(box.west, lon), east: Math.max(box.east, lon) }), { south: Infinity, north: -Infinity, west: Infinity, east: -Infinity });
  }, [regions]);

  useEffect(() => {
    return () => request.current?.abort();
  }, [query, regions]);

  const search = async () => {
    if (!bounds || query.trim().length < 3) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState("loading");
    try {
      const places = await searchOsmLocations(query, bounds, controller.signal);
      if (controller.signal.aborted) return;
      setResults(places.filter((place) => findRegionForPoint(regions, place.lon, place.lat)));
      setState("done");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Pencarian lokasi gagal. Coba lagi.");
      setState("error");
    }
  };

  return (
    <section className="t-osm-search" aria-label="Pencarian lokasi OSM">
      <button type="button" className="t-osm-search__search" onClick={() => void search()} disabled={query.trim().length < 3 || !bounds || state === "loading"}>Cari lokasi OSM</button>
      <p className="t-osm-search__hint">Cari tempat atau alamat di {cityName}. Minimal 3 karakter.</p>
      <div role="status" aria-live="polite">
        {state === "loading" && <p>Mencari lokasi di OpenStreetMap…</p>}
        {state === "done" && results.length === 0 && <p>Tidak ada lokasi OSM yang cocok di {cityName}. Coba nama atau alamat lain.</p>}
      </div>
      {state === "error" && <p role="alert">{error} Tekan Cari lokasi OSM untuk mencoba lagi.</p>}
      {results.length > 0 && <ul className="t-osm-search__results">{results.map((place) => <li key={place.id}>
        <button type="button" aria-label={place.name} aria-pressed={selected?.id === place.id} onClick={() => onSelect(place)}><strong>{place.name}</strong><span>{place.address}</span></button>
      </li>)}</ul>}
      {selected && <div className="t-osm-search__selected">
        <strong>{selected.name}</strong>
        <p>{selected.sourceLabel ?? "Lokasi OSM, belum diverifikasi TAPETA"}</p>
        {selected.sourceLabel !== "Tidak lagi diterbitkan" && <SavePlaceButton target={selected.destinationId ? { destinationId: selected.destinationId } : { osm: selected, city: city ?? PEKANBARU_CITY }} />}
        <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Lihat sumber OpenStreetMap</a>
        {!selected.destinationId && <button type="button" onClick={() => onSuggest(selected)}>Usulkan tempat ini</button>}
      </div>}
      {(results.length > 0 || selected) && <small>© kontributor OpenStreetMap · ODbL</small>}
    </section>
  );
}
