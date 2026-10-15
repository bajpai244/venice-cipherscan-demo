// Small monochrome marks for the crypto payment providers.
type IconProps = { size?: number }

export function CoinbaseIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M12.2 4.4A5.6 5.6 0 1 0 12.2 11.6" />
      <path d="M10 6.3A2.6 2.6 0 1 0 10 9.7" />
    </svg>
  )
}

export function StripeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M11.5 3.6C10.6 2.9 9.5 2.6 8.3 2.6 6.3 2.6 5 3.6 5 5.1c0 3.3 6.4 2.3 6.4 5.6 0 1.6-1.5 2.7-3.6 2.7-1.4 0-2.7-.4-3.6-1.2" />
      <path d="M9.6 5.2C9.2 4.9 8.7 4.8 8.2 4.8c-.8 0-1.2.3-1.2.7" />
      <path d="M6.6 10.9c.4.3 1 .5 1.6.5.8 0 1.2-.3 1.2-.8" />
    </svg>
  )
}

export function ZcashIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="6.6" />
      <path d="M8 3.4v1.4M8 11.2v1.4M5.6 4.9h4.8L5.6 11.1h4.8" />
    </svg>
  )
}
