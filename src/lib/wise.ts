import * as XLSX from 'xlsx'
import type { MerchantRule, Settings, Txn } from './types'
import { categorizeIn, categorizeOut, personalMatch } from './categorize'
import { REVIEW } from '../data/categories'

type Row = Record<string, unknown>

export type ParsedStatement = {
  txns: Txn[]
  openingBalance?: number
  openingDate?: string
  closingBalance?: number
  closingDate?: string
}

export type ImportResult = {
  added: number
  skipped: number
  needsReview: number
  newTxns: Txn[]
  settings: Settings
}

const pad = (n: number) => String(n).padStart(2, '0')

const str = (v: unknown) => (v == null ? '' : String(v)).trim()

const num = (v: unknown): number => {
  if (typeof v === 'number') return v
  const s = str(v).replace(/[^\d.,-]/g, '')
  if (!s) return NaN
  // "1,234.56" → 1234.56 ; "1234,56" → 1234.56
  const clean = s.includes('.') ? s.replace(/,/g, '') : s.replace(',', '.')
  return parseFloat(clean)
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s\-'’.(])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())

/** Returns "YYYY-MM-DD HH:MM:SS" (time part optional) from an Excel serial, Date or text date. */
export function parseWhen(v: unknown): string {
  if (v instanceof Date && !isNaN(+v)) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`
  }
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return `${d.y}-${pad(d.m)}-${pad(d.d)} ${pad(d.H)}:${pad(d.M)}:${pad(Math.floor(d.S))}`
  }
  const s = str(v)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])} ${pad(+(m[4] ?? 0))}:${m[5] ?? '00'}:${m[6] ?? '00'}`
  // Wise writes day first: 10-10-2026 or 10/10/2026
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])} ${pad(+(m[4] ?? 0))}:${m[5] ?? '00'}:${m[6] ?? '00'}`
  return ''
}

function readRows(data: ArrayBuffer, fileName: string): Row[] {
  const isCsv = /\.csv$/i.test(fileName)
  // For CSV keep every cell as text so day-first dates aren't misread as US dates.
  const wb = XLSX.read(data, { type: 'array', raw: isCsv })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '', raw: true })
  // Use columns by header name; tolerate stray spaces in headers.
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v])))
}

export const txnKey = (wiseId: string, date: string, amount: number) => `${wiseId}|${date}|${amount.toFixed(2)}`

export function rowToTxn(r: Row, rules: MerchantRule[] = []): Txn | null {
  const id = str(r['ID'])
  const amount = Math.round(num(r['Amount']) * 100) / 100
  const when = parseWhen(r['Date']) || parseWhen(r['Date Time'])
  if (!id || isNaN(amount) || !when) return null
  if (str(r['Currency']) && str(r['Currency']).toUpperCase() !== 'EUR') return null

  const kind = str(r['Transaction Details Type']).toUpperCase()
  const merchant = str(r['Merchant'])
  const payer = str(r['Payer Name'])
  const payee = str(r['Payee Name'])
  const reference = str(r['Payment Reference'])

  let description: string
  if (kind === 'CARD') description = merchant || str(r['Description'])
  else if (kind === 'MONEY_ADDED') description = 'Top-up'
  else if (kind === 'CONVERSION') description = str(r['Description'])
  else if (amount > 0) description = payer ? 'From ' + titleCase(payer) : str(r['Description'])
  else description = payee ? 'To ' + titleCase(payee) : str(r['Description'])

  // Card refunds keep the merchant's category so they reduce that category's spending.
  const moneyIn = amount > 0 && kind !== 'CARD'
  const category =
    personalMatch(description, rules) ??
    (moneyIn ? categorizeIn(kind, payer) : categorizeOut(merchant, payee, reference))

  const exTo = str(r['Exchange To']).toUpperCase()
  const exAmt = num(r['Exchange To Amount'])
  const original =
    exTo && exTo !== 'EUR' && !isNaN(exAmt)
      ? `${Math.abs(exAmt).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${exTo}`
      : undefined

  const date = when.slice(0, 10)
  const txn: Txn = { id: txnKey(id, date, amount), wiseId: id, date, description, amount, category, kind }
  if (original) txn.original = original
  if (reference) txn.note = reference
  return txn
}

export function parseStatement(data: ArrayBuffer, fileName: string, rules: MerchantRule[] = []): ParsedStatement {
  const rows = readRows(data, fileName)
  if (rows.length && !('ID' in rows[0] && 'Amount' in rows[0])) {
    throw new Error("This doesn't look like a Wise statement (no ID / Amount columns).")
  }

  const items: { txn: Txn; when: string; balance: number; idx: number }[] = []
  rows.forEach((r, idx) => {
    const txn = rowToTxn(r, rules)
    if (!txn) return
    const when = parseWhen(r['Date Time']) || parseWhen(r['Date'])
    items.push({ txn, when, balance: num(r['Running Balance']), idx })
  })
  if (!items.length) return { txns: [] }

  const count = new Map<string, number>()
  for (const i of items) {
    const n = (count.get(i.txn.id) ?? 0) + 1
    count.set(i.txn.id, n)
    if (n > 1) i.txn.id += `#${n}`
  }

  // Wise lists newest first. Sort oldest → newest, using file order to break ties.
  const newestFirst = items[0].when >= items[items.length - 1].when
  items.sort((a, b) => (a.when < b.when ? -1 : a.when > b.when ? 1 : newestFirst ? b.idx - a.idx : a.idx - b.idx))

  const first = items[0]
  const last = items[items.length - 1]
  const res: ParsedStatement = { txns: items.map((i) => i.txn) }
  if (!isNaN(first.balance)) {
    res.openingBalance = Math.round((first.balance - first.txn.amount) * 100) / 100
    res.openingDate = first.txn.date
  }
  if (!isNaN(last.balance)) {
    res.closingBalance = last.balance
    res.closingDate = last.txn.date
  }
  return res
}

/** Adds new transactions, skipping ones already stored (so manual edits are never overwritten). */
export function mergeStatement(existing: Map<string, Txn>, parsed: ParsedStatement, settings: Settings): ImportResult {
  const newTxns: Txn[] = []
  const seen = new Set<string>()
  let skipped = 0
  for (const t of parsed.txns) {
    if (existing.has(t.id) || seen.has(t.id)) {
      skipped++
      continue
    }
    seen.add(t.id)
    newTxns.push(t)
  }

  const next = { ...settings }
  if (parsed.openingBalance != null && (!next.openingDate || parsed.openingDate! <= next.openingDate)) {
    next.openingBalance = parsed.openingBalance
    next.openingDate = parsed.openingDate
  }
  if (parsed.closingBalance != null && (!next.closingDate || parsed.closingDate! >= next.closingDate)) {
    next.closingBalance = parsed.closingBalance
    next.closingDate = parsed.closingDate
  }

  return {
    added: newTxns.length,
    skipped,
    needsReview: newTxns.filter((t) => t.category === REVIEW).length,
    newTxns,
    settings: next,
  }
}

export { balanceCheck } from './calc'
