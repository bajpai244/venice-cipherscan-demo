// Mirrored 8x8 pixel identicon matching the account's Venice avatar.
const LEFT = [
  [0, 0, 0, 1],
  [0, 1, 2, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 1],
  [1, 1, 1, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 1],
]
const COLORS = ['#8fd11f', '#3f9db4', '#2f7d4a']

export default function Avatar({ className = 'avatar' }: { className?: string }) {
  const rows = LEFT.map((r) => [...r, ...[...r].reverse()])
  return (
    <svg className={className} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) =>
        row.map((c, x) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={COLORS[c]} />),
      )}
    </svg>
  )
}
