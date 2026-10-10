import { useMemo } from 'react'

// Deterministic scatter in [0, 1) so the burst looks random but renders the same every time.
const jitter = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** A burst of ✦ sparkles. Remount it (change `key`) to play again. Hidden when motion is reduced. */
export default function Sparkles({ count = 14 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + jitter(i, 1) * 0.4
        const dist = 50 + jitter(i, 2) * 60
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 10 + jitter(i, 3) * 14,
          delay: jitter(i, 4) * 0.15,
          color: ['var(--accent)', 'var(--lilac)', '#ffc94d', 'var(--mint)'][i % 4],
        }
      }),
    [count],
  )
  return (
    <div className="sparkles" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            '--x': `${b.x}px`,
            '--y': `${b.y}px`,
            fontSize: b.size,
            animationDelay: `${b.delay}s`,
            color: b.color,
          } as React.CSSProperties}
        >
          ✦
        </span>
      ))}
    </div>
  )
}
