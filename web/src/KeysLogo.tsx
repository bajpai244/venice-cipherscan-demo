// Crossed keys emblem, approximating the mark above Venice's prompt box.
export default function KeysLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* crown */}
      <path d="M25 6 L28 12 L32 5 L36 12 L39 6 L38 16 H26 Z" />
      {/* key shafts crossing */}
      <path d="M12 8 L47 47" />
      <path d="M52 8 L17 47" />
      {/* key bits (teeth) */}
      <path d="M12 8 L9 12 M16 12 L12 15" />
      <path d="M52 8 L55 12 M48 12 L52 15" />
      {/* bows (handles) */}
      <circle cx="51" cy="51" r="6" />
      <circle cx="13" cy="51" r="6" />
      {/* collars */}
      <path d="M41 45 L45 41" />
      <path d="M23 45 L19 41" />
    </svg>
  )
}
