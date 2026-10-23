import { DesainTopbar } from "./Topbar";
import { formatSubmitted, listSubmissions } from "../lib/submissions";

export interface SubmissionResultProps {
  submissionId: string | null;
  onBackToMap: () => void;
  onOpenQueue: () => void;
}

export function SubmissionResult({ submissionId, onBackToMap, onOpenQueue }: SubmissionResultProps) {
  const submission = listSubmissions().find((item) => item.id === submissionId) ?? null;
  return (
    <div className="t-app t-app--doc">
      <DesainTopbar
        active="explore"
        cityName="Pekanbaru"
        provinceName="Riau"
        onOpenCityPicker={() => undefined}
      />
      <div className="t-doc t-doc--narrow">
        <div className="t-doc__head">
          <span className="t-doc__eyebrow">USULAN TERSIMPAN · {submission?.id ?? "Belum tersedia"}</span>
          <h1 className="t-doc__title t-doc__title--xl">Usulan masuk antrean moderasi</h1>
          <p className="t-doc__lead">
            Terima kasih. Usulanmu tersimpan di server dan belum tampil di peta.
            Tempat baru diterbitkan setelah ditinjau moderator.
          </p>
          <span className="t-pillstatus">
            <i aria-hidden="true" />
            Menunggu tinjauan
          </span>
        </div>

        {submission && (
          <section className="t-notes">
            <header className="t-notes__head">
              <span className="t-notes__avatar" aria-hidden="true">⌖</span>
              <span className="t-notes__who">
                <span className="t-notes__name">{submission.name}</span>
                <span className="t-notes__when">
                  Dikirim {formatSubmitted(submission.submittedAt)} · {submission.submittedBy}
                </span>
              </span>
            </header>
            <div className="t-notes__list">
              <div className="t-notes__item">
                <span className="t-notes__icon" aria-hidden="true">i</span>
                <span className="t-notes__text">
                  <span className="t-notes__title">Alamat</span>
                  <span className="t-notes__body">{submission.address}</span>
                </span>
              </div>
              <div className="t-notes__item">
                <span className="t-notes__icon" aria-hidden="true">i</span>
                <span className="t-notes__text">
                  <span className="t-notes__title">Koordinat</span>
                  <span className="t-notes__body">
                    {submission.lat.toFixed(4).replace(".", ",")}° LU ·{" "}
                    {submission.lon.toFixed(4).replace(".", ",")}° BT
                    {submission.regionName ? ` · Kec. ${submission.regionName}` : ""}
                  </span>
                </span>
              </div>
            </div>
            <div className="t-notes__actions">
              <button type="button" className="t-btn t-btn--brick t-notes__fix" onClick={onOpenQueue}>
                Lihat kontribusiku
              </button>
              <button type="button" className="t-notes__withdraw" onClick={onBackToMap}>
                Kembali ke peta
              </button>
            </div>
            <div className="t-notes__foot">
              <span className="t-notes__privacy">
                Pantau status dan catatan moderator di My TAPETA.
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
