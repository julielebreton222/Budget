import type { ReactNode } from 'react'
import type { Status } from '../lib/calc'

export default function Ring({ value, status, children }: { value: number; status: Status; children: ReactNode }) {
  const r = 70
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="ring">
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle cx="90" cy="90" r={r} className="ring-track" />
        <circle
          cx="90"
          cy="90"
          r={r}
          className={'ring-fill ' + status}
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
