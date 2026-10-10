import { groupOf } from './calc'
import type { Txn } from './types'

export type Cadence = 'weekly' | 'monthly' | 'yearly'

export type Subscription = {
  key: string // normalised merchant, used to hide false positives
  name: string // friendly name, e.g. "Squarespace"
  raw: string // merchant text from the latest charge
  category: string
  cadence: Cadence
  amount: number // typical charge (median), positive
  monthly: number // cost per month
  lastDate: string
  nextDate: string
  active: boolean
  charges: Txn[] // newest first
}

const CADENCES: { cadence: Cadence; min: number; max: number; days: number }[] = [
  { cadence: 'weekly', min: 6, max: 8, days: 7 },
  { cadence: 'monthly', min: 25, max: 36, days: 30.44 },
  { cadence: 'yearly', min: 350, max: 380, days: 365.25 },
]

// Groceries, cafés and similar repeat often but aren't subscriptions.
const SKIP = new Set([
  'Groceries & household',
  'Eating out & cafés',
  'Transport (local)',
  'Cash withdrawals',
  'Shopping & clothing',
  'Travel – flights & long-distance',
  'Travel – accommodation',
  'Travel – activities & extras',
  'Transfers to people',
  'Paid to Josh',
  'Wedding',
])

/**
 * Merchant key that survives Wise's per-charge codes:
 * "Canva* I05030-32379612 +17372853388" → "canva", "Uber *One Sydney" → "uber *one",
 * "Notion Labs, Inc. +14154004291" → "notion labs".
 */
export function merchantKey(description: string): string {
  let d = description.toLowerCase().replace(/\+\d{6,}/g, ' ')
  const star = d.indexOf('*')
  if (star > 0) {
    const after = d.slice(star + 1).trim().split(/\s+/)[0] ?? ''
    d = d.slice(0, star).trim() + (/^[a-z]{2,}$/.test(after) ? ' *' + after : '')
    return d.replace(/\s+/g, ' ').trim()
  }
  const words = d
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w))
  return words.slice(0, 2).join(' ')
}

// Billing names that don't look like the service.
const ALIASES: Record<string, string> = {
  sqsp: 'Squarespace',
  'openai *chatgpt': 'ChatGPT',
  'anthropic *claude': 'Claude',
  'uber *one': 'Uber One',
  'google one': 'Google One',
  'notion labs': 'Notion',
  'notion student': 'Notion',
  'medium monthly': 'Medium',
  'dreamhost dh-fee.com': 'DreamHost',
  'nif portugal': 'NIF Portugal',
}

const CITIES = /\s+(paris|london|lisboa|portugal|sydney|north sydney|dublin|berlin)$/

/** "weglot paris" → "Weglot", "lycamobile portugal" → "Lycamobile". */
export function prettyName(key: string): string {
  if (ALIASES[key]) return ALIASES[key]
  const base = key.replace(/\s*\*\s*/g, ' ').replace(CITIES, '').replace(/\.(com|io|so|net|org)$/, '').trim() || key
  return base.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000
const fromDayNum = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10)

/** Longest stretch of evenly spaced charges for any cadence; null if none looks like a subscription. */
function bestRun(charges: Txn[]) {
  let best: { cadence: (typeof CADENCES)[number]; run: Txn[] } | null = null
  for (const c of CADENCES) {
    const lo = c.min * 0.6
    const hi = c.max * 1.5
    let run: Txn[] = [charges[0]]
    const consider = () => {
      const gaps = run.slice(1).map((t, i) => dayNum(t.date) - dayNum(run[i].date))
      const ok =
        c.cadence === 'yearly'
          ? run.length >= 2
          : run.length >= 3 ||
            // Two charges only count when they're a clean month apart at the same price.
            (c.cadence === 'monthly' && run.length === 2 && gaps[0] >= 27 && gaps[0] <= 33 &&
              Math.abs(run[0].amount - run[1].amount) <= Math.abs(run[0].amount) * 0.05)
      if (ok && median(gaps) >= c.min && median(gaps) <= c.max && (!best || run.length > best.run.length)) best = { cadence: c, run }
    }
    for (let i = 1; i < charges.length; i++) {
      const gap = dayNum(charges[i].date) - dayNum(charges[i - 1].date)
      if (gap >= lo && gap <= hi) run.push(charges[i])
      else {
        consider()
        run = [charges[i]]
      }
    }
    consider()
  }
  return best as { cadence: (typeof CADENCES)[number]; run: Txn[] } | null
}

export function findSubscriptions(txns: Txn[], today: string): Subscription[] {
  const groups = new Map<string, Txn[]>()
  for (const t of txns) {
    if (t.amount >= 0 || groupOf(t.category) !== 'Expense' || SKIP.has(t.category)) continue
    const key = merchantKey(t.description)
    if (!key) continue
    const g = groups.get(key)
    if (g) g.push(t)
    else groups.set(key, [t])
  }

  const subs: Subscription[] = []
  for (const [key, list] of groups) {
    // One charge per day (Wise splits some card payments, and card checks add €1 holds): keep the biggest.
    const byDay = new Map<string, Txn>()
    for (const t of list) if (!byDay.has(t.date) || t.amount < byDay.get(t.date)!.amount) byDay.set(t.date, t)
    const all = [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
    if (all.length < 2) continue

    // Ignore one-off top-ups and extras that are far from the usual price.
    const usual = median(all.map((t) => -t.amount))
    const core = all.filter((t) => Math.abs(-t.amount - usual) <= usual * 0.5)
    if (core.length < 2) continue

    const found = bestRun(core)
    if (!found) continue
    const c = found.cadence

    const last = all[all.length - 1]
    // Show the latest price so a price rise is visible straight away, unless the last charge was a one-off extra.
    const latest = -last.amount
    const amount = latest >= usual * 0.5 && latest <= usual * 2 ? latest : -core[core.length - 1].amount
    const next = dayNum(last.date) + c.days
    subs.push({
      key,
      name: prettyName(key),
      raw: last.description,
      category: last.category,
      cadence: c.cadence,
      amount: Math.round(amount * 100) / 100,
      monthly: Math.round(((amount * 30.44) / c.days) * 100) / 100,
      lastDate: last.date,
      nextDate: fromDayNum(Math.round(next)),
      active: dayNum(today) <= next + Math.max(7, c.days * 0.5),
      charges: [...all].reverse(),
    })
  }
  return subs.sort((a, b) => Number(b.active) - Number(a.active) || b.monthly - a.monthly)
}
