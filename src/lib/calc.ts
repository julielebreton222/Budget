import { BY_NAME, FROM_OWN } from '../data/categories'
import type { Settings, Txn } from './types'

export const groupOf = (category: string) => BY_NAME.get(category)?.group ?? 'Expense'
export const monthOf = (date: string) => date.slice(0, 7) // "YYYY-MM"

const round2 = (n: number) => Math.round(n * 100) / 100

/** Spending is shown positive: money out in expense categories, with refunds netted. Funding is never income. */
export function totals(txns: Txn[]) {
  let spending = 0
  let income = 0
  let fromOwn = 0
  for (const t of txns) {
    const g = groupOf(t.category)
    if (g === 'Expense') spending -= t.amount
    else if (g === 'Income') income += t.amount
    else if (t.category === FROM_OWN) fromOwn += t.amount
  }
  return { spending: round2(spending), income: round2(income), net: round2(income - spending), fromOwn: round2(fromOwn) }
}

/** Positive spending per expense category. */
export function spentByCategory(txns: Txn[]) {
  const out: Record<string, number> = {}
  for (const t of txns) {
    if (groupOf(t.category) !== 'Expense') continue
    out[t.category] = round2((out[t.category] ?? 0) - t.amount)
  }
  return out
}

/** Opening balance + every amount should land on the latest Running Balance. */
export function balanceCheck(txns: Txn[], s: Settings) {
  if (s.openingBalance == null || s.closingBalance == null) return null
  // Entries added by hand (cash, other accounts) aren't in Wise, so they don't count here.
  const wise = txns.filter((t) => t.kind !== 'MANUAL')
  const computed = Math.round((s.openingBalance + wise.reduce((a, t) => a + t.amount, 0)) * 100) / 100
  return { computed, expected: s.closingBalance, ok: Math.abs(computed - s.closingBalance) < 0.005 }
}

export const inMonth = (txns: Txn[], month: string) => txns.filter((t) => monthOf(t.date) === month)

export type Status = 'under' | 'close' | 'over'

/** Mint under 80%, pink from 80% to 100%, raspberry when over. */
export function statusOf(spent: number, target: number): Status {
  if (spent > target + 0.005) return 'over'
  if (target > 0 && spent >= target * 0.8) return 'close'
  return 'under'
}

/** Days in the month and days still to go (counting today) relative to `today`. */
export function monthDays(month: string, today = new Date()) {
  const y = +month.slice(0, 4)
  const m = +month.slice(5, 7)
  const total = new Date(y, m, 0).getDate()
  const cur = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const left = month < cur ? 0 : month > cur ? total : total - today.getDate() + 1
  return { total, left }
}

/** Spending per category for each of the `n` months ending at `month` (oldest first). */
export function categoryHistory(txns: Txn[], month: string, n: number, shift: (m: string, d: number) => string) {
  const months = Array.from({ length: n }, (_, i) => shift(month, i - n + 1))
  const idx = new Map(months.map((m, i) => [m, i]))
  const out: Record<string, number[]> = {}
  for (const t of txns) {
    const i = idx.get(monthOf(t.date))
    if (i == null || groupOf(t.category) !== 'Expense') continue
    ;(out[t.category] ??= Array(n).fill(0))[i] -= t.amount
  }
  return { months, series: out }
}

/** "Eating out & cafés" → "Eating out" for friendly sentences. */
export const shortName = (name: string) => name.split(/ & | \(|, /)[0]
