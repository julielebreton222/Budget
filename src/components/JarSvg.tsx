import { useId } from 'react'

// Coin spots inside the jar body (x, y, size); a coin shows once the liquid covers it.
const COINS: [number, number, number][] = [
  [70, 204, 13], [118, 206, 12], [96, 196, 11], [140, 196, 10], [56, 186, 10],
  [84, 178, 12], [126, 176, 11], [104, 164, 10], [64, 156, 11], [146, 160, 10],
  [92, 142, 12], [132, 136, 11], [72, 124, 10], [112, 116, 12], [148, 112, 10],
  [86, 100, 11], [60, 92, 10], [128, 90, 11],
]

const TOP = 72 // inside top of the jar body
const BOTTOM = 220 // inside bottom

/** Glass jar filling with pink liquid. `fill` is 0..1 of the current jar. */
export default function JarSvg({ fill, level }: { fill: number; level: number }) {
  const id = useId().replace(/:/g, '')
  const f = Math.max(0, Math.min(1, fill))
  const surface = BOTTOM - f * (BOTTOM - TOP)
  const body = 'M44 70 Q44 56 60 54 L140 54 Q156 56 156 70 L162 200 Q164 226 136 228 L64 228 Q36 226 38 200 Z'

  return (
    <svg className="jar-svg" viewBox="0 0 200 250" role="img" aria-label={`Jar ${level}, ${Math.round(f * 100)}% full`}>
      <defs>
        <clipPath id={`in-${id}`}>
          <path d={body} transform="translate(100 141) scale(0.94) translate(-100 -141)" />
        </clipPath>
        <linearGradient id={`liq-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8dbd" />
          <stop offset="1" stopColor="#ff3d8b" />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* glass back */}
      <path d={body} fill="var(--jar-glass)" />

      {/* liquid + coins */}
      <g clipPath={`url(#in-${id})`}>
        {f > 0 && (
          <>
            <rect x="0" y={surface + 4} width="200" height={250 - surface} fill={`url(#liq-${id})`} />
            <g className="jar-wave" style={{ transform: `translateY(${surface}px)` }}>
              <path
                d="M-200 4 Q-175 -4 -150 4 T-100 4 T-50 4 T0 4 T50 4 T100 4 T150 4 T200 4 T250 4 T300 4 T350 4 T400 4 V20 H-200 Z"
                fill="#ff8dbd"
              />
            </g>
          </>
        )}
        {COINS.map(([x, y, r], i) =>
          y - r > surface + 6 ? (
            <g key={i} className="jar-coin" style={{ animationDelay: `${(i % 6) * 0.35}s` }}>
              <circle cx={x} cy={y} r={r} fill="#ffd166" stroke="#e8a930" strokeWidth="2" />
              <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 1.05} fontWeight="700" fill="#b9771a" fontFamily="Fredoka, sans-serif">€</text>
            </g>
          ) : null,
        )}
      </g>

      {/* glass front and outline */}
      <path d={body} fill={`url(#glass-${id})`} />
      <path d={body} fill="none" stroke="var(--jar-line)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M56 84 Q54 140 58 196" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="6" strokeLinecap="round" />

      {/* lid */}
      <rect x="50" y="26" width="100" height="30" rx="10" fill="var(--accent)" />
      <rect x="50" y="26" width="100" height="10" rx="6" fill="#ffffff" fillOpacity="0.25" />
      <path d="M62 41 h76" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />

      {/* label */}
      <rect x="70" y="120" width="60" height="34" rx="10" fill="var(--card)" fillOpacity="0.92" stroke="var(--lilac)" strokeWidth="2" />
      <text x="100" y="143" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="600" fontSize="17" fill="var(--text)">Jar {level}</text>

      <path className="jar-twinkle" d="M170 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="var(--lilac)" />
      <path className="jar-twinkle t2" d="M24 120 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="var(--accent)" />
    </svg>
  )
}
