import { useEffect, useRef } from "react";
import { CloseIcon, LocateIcon, PinIcon } from "./Icons";

interface EntryLocationPromptProps {
  open: boolean;
  locating: boolean;
  onClose: () => void;
  onUseLocation: () => void;
  onChooseCity: () => void;
  onExploreWithoutCity: () => void;
}

export function EntryLocationPrompt({ open, locating, onClose, onUseLocation, onChooseCity, onExploreWithoutCity }: EntryLocationPromptProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="entry-location" aria-labelledby="entry-location-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="entry-location__panel">
        <button type="button" className="entry-location__close" onClick={onClose} aria-label="Tutup pilihan lokasi"><CloseIcon size={18} /></button>
        <span className="entry-location__mark" aria-hidden="true"><PinIcon size={22} /></span>
        <p className="entry-location__eyebrow">TITIK AWAL</p>
        <h2 id="entry-location-title">Mulai dari mana?</h2>
        <p className="entry-location__lead">Pilih kota untuk melihat cerita dan tempat warga, atau mulai dari peta Indonesia tanpa konteks kota.</p>
        <div className="entry-location__actions">
          <button type="button" className="entry-location__primary" onClick={onUseLocation} disabled={locating}><LocateIcon size={18} />{locating ? "Mencari lokasi..." : "Gunakan lokasi saya"}</button>
          <button type="button" className="entry-location__city" onClick={onChooseCity}><PinIcon size={18} />Cari kota atau kabupaten</button>
          <button type="button" className="entry-location__unscoped" onClick={onExploreWithoutCity}>Jelajahi peta Indonesia dulu</button>
        </div>
      </section>
    </dialog>
  );
}
