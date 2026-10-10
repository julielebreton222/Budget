import { monthLabel, shiftMonth } from '../lib/format'

export default function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="month-switch">
      <button className="icon-btn" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>‹</button>
      <span className="head">{monthLabel(month)}</span>
      <button className="icon-btn" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>›</button>
    </div>
  )
}
