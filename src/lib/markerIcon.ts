import L from "leaflet";
import type { CategoryId } from "../types";

export const MARKER_GLYPHS: Record<CategoryId, string> = {
  kafe: '<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 10h1.4a2.1 2.1 0 0 1 0 4.2H16"/><path d="M4 21h13"/>',
  kuliner:
    '<path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M7 12c0-3 2.2-5 5-5s5 2 5 5"/><path d="M3 20h18"/>',
  alam: '<path d="m3 19 5.5-9 3.2 4.6L15 9l6 10H3Z"/><circle cx="18" cy="6" r="2"/>',
  budaya: '<path d="M3 10 12 4l9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 19h18"/>',
  rekreasi:
    '<circle cx="12" cy="10" r="6.5"/><path d="M12 3.5V10M6.4 6.8 12 10M17.6 6.8 12 10M12 16.5V22M7 22h10"/>',
  lainnya:
    '<circle cx="12" cy="12" r="8"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
};

export function createMarkerIcon(
  category: CategoryId,
  active = false,
  compact = false,
  color = "#23241f",
) {
  if (compact) {
    return L.divIcon({
      className: "marker-icon marker-icon--compact",
      html: `<span class="marker-dot" style="background:${color}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  return L.divIcon({
    className: "marker-icon",
    html: `<span class="marker-pin${active ? " is-active" : ""}" style="background:${color}"><span class="marker-pin__glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MARKER_GLYPHS[category]}</svg></span></span>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
  });
}
