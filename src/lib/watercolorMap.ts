import L from "leaflet";
import type { RegionFeature } from "../types";

/** Real vector geography, with TAPETA's existing cream/sage/aqua palette. */
export async function mountWatercolorMap(
  map: L.Map,
  regions: RegionFeature[],
  onError: () => void,
  isActive = () => true,
) {
  const [{ default: style }] = await Promise.all([
    import("../data/pekanbaruMapStyle.json"),
    import("maplibre-gl/dist/maplibre-gl.css"),
    import("@maplibre/maplibre-gl-leaflet"),
  ]);
  if (!isActive()) return () => undefined;
  let removed = false;
  const pane =
    map.getPane("tapetaWatercolor") ?? map.createPane("tapetaWatercolor");
  pane.style.zIndex = "250";
  pane.style.pointerEvents = "none";
  // The bridge uses Leaflet's coordinates; geometry and markers share one projection.
  const layer = L.maplibreGL({
    style: style as import("maplibre-gl").StyleSpecification,
    interactive: false,
    pane: "tapetaWatercolor",
  } as L.LeafletMaplibreGLOptions).addTo(map);
  const surface = layer.getContainer();
  surface.classList.add("tapeta-watercolor-surface");
  const gl = layer.getMaplibreMap();
  let failures = 0;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    map.off("move zoom resize viewreset", clip);
    if (map.hasLayer(layer)) map.removeLayer(layer);
  };
  const fail = () => {
    if (!removed) {
      cleanup();
      onError();
    }
  };
  gl.on("error", () => {
    if (++failures >= 4) fail();
  });
  // Clip actual map content to the city's actual district geometry, including holes.
  function clip() {
    if (removed) return;
    const path = regions
      .flatMap((region) => {
        const polygons =
          region.geometry.type === "Polygon"
            ? [region.geometry.coordinates]
            : region.geometry.coordinates;
        return polygons.flatMap((polygon) =>
          polygon.map(
            (ring) =>
              ring
                .map(([lon, lat], index) => {
                  const p = map.latLngToLayerPoint([lat, lon]);
                  return `${index ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
                })
                .join(" ") + " Z",
          ),
        );
      })
      .join(" ");
    pane.style.clipPath = regions.length ? `path(evenodd, "${path}")` : "none";
  }
  clip();
  map.on("move zoom resize viewreset", clip);
  map.attributionControl.addAttribution(
    '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a>',
  );
  const timer = window.setTimeout(() => {
    if (!removed && !gl.isStyleLoaded()) fail();
  }, 20000);
  return () => {
    window.clearTimeout(timer);
    cleanup();
    map.attributionControl.removeAttribution(
      '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a>',
    );
  };
}
