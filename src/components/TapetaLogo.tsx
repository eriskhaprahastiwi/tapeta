import type { CSSProperties } from "react";

/**
 * Lambang TAPETA — sumber tunggal identitas visual.
 *
 * Geometri diambil apa adanya dari `TAPETA.pen` (lockup "Logo lockup Explore"):
 * bidang krem membulat, dua kontur hijau, satu jalan merah, titik + cincin lokasi.
 * Semua koordinat internal mengikuti kanvas 30×30 agar proporsi tetap sama di
 * ukuran apa pun (favicon 16px sampai lockup 40px).
 */

const MARK_RATIO = 1; // lambang selalu persegi

export interface TapetaMarkProps {
  size?: number;
  className?: string;
  /** Latar tipis di belakang lambang (dipakai di atas foto/peta). */
  plate?: boolean;
  title?: string;
}

export function TapetaMark({ size = 30, className, plate = true, title }: TapetaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      className={className ? `tapeta-mark ${className}` : "tapeta-mark"}
      role="img"
      aria-label={title ?? "TAPETA"}
      focusable="false"
    >
      {plate && (
        <rect x="0" y="0" width="30" height="30" rx="8.25" fill="#EEE1CD" stroke="#b8ad9a" strokeWidth="1" />
      )}
      <g fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path
          d="M-3.75 10.5c6-3.75 10.5 2.25 16.5-0.75s11.25-0.75 16.5 1.5"
          stroke="#5E7C64"
          strokeWidth="1.1"
          opacity="0.45"
        />
        <path
          d="M-2.25 18.75c6.75-3 12 3 18 0s9.75-0.75 15 2.25"
          stroke="#5E7C64"
          strokeWidth="1.1"
          opacity="0.45"
        />
        <path
          d="M9 28.5c0.75-6 5.25-8.25 6.75-15"
          stroke="#B63A2E"
          strokeWidth="1.2"
          opacity="0.7"
        />
      </g>
      <circle
        cx={16.5}
        cy={11.25}
        r={2.7}
        fill="#B63A2E"
      />
      <circle
        cx={16.5}
        cy={11.25}
        r={4.65}
        fill="none"
        stroke="#B63A2E"
        strokeWidth="1"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface TapetaLogoProps {
  size?: number;
  /** Ukuran huruf wordmark; otomatis mengikuti `size` bila kosong. */
  wordmarkSize?: number;
  className?: string;
  onClick?: () => void;
  showWordmark?: boolean;
  tagline?: string;
  style?: CSSProperties;
}

/**
 * Lockup lengkap: lambang + wordmark "TAPETA". Dipakai di navigasi desktop,
 * header mobile, halaman akun/komunitas, dashboard, dan atlas.
 */
export function TapetaLogo({
  size = 30,
  wordmarkSize,
  className,
  onClick,
  showWordmark = true,
  tagline,
  style,
}: TapetaLogoProps) {
  const mark = <TapetaMark size={size} />;
  const word = showWordmark ? (
    <span className="tapeta-logo__word" style={{ fontSize: wordmarkSize ?? Math.round(size * 0.77) }}>
      TAPETA
    </span>
  ) : null;
  const content = (
    <>
      {mark}
      {word}
      {tagline ? <span className="tapeta-logo__tagline">{tagline}</span> : null}
    </>
  );
  const classes = `tapeta-logo${className ? ` ${className}` : ""}`;
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} style={style} aria-label="TAPETA — beranda">
        {content}
      </button>
    );
  }
  return (
    <span className={classes} style={style}>
      {content}
    </span>
  );
}

export { MARK_RATIO };
