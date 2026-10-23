import { useState } from "react";
import type { Category, Destination } from "../types";
import { DesainTopbar } from "./Topbar";
import { NoticeDialog } from "../components/NoticeDialog";

export interface PerbaikanProps {
  cityName: string;
  provinceName: string;
  destinations: Destination[];
  categoriesById: Map<string, Category>;
  onOpenContribute: () => void;
  onOpenCityPicker: () => void;
  onOpenDestination: (id: string) => void;
}

const NOTES = [
  {
    icon: "!",
    title: "Alamat terlalu umum",
    body: "Tambahkan nama jalan atau patokan yang bisa dipakai pengunjung untuk menemukan tempatnya.",
  },
  {
    icon: "!",
    title: "Foto bukan milik sendiri",
    body: "Ganti dengan foto berlisensi, atau kosongkan saja. Usulan tetap bisa terbit tanpa foto.",
  },
];

export function Perbaikan({
  cityName,
  provinceName,
  onOpenContribute,
  onOpenCityPicker,
}: PerbaikanProps) {
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  return (
    <div className="t-app t-app--doc">
      <DesainTopbar
        active="my"
        cityName={cityName}
        provinceName={provinceName}
        onOpenCityPicker={onOpenCityPicker}
      />
      <div className="t-doc t-doc--narrow">
        <div className="t-doc__head">
          <span className="t-doc__eyebrow">CONTOH KEADAAN · USULAN PERLU PERBAIKAN</span>
          <h1 className="t-doc__title t-doc__title--xl">Usulanmu perlu sedikit perbaikan</h1>
          <p className="t-doc__lead">
            Beginilah catatan moderator saat usulan perlu diperbaiki. Perbaiki lalu kirim ulang,
            kamu tidak perlu memulai dari awal.
          </p>
          <span className="t-pillstatus">
            <i aria-hidden="true" />
            Perlu perbaikan
          </span>
        </div>

        <section className="t-notes">
          <header className="t-notes__head">
            <span className="t-notes__avatar" aria-hidden="true">M</span>
            <span className="t-notes__who">
              <span className="t-notes__name">Catatan moderator</span>
              <span className="t-notes__when">Contoh tampilan, bukan usulan nyata</span>
            </span>
          </header>
          <div className="t-notes__list">
            {NOTES.map((note) => (
              <div key={note.title} className="t-notes__item">
                <span className="t-notes__icon" aria-hidden="true">{note.icon}</span>
                <span className="t-notes__text">
                  <span className="t-notes__title">{note.title}</span>
                  <span className="t-notes__body">{note.body}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="t-notes__actions">
            <button type="button" className="t-btn t-btn--brick t-notes__fix" onClick={onOpenContribute}>
              Perbaiki usulan
            </button>
          </div>
          <div className="t-notes__foot">
            <button
              type="button"
              className="t-notes__guide"
              onClick={() =>
                setNotice({
                  title: "Panduan kontribusi",
                  body: "Panduan lengkap pengusulan dan perbaikan tempat sedang disusun. Sementara ini, gunakan alur kontribusi untuk mengirim usulan baru atau perbaikan.",
                })
              }
            >
              Bingung cara memperbaiki? Baca panduan kontribusi
            </button>
            <span className="t-notes__privacy">Data pribadi tidak pernah ditampilkan publik.</span>
          </div>
        </section>

      </div>
      <NoticeDialog open={Boolean(notice)} title={notice?.title ?? ""} body={notice?.body ?? ""} onClose={() => setNotice(null)} />
    </div>
  );
}
