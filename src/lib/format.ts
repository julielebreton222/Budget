const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** €1,234 — whole euros for summaries. */
export const euro = (n: number) => (n < 0 ? '−' : '') + '€' + whole.format(Math.abs(Math.round(n)))

/** €12.50 — with cents, for transaction rows. */
export const euro2 = (n: number) => (n < 0 ? '−' : '') + '€' + cents.format(Math.abs(n))

/** Signed amount for a transaction row: +€100.00 for money in, €5.81 for money out. */
export const txnAmount = (n: number) => (n > 0 ? '+' + euro2(n) : euro2(-n))

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const monthLabel = (ym: string) => monthFmt.format(new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1))
export const dayLabel = (ymd: string) => dayFmt.format(new Date(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)))

export function shiftMonth(ym: string, delta: number) {
  const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
