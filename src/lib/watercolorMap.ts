import L from "leaflet";
import type { RegionFeature } from "../types";
import { buildMaskedPekanbaruWatercolor } from "./watercolorClip";
import { PEKANBARU_WATERCOLOR_BOUNDS } from "../data/pekanbaruWatercolor";

/** Watercolor illustration calibrated to the real Pekanbaru geographic bounds. */
export async function mountWatercolorMap(
  map: L.Map,
  regions: RegionFeature[],
  onError: () => void,
  isActive = () => true,
) {
  if (!isActive()) return () => undefined;
  const image = await buildMaskedPekanbaruWatercolor(regions);
  if (!image || !isActive()) { onError(); return () => undefined; }
  let removed = false;
  const pane = map.getPane("tapetaWatercolor") ?? map.createPane("tapetaWatercolor");
  pane.style.zIndex = "250";
  pane.style.pointerEvents = "none";
  const bounds: L.LatLngBoundsExpression = [
    [PEKANBARU_WATERCOLOR_BOUNDS.south, PEKANBARU_WATERCOLOR_BOUNDS.west],
    [PEKANBARU_WATERCOLOR_BOUNDS.north, PEKANBARU_WATERCOLOR_BOUNDS.east],
  ];
  const layer = L.imageOverlay(image, bounds, { opacity: 0.96, interactive: false, pane: "tapetaWatercolor" }).addTo(map);
  const cleanup = () => {
    if (removed) return;
    removed = true;
    map.off("move zoom resize viewreset", sync);
    if (map.hasLayer(layer)) map.removeLayer(layer);
  };
  function sync() { if (!removed) layer.setOpacity(0.96); }
  map.on("move zoom resize viewreset", sync);
  map.attributionControl.addAttribution('<span>Ilustrasi cat air TAPETA · batas geografis OSM</span>');
  return () => {
    cleanup();
    map.attributionControl.removeAttribution('<span>Ilustrasi cat air TAPETA · batas geografis OSM</span>');
  };
}
