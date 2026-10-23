import { useId } from "react";

/** Escudo-G da Gardsoft vetorizado a partir da logo original. */
export function LogoMark({
  size = 40,
  className,
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`${className ?? ""} ${animated ? "mark-animated" : ""}`}
      width={size}
      height={size * 1.12}
      viewBox="0 0 100 112"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="20" y1="4" x2="80" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14C2FF" />
          <stop offset=".55" stopColor="#1A73FF" />
          <stop offset="1" stopColor="#1638F5" />
        </linearGradient>
      </defs>
      <path
        className="mark-shield"
        pathLength={1}
        d="M86 28 50 12 14 28v28c0 23 15 39 36 47 21-8 36-24 36-47V46H47v10l13 7"
        stroke={`url(#g-${id})`}
        strokeWidth="13"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
    </svg>
  );
}

export default function Logo({
  size = 34,
  tagline = false,
  light = false,
}: {
  size?: number;
  tagline?: boolean;
  light?: boolean;
}) {
  return (
    <span className={`logo ${light ? "logo-light" : ""}`}>
      <LogoMark size={size} />
      <span className="logo-text">
        <span className="logo-word">
          GARD<b>SOFT</b>
        </span>
        {tagline && <small>Tecnologia que impulsiona negócios</small>}
      </span>
    </span>
  );
}
