import type { Status } from '../lib/calc'

/** Pill-shaped progress bar. `value` is a fraction; anything past 1 shows as full. */
export default function Bar({ value, status, label }: { value: number; status: Status; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={'bar ' + status} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
