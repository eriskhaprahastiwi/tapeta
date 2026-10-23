import { useId } from "react";

function Wash({ id }: { id: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

export function WishlistArt({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 170 124" aria-hidden="true" focusable="false">
      <defs><Wash id={id} /></defs>
      <g filter={`url(#${id})`}>
        <path d="M17 78c-9-17 4-40 30-45 23-5 55-8 78 2 21 9 27 31 13 45-13 13-42 17-63 15-24-2-50-5-58-17Z" fill="#e7ecdf" opacity=".85" />
        <path d="M53 40 79 32l24 8-2 48-24 9-26-9 2-48Z" fill="#f5ecd9" stroke="#cdbb9b" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="m79 32 24 8-2 48-24 9V32Z" fill="#eee0c8" stroke="#cdbb9b" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M79 32v57" stroke="#cdbb9b" strokeWidth="1.1" />
        <path d="m53 48 26-8M53 65l26-8M53 82l26-8" stroke="#dccdb3" strokeWidth="1" />
        <path d="M88 45c-5.5 0-10 4.5-10 10 0 7.4 10 17 10 17s10-9.6 10-17c0-5.5-4.5-10-10-10Z" fill="#b96a52" stroke="#8f4c3a" strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="88" cy="55" r="3.9" fill="#fbf5e9" opacity=".95" />
        <path d="M41 90c-8-2-13-9-12-16 6 1 10 4 12 9 3-6 8-8 14-8-1 7-6 13-14 15Z" fill="#8fa483" opacity=".9" />
        <path d="M128 88c8-1 14-7 15-14-6 0-11 3-14 8-2-6-7-9-13-9 0 7 5 13 12 15Z" fill="#a9b99a" opacity=".9" />
        <path d="M60 102c8-7 19-11 28-11 10 0 18 4 23 11" fill="none" stroke="#c9b493" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 5" />
        <circle cx="139" cy="27" r="8.5" fill="#f0dcb9" opacity=".85" />
      </g>
    </svg>
  );
}

export function VisitedArt({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 170 124" aria-hidden="true" focusable="false">
      <defs><Wash id={id} /></defs>
      <g filter={`url(#${id})`}>
        <path d="M18 82c-7-18 8-37 33-41 22-4 52-2 71 8 17 9 20 29 6 40-15 12-42 14-62 12-22-2-42-6-48-19Z" fill="#f4e3d7" opacity=".8" />
        <path d="M80 58h14v50H80z" fill="#d9c3a1" stroke="#b89c74" strokeWidth="1.1" />
        <path d="M44 43h48l10 9-10 9H44z" fill="#cfdcc6" stroke="#8fa483" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M112 66H66l-10 9 10 9h46z" fill="#f5ecd9" stroke="#cdbb9b" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M52 50h24M52 57h18" stroke="#7d9277" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
        <path d="M76 72h26M78 79h20" stroke="#b6a181" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
        <path d="M47 108c-6-5-7-13-1-18 4 4 5 9 4 14 4-6 11-8 18-6-3 6-10 10-21 10Z" fill="#8fa483" />
        <path d="M126 108c7-4 10-12 5-18-5 3-7 8-7 13-3-7-9-10-16-9 2 7 8 12 18 14Z" fill="#a9b99a" />
        <circle cx="69" cy="109" r="4.2" fill="#cdbb9b" opacity=".8" />
        <circle cx="105" cy="111" r="3.1" fill="#c2ae8d" opacity=".8" />
        <circle cx="92" cy="52" r="6.4" fill="#f5ecd9" stroke="#8fa483" strokeWidth="1.2" />
        <path d="m89 52 2.2 2.2 4-4" fill="none" stroke="#5e7c64" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
