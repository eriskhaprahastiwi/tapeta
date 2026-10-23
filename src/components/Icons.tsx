import type { SVGProps } from "react";
import type { CategoryId } from "../types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CategoryGlyph({
  category,
  ...props
}: IconProps & { category: CategoryId }) {
  switch (category) {
    case "kafe":
      return (
        <Svg {...props}>
          <path d="M5 9h11v5.2a3.8 3.8 0 0 1-3.8 3.8H8.8A3.8 3.8 0 0 1 5 14.2V9Z" />
          <path d="M16 10h1.4a2.1 2.1 0 0 1 0 4.2H16" />
          <path d="M4 21h13" />
          <path d="M8 6c0-1 1-1.4 1-2.4M12 6c0-1 1-1.4 1-2.4" />
        </Svg>
      );
    case "kuliner":
      return (
        <Svg {...props}>
          <path d="M4 12h16a8 8 0 0 1-16 0Z" />
          <path d="M7 12c0-3 2.2-5 5-5s5 2 5 5" />
          <path d="M9 5.5c0-.8.7-1 .7-1.8M13 5.5c0-.8.7-1 .7-1.8" />
          <path d="M3 20h18" />
        </Svg>
      );
    case "alam":
      return (
        <Svg {...props}>
          <path d="m3 19 5.5-9 3.2 4.6L15 9l6 10H3Z" />
          <circle cx="18" cy="6" r="2" />
        </Svg>
      );
    case "budaya":
      return (
        <Svg {...props}>
          <path d="M3 10 12 4l9 6" />
          <path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9" />
          <path d="M3 19h18M3 22h18" />
          <path d="M12 4v6" />
        </Svg>
      );
    case "rekreasi":
      return (
        <Svg {...props}>
          <circle cx="12" cy="10" r="6.5" />
          <path d="M12 3.5V10M6.4 6.8 12 10M17.6 6.8 12 10M12 16.5V22M7 22h10" />
          <circle cx="12" cy="10" r="1.3" />
        </Svg>
      );
    case "lainnya":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </Svg>
      );
  }
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function LocateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Svg>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9V4h5" />
      <path d="M4.6 8.5a8 8 0 1 1-.4 4" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5a1 1 0 0 0-1 1v8.5A1.5 1.5 0 0 0 5.5 15" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s6.5-5.4 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.3" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.2 4.2L19 6.5" />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </Svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3 6 5-2 8 3 5-2v14l-5 2-8-3-5 2V6Z" />
      <path d="M8 4v14M16 7v14" />
    </Svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 21V4" />
      <path d="M6 5c3.5-2 7.5 2 12 0v9c-4.5 2-8.5-2-12 0" />
    </Svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6M10 17h6" />
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 10.5 8-6.5 8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4h12v16l-6-4-6 4V4Z" />
    </Svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12 2.3 2.3 4.7-4.6" />
    </Svg>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 20 4.5-1 9.6-9.6a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
      <path d="m13.8 6.6 3 3" />
    </Svg>
  );
}

export function BadgeCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 2.1 1.6 2.6-.2 1 2.4 2.2 1.4-.7 2.5.7 2.5-2.2 1.4-1 2.4-2.6-.2L12 21l-2.1-1.6-2.6.2-1-2.4L4.1 15l.7-2.5-.7-2.5 2.2-1.4 1-2.4 2.6.2L12 3Z" />
      <path d="m9.2 11.8 2 2 3.6-3.6" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m21 3-9 18-2.6-7.4L2 11l19-8Z" />
      <path d="M21 3 9.4 13.6" />
    </Svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 4Z" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c.7-3.3 3.5-5.2 7-5.2s6.3 1.9 7 5.2" />
    </Svg>
  );
}
