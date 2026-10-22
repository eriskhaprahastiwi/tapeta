import { useEffect, useState } from "react";
import type { Category, CategoryId, Destination, RegionFeature, RegionStats } from "../types";
import { DesainTopbar } from "./Topbar";
import { NoticeDialog } from "../components/NoticeDialog";
import { MapView } from "../components/MapView";
import { addSubmission } from "../lib/submissions";
import { readSession } from "../lib/session";
import { isBackendConfigured } from "../lib/supabase";

type Step = 1 | 2 | 3;

export interface ContributeProps {
  cityId: string;
  cityName: string;
  provinceName: string;
  regions: RegionFeature[];
  regionStats: RegionStats[];
  destinations: Destination[];
  categories: Category[];
  onClose: () => void;
  onOpenCityPicker: () => void;
  onSubmitted: (submissionId: string) => void;
}

interface Draft {
  name: string;
  categoryId: CategoryId;
  address: string;
  hours: string;
  source: string;
  description: string;
  lat: number | null;
  lon: number | null;
  agreed: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  categoryId: "kafe",
  address: "",
  hours: "",
  source: "",
  description: "",
  lat: null,
  lon: null,
  agreed: false,
};

function findRegionForPoint(regions: RegionFeature[], lat: number, lon: number) {
  const inside = (ring: number[][]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  for (const region of regions) {
    const geometry = region.geometry;
    const polygons =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      if (polygon.length === 0) continue;
      if (!inside(polygon[0] as number[][])) continue;
      const inHole = polygon.slice(1).some((ring) => inside(ring as number[][]));
      if (!inHole) return region;
    }
  }
  return null;
}

