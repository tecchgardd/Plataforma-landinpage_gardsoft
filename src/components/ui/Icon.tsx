const paths = {
  arrow: "M7 17 17 7M8 7h9v9",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  landing: "M4 5h16v14H4zM4 9h16M8 13h5M8 16h8",
  site: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18",
  system: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  automation: "M13 3 5 14h6l-1 7 8-11h-6z",
  check: "m5 12 5 5 9-10",
  star: "m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z",
  whatsapp:
    "M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1-1-2z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  instagram: "M4 4h16v16H4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M17 7h.01",
  facebook: "M14 21v-8h3l.5-3.5H14V7.5c0-1 .4-1.8 1.8-1.8H18V2.6c-.5-.1-1.6-.2-2.8-.2C12.6 2.4 11 4 11 6.8v2.7H8V13h3v8z",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.5 2.3 4.2 5 4.5",
  youtube: "M3 8.5c0-2 1.3-3.2 3.2-3.4C8 5 10 5 12 5s4 0 5.8.1C19.7 5.3 21 6.5 21 8.5v7c0 2-1.3 3.2-3.2 3.4-1.8.1-3.8.1-5.8.1s-4 0-5.8-.1C4.3 18.7 3 17.5 3 15.5zM10 9v6l5-3z",
  linkedin: "M4 9h3v11H4zM5.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M10 9h3v1.5c.6-1 1.8-1.8 3.3-1.8 2.4 0 3.7 1.5 3.7 4.3v7h-3v-6.5c0-1.4-.6-2.2-1.8-2.2-1.3 0-2.2.9-2.2 2.4V20h-3z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  quote: "M5 11h4v7H4v-5c0-4 2-6 5-7M15 11h4v7h-5v-5c0-4 2-6 5-7",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
