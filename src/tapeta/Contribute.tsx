import { useEffect, useState } from "react";
import type { Category, CategoryId, Destination, RegionFeature, RegionStats } from "../types";
import { DesainTopbar } from "./Topbar";
import { NoticeDialog } from "../components/NoticeDialog";
import { MapView } from "../components/MapView";
import { addSubmission } from "../lib/submissions";
import { readSession } from "../lib/session";
import { isBackendConfigured } from "../lib/supabase";
import { findRegionForPoint } from "../lib/geo";
import { useChrome } from "./ChromeContext";
import type { OsmLocation } from "../types";

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
  initialPlace?: OsmLocation | null;
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

export function Contribute(props: ContributeProps) {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(() => props.initialPlace ? {
    ...EMPTY_DRAFT, name: props.initialPlace.name, address: props.initialPlace.address,
    lat: props.initialPlace.lat, lon: props.initialPlace.lon, source: props.initialPlace.sourceUrl,
  } : EMPTY_DRAFT);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [manualCoordinateEdits, setManualCoordinateEdits] = useState({ lat: false, lon: false });
  const { account } = useChrome();
  const session = readSession();
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validCoordinates = draft.lat !== null && draft.lon !== null && Number.isFinite(draft.lat) && Number.isFinite(draft.lon)
    && draft.lat >= -90 && draft.lat <= 90 && draft.lon >= -180 && draft.lon <= 180;
  const hasCoordinates = draft.lat !== null && draft.lon !== null;
  const detected = hasCoordinates
    ? findRegionForPoint(props.regions, draft.lon!, draft.lat!)
    : null;
  const gpsNeedsManualConfirmation = gpsAccuracy !== null && gpsAccuracy > 100 && !gpsConfirmed;
  const gpsAccuracyLabel = gpsAccuracy === null
    ? null
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(gpsAccuracy));
  const validLocation = validCoordinates && detected !== null && !gpsNeedsManualConfirmation;
  const missingRequirements = [
    ...(draft.name.trim().length < 2 ? ["Isi nama tempat minimal 2 karakter."] : []),
    ...(draft.address.trim().length < 4 ? ["Isi alamat minimal 4 karakter."] : []),
    ...(draft.source.trim().length < 4 ? ["Isi sumber informasi minimal 4 karakter, misalnya akun Instagram resmi atau pengamatan langsung."] : []),
    ...(!draft.agreed ? ["Centang pernyataan bahwa informasi benar dan sumbernya dapat diperiksa."] : []),
    ...(!validLocation ? [gpsNeedsManualConfirmation ? "Kembali ke lokasi dan konfirmasi titik GPS dengan mengetuk peta." : `Kembali ke lokasi dan pilih titik di dalam batas ${props.cityName}.`] : []),
  ];
  const canSubmit = missingRequirements.length === 0;

  const locationStatus = props.regions.length === 0
    ? "Batas wilayah kota belum tersedia"
    : gpsNeedsManualConfirmation
      ? "Akurasi GPS perlu dikonfirmasi"
      : !hasCoordinates
        ? "Kecamatan belum terdeteksi"
        : !validCoordinates
          ? "Koordinat tidak valid"
          : detected
            ? `Kecamatan terdeteksi · ${detected.properties.name}`
            : `Titik di luar batas ${props.cityName}`;
  const locationHelp = props.regions.length === 0
    ? "Batas wilayah belum termuat, jadi lokasi belum bisa dilanjutkan."
    : gpsNeedsManualConfirmation
      ? `Akurasi GPS ±${gpsAccuracyLabel} m. Ketuk peta atau isi ulang lintang dan bujur untuk memastikan titik.`
      : gpsAccuracyLabel
        ? `Akurasi GPS ±${gpsAccuracyLabel} m. Ketuk peta jika titik perlu dikoreksi.`
        : hasCoordinates && validCoordinates && !detected
          ? `Pilih titik di dalam batas ${props.cityName} atau ubah koordinat.`
          : hasCoordinates && !validCoordinates
            ? "Periksa kembali rentang lintang dan bujur."
            : "Ketuk titik lain di peta atau ubah koordinat sebelum lanjut.";

  const submit = async () => {
    if (!canSubmit || draft.lat === null || draft.lon === null) return;
    if (!isBackendConfigured) { setNotice({ title: "Backend belum dikonfigurasi", body: "Usulan belum bisa disimpan. Hubungkan Supabase melalui file .env terlebih dahulu." }); return; }
    if (!session) { account.onOpenAuth(); return; }
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

  const handlePick = (lat: number, lon: number) => {
    setGpsAccuracy(null);
    setGpsConfirmed(false);
    setManualCoordinateEdits({ lat: false, lon: false });
    setDraft((current) => ({ ...current, lat, lon }));
  };

  const updateCoordinate = (axis: "lat" | "lon", value: string) => {
    const nextEdits = { ...manualCoordinateEdits, [axis]: true };
    setManualCoordinateEdits(nextEdits);
    if (gpsAccuracy !== null && gpsAccuracy <= 100) {
      setGpsAccuracy(null);
      setGpsConfirmed(false);
    } else if (gpsNeedsManualConfirmation && nextEdits.lat && nextEdits.lon) {
      setGpsAccuracy(null);
      setGpsConfirmed(true);
    }
    setDraft((current) => ({ ...current, [axis]: value === "" ? null : Number(value) }));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const canContinue = validLocation;

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
            <span className="t-contrib__hint" role="status">
              <span className="t-contrib__hinticon" aria-hidden="true">⌖</span>
              {gpsNeedsManualConfirmation
                ? `GPS ±${gpsAccuracyLabel} m. Pilih titik di peta untuk konfirmasi.`
                : validLocation
                ? "Titik terpilih. Ketuk peta untuk memilih ulang."
                : validCoordinates
                  ? `Titik di luar ${props.cityName}. Pilih titik lain di peta.`
                  : "Pilih titik di peta, tidak harus berada di sana."}
            </span>
          </div>
        </main>

        <aside className={`t-contrib${step === 2 ? " t-contrib--light" : ""}`} aria-label="Usulkan tempat">
          <div className="t-contrib__head">
            <h1 className="t-contrib__title">Usulkan tempat</h1>
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
                      onChange={(event) => updateCoordinate("lat", event.target.value)} />
                  </div>
                  <div className="t-contrib__field">
                    <span className="t-contrib__label">BUJUR</span>
                    <input aria-label="Bujur" type="number" min={-180} max={180} step="any" value={draft.lon ?? ""}
                      onChange={(event) => updateCoordinate("lon", event.target.value)} />
                  </div>
                </div>
                <span className={`t-contrib__detected${gpsNeedsManualConfirmation || (hasCoordinates && validCoordinates && !detected) ? " t-contrib__detected--error" : ""}`} role="status">
                  {locationStatus}
                </span>
                <span className="t-contrib__note" role="status">{locationHelp}</span>
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
                      setGpsAccuracy(position.coords.accuracy);
                      setGpsConfirmed(position.coords.accuracy <= 100);
                      setManualCoordinateEdits({ lat: false, lon: false });
                      setDraft((current) => ({ ...current, lat: position.coords.latitude, lon: position.coords.longitude }));
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
                      : "Masuk diperlukan sebelum mengirim. Draf tetap tersimpan saat masuk."}
                  </span>
                  <span className="t-contrib__signinnote">
                  Usulan tersimpan sebagai menunggu tinjauan dan tidak tampil di peta sebelum diverifikasi.
                  </span>
                </div>
                {missingRequirements.length > 0 && (
                  <div className="t-contrib__validation" id="t-contrib-validation" role="status" aria-live="polite">
                    <p>Sebelum usulan bisa dikirim:</p>
                    <ul>{missingRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
                  </div>
                )}
                <button
                  type="button"
                  className="t-contrib__submit"
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  aria-describedby={missingRequirements.length > 0 ? "t-contrib-validation" : undefined}
                  title={
                    canSubmit
                      ? "Kirim usulan untuk ditinjau"
                      : "Lengkapi nama, alamat, sumber, koordinat, dan pernyataan"
                  }
                >
                  {submitting ? "Mengirim…" : session ? "Kirim usulan ke antrean moderasi" : "Masuk untuk mengirim usulan"}
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
