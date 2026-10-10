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
  const computed = Math.round((s.openingBalance + txns.reduce((a, t) => a + t.amount, 0)) * 100) / 100
  return { computed, expected: s.closingBalance, ok: Math.abs(computed - s.closingBalance) < 0.005 }
}
