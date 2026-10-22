import type { CityContext, Destination, RegionStats } from "../../types";
import { CATEGORY_BY_ID } from "../../data/categories";
import { MapView } from "../MapView";
import { DesainTopbar } from "../../tapeta/Topbar";
import "./AtlasView.css";

export interface AtlasViewProps {
  city: CityContext | null;
  destinations: Destination[];
  regionStats: RegionStats[];
  onOpenMap: () => void;
  onOpenHome: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
}

export function AtlasView({ city, destinations, regionStats, onOpenMap, onOpenCityPicker, onOpenDestination }: AtlasViewProps) {
  const stickers = destinations.filter((destination) => destination.sticker);
  return <div className="t-app">
    <DesainTopbar active="explore" cityName={city?.name ?? "Pekanbaru"} provinceName={city?.province ?? ""} onOpenCityPicker={onOpenCityPicker} />
    <main style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <header style={{ padding: "16px 20px" }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Atlas Stiker</h1>
        <p>Stiker terbit mengikuti koordinat destinasi. Perbesar peta untuk melihat ilustrasinya.</p>
        <button className="t-btn" onClick={onOpenMap}>Semua destinasi</button>
        {stickers.length === 0 && <p role="status">Belum ada stiker yang diterbitkan di kota ini.</p>}
      </header>
      <div style={{ flex: 1, minHeight: 350, position: "relative" }}>
        <MapView regions={city?.regions ?? []} regionStats={regionStats} destinations={stickers} categoriesById={CATEGORY_BY_ID}
          cityName={city?.name ?? null} selectedRegionId={null} selectedDestinationId={null} userLocation={null} focus={null}
          resetNonce={0} isLoading={!city} loadingLabel="Memuat wilayah" error={null} onRetry={onOpenMap}
          onSelectRegion={() => {}} onClearSelection={() => {}} onSelectDestination={onOpenDestination} />
      </div>
    </main>
  </div>;
}
