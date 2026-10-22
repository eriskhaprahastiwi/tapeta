import { useEffect, useRef } from "react";

export interface NoticeDialogProps {
  open: boolean;
  title: string;
  body: string;
  hint?: string;
  confirmLabel?: string;
  onClose: () => void;
}

/**
 * Dialog keadaan jujur: dipakai ketika sebuah aksi memerlukan backend yang
 * belum ada. Tidak ada tombol yang seolah-olah berhasil — hanya penjelasan
 * dan tombol tutup.
 */
export function NoticeDialog({
  open,
  title,
  body,
  hint,
  confirmLabel = "Mengerti",
  onClose,
}: NoticeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="t-notice"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="t-notice-title"
    >
      <div className="t-notice__panel">
        <span className="t-notice__kicker">INFORMASI TAPETA</span>
        <h2 id="t-notice-title" className="t-notice__title">
          {title}
        </h2>
        <p className="t-notice__body">{body}</p>
        {hint && <p className="t-notice__hint">{hint}</p>}
        <button type="button" className="t-notice__ok" onClick={onClose}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
