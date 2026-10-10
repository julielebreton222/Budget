// Checks a real Wise statement against the expected totals. Skipped unless WISE_STATEMENT points to a file.
// Optional BUDGET_WORKBOOK points to the hand-categorised workbook for a category-by-category comparison.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { balanceCheck, mergeStatement, parseStatement, parseWhen, txnKey } from './wise'
import { defaultSettings } from './defaults'
import { totals } from './calc'

const file = process.env.WISE_STATEMENT

function load() {
  const buf = readFileSync(file!)
  const parsed = parseStatement(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, file!)
  return { parsed, first: mergeStatement(new Map(), parsed, defaultSettings()) }
}

describe.skipIf(!file)('real Wise statement', () => {
  const { parsed, first } = file ? load() : ({} as ReturnType<typeof load>)

  it('matches the expected totals and balance', () => {
    const t = totals(first.newTxns)
    console.log({ rows: first.added, spending: t.spending, income: t.income, review: first.needsReview, closing: first.settings.closingBalance })
    expect(balanceCheck(first.newTxns, first.settings)?.ok).toBe(true)
    expect(first.settings.closingBalance).toBeCloseTo(815.27, 2)
    expect(Math.abs(t.spending - 25247)).toBeLessThan(150)
    expect(Math.abs(t.income - 5324)).toBeLessThan(100)
  })

  it('adds nothing on a second import', () => {
    const again = mergeStatement(new Map(first.newTxns.map((t) => [t.id, t])), parsed, first.settings)
    expect(again.added).toBe(0)
  })

  it.skipIf(!process.env.BUDGET_WORKBOOK)('agrees with the hand-categorised workbook', () => {
    const wb = XLSX.read(readFileSync(process.env.BUDGET_WORKBOOK!))
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Transactions)
    const key = (r: Record<string, unknown>) =>
      txnKey(String(r['Bank ID']), parseWhen(r['Date']).slice(0, 10), Number(r['Amount (€)']))
    const want = new Map(rows.map((r) => [key(r), String(r['Category ▼ (edit)'])]))
    expect(first.newTxns.filter((t) => !want.has(t.id))).toEqual([])
    const diffs = first.newTxns.filter((t) => want.has(t.id) && want.get(t.id) !== t.category)
    const byPair: Record<string, number> = {}
    for (const t of diffs) byPair[`${want.get(t.id)} → ${t.category}`] = (byPair[`${want.get(t.id)} → ${t.category}`] ?? 0) + 1
    console.log(`${diffs.length} of ${first.newTxns.length} differ`, byPair)
    for (const t of diffs.slice(0, 40)) console.log(`  ${t.id} ${t.description} | want ${want.get(t.id)} | got ${t.category}`)
  })
})