export function Contribute(props: ContributeProps) {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [located, setLocated] = useState(false);
  const session = readSession();
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validCoordinates = draft.lat !== null && draft.lon !== null && Number.isFinite(draft.lat) && Number.isFinite(draft.lon)
    && draft.lat >= -90 && draft.lat <= 90 && draft.lon >= -180 && draft.lon <= 180;
  const canSubmit =
    draft.agreed &&
    draft.name.trim().length >= 2 &&
    draft.address.trim().length >= 4 &&
    draft.source.trim().length >= 4 &&
    validCoordinates;

  const submit = async () => {
    if (!canSubmit || draft.lat === null || draft.lon === null) return;
    if (!session) { setNotice({ title: "Masuk diperlukan", body: "Masuk atau buat akun TAPETA sebelum mengirim usulan." }); return; }
    if (!isBackendConfigured) { setNotice({ title: "Backend belum dikonfigurasi", body: "Usulan belum bisa disimpan. Hubungkan Supabase melalui file .env terlebih dahulu." }); return; }
    setSubmitting(true);
    try {
    const saved = await addSubmission({
      name: draft.name.trim(),
      categoryId: draft.categoryId,
      address: draft.address.trim(),
      hours: draft.hours.trim(),
      source: draft.source.trim(),
      description: draft.description.trim(),
      lat: draft.lat,
      lon: draft.lon,
      regionName: detected?.properties.code ?? "",
      submittedBy: session.name,
    }, props.cityId);
    props.onSubmitted(saved.id);
    } catch (cause) {
      setNotice({ title: "Usulan belum terkirim", body: cause instanceof Error ? cause.message : "Periksa koneksi dan coba lagi." });
    } finally { setSubmitting(false); }
  };

  const detected = draft.lat !== null && draft.lon !== null
    ? findRegionForPoint(props.regions, draft.lat, draft.lon)
    : null;

  const handlePick = (lat: number, lon: number) => {
    setDraft((current) => ({ ...current, lat, lon }));
    setLocated(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const canContinue = validCoordinates;

  return (
    <div className="t-app t-app--contribute">
      <DesainTopbar
        active="explore"
        cityName={props.cityName}
        provinceName={props.provinceName}
        onOpenCityPicker={props.onOpenCityPicker}
      />

      <div className="t-app__main">
        <main className="t-mapwrap t-mapwrap--solo">
          <div className="t-mapstage">
            <MapView
              regions={props.regions}
              regionStats={props.regionStats}
              destinations={props.destinations}
              categoriesById={new Map(props.categories.map((item) => [item.id, item]))}
              cityName={props.cityName}
              selectedRegionId={null}
              selectedDestinationId={null}
              userLocation={null}
              focus={null}
              resetNonce={0}
              isLoading={false}
              loadingLabel="Memuat"
              error={null}
              onRetry={() => undefined}
              onSelectRegion={() => undefined}
              onSelectDestination={() => undefined}
              onClearSelection={() => undefined}
              onPickPoint={handlePick}
              pickedPoint={
                draft.lat !== null && draft.lon !== null ? { lat: draft.lat, lon: draft.lon } : null
              }
            />
            {!located && (
              <span className="t-contrib__hint" role="status">
                <span className="t-contrib__hinticon" aria-hidden="true">⌖</span>
                Ketuk peta untuk menandai lokasi
              </span>
            )}
          </div>
        </main>

        <aside className={`t-contrib${step === 2 ? " t-contrib--light" : ""}`} aria-label="Usulkan tempat">
          <div className="t-contrib__head">
            <span className="t-contrib__title">Usulkan tempat</span>
            <button type="button" className="t-contrib__close" onClick={props.onClose} aria-label="Tutup">
              ✕
            </button>
          </div>
          <div className="t-contrib__steps" aria-label="Langkah pengusulan">
            <StepDot index={1} label="Lokasi" step={step} done={step > 1} />
            <span className="t-contrib__stepline" aria-hidden="true" />
            <StepDot index={2} label="Detail" step={step} done={step > 2} />
            <span className="t-contrib__stepline" aria-hidden="true" />
            <StepDot index={3} label="Tinjau" step={step} done={false} />
          </div>

          {step === 1 && (
            <div className="t-contrib__body">
              <h2 className="t-contrib__h">Tandai lokasi tempatnya</h2>
              <p className="t-contrib__p">
                Geser peta dan ketuk titik yang tepat. Koordinat ini dipakai admin untuk memeriksa
                usulan.
              </p>
              <div className="t-contrib__coord">
                <div className="t-contrib__coordrow">
                  <div className="t-contrib__field">
                    <span className="t-contrib__label">LINTANG</span>
                    <input aria-label="Lintang" type="number" min={-90} max={90} step="any" value={draft.lat ?? ""}
                      onChange={(event) => setDraft((current) => ({ ...current, lat: event.target.value === "" ? null : Number(event.target.value) }))} />
                  </div>
                  <div className="t-contrib__field">
                    <span className="t-contrib__label">BUJUR</span>
                    <input aria-label="Bujur" type="number" min={-180} max={180} step="any" value={draft.lon ?? ""}
                      onChange={(event) => setDraft((current) => ({ ...current, lon: event.target.value === "" ? null : Number(event.target.value) }))} />
                  </div>
                </div>
                <span className="t-contrib__detected">
                  {detected ? `Kecamatan terdeteksi · ${detected.properties.name}` : "Kecamatan belum terdeteksi"}
                </span>
                <span className="t-contrib__note">Titik bisa digeser sebelum lanjut.</span>
              </div>
              <button
                type="button"
                className="t-contrib__locate"
                onClick={() => {
                  if (!("geolocation" in navigator)) {
                    setNotice({ title: "Lokasi tidak tersedia", body: "Peramban ini tidak mendukung layanan lokasi. Pilih titik secara manual di peta." });
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      handlePick(position.coords.latitude, position.coords.longitude);
                    },
                    () => {
                      setNotice({ title: "Izin lokasi ditolak", body: "Aktifkan izin lokasi, atau pilih titik secara manual di peta." });
                    },
                    { enableHighAccuracy: true, timeout: 10000 },
                  );
                }}
              >
                <span aria-hidden="true">◎</span>
                Gunakan lokasi saya
              </button>
              <div className="t-contrib__ready">
                <span className="t-contrib__readyh">Yang perlu disiapkan</span>
                <span className="t-contrib__readyp">· Nama tempat dan kategori</span>
                <span className="t-contrib__readyp">· Alamat atau sumber informasi</span>
                <span className="t-contrib__readyp">· Foto berlisensi (opsional)</span>
              </div>
              <div className="t-contrib__auth">
                <span className="t-contrib__authh">Masuk diperlukan untuk mengirim</span>
                <span className="t-contrib__authp">
                  Usulan tetap bisa disiapkan dulu. Isi formulir, lalu masuk sebelum mengirim.
                </span>
              </div>
              <div className="t-contrib__foot">
                <button
                  type="button"
                  className="t-contrib__next"
                  disabled={!canContinue}
                  onClick={() => setStep(2)}
                >
                  Lanjut ke detail →
                </button>
                <button type="button" className="t-contrib__cancel" onClick={props.onClose}>
                  Batal
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="t-contrib__body">
              <h2 className="t-contrib__h t-contrib__h--light">Detail tempatnya</h2>
              <p className="t-contrib__p t-contrib__p--light">
                Isi yang kamu tahu. Kolom bertanda * wajib diisi.
              </p>
              <div className="t-contrib__form">
                <label className="t-contrib__f">
                  <span className="t-contrib__flabel">Nama tempat *</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="Coffe Toffe Pekanbaru"
                  />
                </label>
                <label className="t-contrib__f">
                  <span className="t-contrib__flabel">Kategori *</span>
                  <select
                    value={draft.categoryId}
                    onChange={(event) => setDraft({ ...draft, categoryId: event.target.value as CategoryId })}
                  >
                    {props.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="t-contrib__f">
                  <span className="t-contrib__flabel">Alamat *</span>
                  <input
                    type="text"
                    value={draft.address}
                    onChange={(event) => setDraft({ ...draft, address: event.target.value })}
                    placeholder="Jl. Sisingamangaraja, Kec. Lima Puluh"
                  />
                </label>
                <div className="t-contrib__pair">
                  <label className="t-contrib__f">
                    <span className="t-contrib__flabel">Jam buka</span>
                    <input
                      type="text"
                      value={draft.hours}
                      onChange={(event) => setDraft({ ...draft, hours: event.target.value })}
                      placeholder="08.00 – 22.00"
                    />
                  </label>
                  <label className="t-contrib__f">
                    <span className="t-contrib__flabel">Sumber informasi * (minimal 4 karakter)</span>
                    <input
                      type="text"
                      value={draft.source}
                      onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                      placeholder="Instagram resmi"
                    />
                  </label>
                </div>
                <label className="t-contrib__f">
                  <span className="t-contrib__flabel">Deskripsi</span>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    placeholder="Ceritakan suasana, menu, atau hal yang membuat tempat ini layak dikunjungi."
                  />
                </label>
                <div className="t-contrib__f">
                  <span className="t-contrib__flabel">FOTO BERLISENSI (OPSIONAL)</span>
                  <span className="t-contrib__upload" aria-disabled="true">
                    <span className="t-contrib__uploadtext">
                      <span className="t-contrib__uploadh">Foto opsional</span>
                      <span className="t-contrib__uploadp">Unggah foto akan diaktifkan setelah penyimpanan media dan pemeriksaan lisensi disiapkan.</span>
                    </span>
                  </span>
                </div>
                <label className="t-contrib__agree">
                  <input
                    type="checkbox"
                    checked={draft.agreed}
                    onChange={(event) => setDraft({ ...draft, agreed: event.target.checked })}
                  />
                  <span>Saya menyatakan informasi ini benar dan sumbernya dapat diperiksa.</span>
                </label>
                <div className="t-contrib__signin">
                  <span>
                    {session
                      ? `Dikirim sebagai ${session.name}`
                      : "Masuk diperlukan sebelum mengirim usulan"}
                  </span>
                  <span className="t-contrib__signinnote">
                  Usulan tersimpan sebagai menunggu tinjauan dan tidak tampil di peta sebelum diverifikasi.
                  </span>
                </div>
                <button
                  type="button"
                  className="t-contrib__submit"
                  onClick={submit}
                  disabled={!canSubmit || submitting || !session || !isBackendConfigured}
                  title={
                    canSubmit
                      ? "Kirim usulan untuk ditinjau"
                      : "Lengkapi nama, alamat, sumber, koordinat, dan pernyataan"
                  }
                >
                  {submitting ? "Mengirim…" : "Kirim usulan ke antrean moderasi"}
                </button>
                <button type="button" className="t-contrib__back" onClick={() => setStep(1)}>
                  ‹ Kembali ke lokasi
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      <NoticeDialog open={Boolean(notice)} title={notice?.title ?? ""} body={notice?.body ?? ""} onClose={() => setNotice(null)} />
    </div>
  );
}

function StepDot({
  index,
  label,
  step,
  done,
}: {
  index: number;
  label: string;
  step: Step;
  done: boolean;
}) {
  const active = step === index;
  const className = `t-contrib__step${active ? " is-active" : ""}${done ? " is-done" : ""}`;
  return (
    <span className={className}>
      <span className="t-contrib__stepnum">{done ? "✓" : index}</span>
      <span className="t-contrib__steplabel">{label}</span>
    </span>
  );
}
