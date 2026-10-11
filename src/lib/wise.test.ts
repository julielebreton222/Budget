import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { balanceCheck, mergeStatement, parseStatement, parseWhen, rowToTxn } from './wise'
import { defaultSettings } from './defaults'

const base: Record<string, unknown> = {
  ID: '', Date: '', 'Date Time': '', Amount: 0, Currency: 'EUR', Description: '', 'Payment Reference': '',
  'Running Balance': '', 'Exchange To': '', 'Exchange To Amount': '', 'Payer Name': '', 'Payee Name': '',
  Merchant: '', 'Transaction Details Type': '',
}
const row = (o: Record<string, unknown>) => ({ ...base, ...o })

describe('parseWhen', () => {
  it('reads ISO, day-first text and Excel serial dates', () => {
    expect(parseWhen('2026-10-10')).toBe('2026-10-10 00:00:00')
    expect(parseWhen('03-10-2026 14:22:01.123')).toBe('2026-10-03 14:22:01')
    expect(parseWhen('03/10/2026')).toBe('2026-10-03 00:00:00')
    expect(parseWhen(46296)).toBe('2026-10-01 00:00:00')
  })
})

describe('rowToTxn', () => {
  it('cleans card rows and keeps the original currency', () => {
    const t = rowToTxn(row({
      ID: 'CARD-1', Date: '2026-10-01', Amount: -8.07, Merchant: 'Super Sk LIMON',
      'Exchange To': 'CRC', 'Exchange To Amount': 4043, 'Transaction Details Type': 'CARD',
    }))!
    expect(t).toMatchObject({ id: 'CARD-1|2026-10-01|-8.07', wiseId: 'CARD-1', description: 'Super Sk LIMON', category: 'Groceries & household', original: '4,043 CRC' })
  })

  it('keeps the merchant category on card refunds', () => {
    const t = rowToTxn(row({ ID: 'CARD-2', Date: '2026-10-01', Amount: 3.2, Merchant: 'Grab* A-7d5v', 'Transaction Details Type': 'CARD' }))!
    expect(t.category).toBe('Transport (local)')
  })

  it('treats top-ups, conversions and own transfers as funding, not income', () => {
    const k = (o: Record<string, unknown>) => rowToTxn(row({ ID: 'X', Date: '2026-10-01', Amount: 100, ...o }))!
    expect(k({ 'Transaction Details Type': 'MONEY_ADDED' })).toMatchObject({ description: 'Top-up', category: 'Transfers from own accounts' })
    expect(k({ 'Transaction Details Type': 'CONVERSION', Description: 'Converted 140.00 AUD to 78.04 EUR' }).category).toBe('Transfers from own accounts')
    expect(k({ 'Transaction Details Type': 'DEPOSIT', 'Payer Name': 'MLLE JULIE LEBRETON' })).toMatchObject({
      description: 'From Mlle Julie Lebreton', category: 'Transfers from own accounts',
    })
  })

  it('matches income by payer', () => {
    const k = (payer: string) => rowToTxn(row({ ID: 'X', Date: '2026-10-01', Amount: 50, 'Payer Name': payer, 'Transaction Details Type': 'DEPOSIT' }))!.category
    expect(k('STRIPE TECHNOLOGIES')).toBe('Business income (typewriting & sales)')
    expect(k('NENA VAREILLES')).toBe('Business income (typewriting & sales)')
    expect(k('TURTLE LTD')).toBe('Salary / employment')
    expect(k('MANGOPAY SA')).toBe('Second-hand sales (Vinted)')
    expect(k('JOSHUA RYAN LIVINGSTON')).toBe('Money from Josh')
    expect(k('SOMEONE NEW')).toBe('Other income')
  })

  it('uses payee and reference for transfers out', () => {
    const k = (payee: string, ref = '') =>
      rowToTxn(row({ ID: 'X', Date: '2026-10-01', Amount: -50, 'Payee Name': payee, 'Payment Reference': ref, 'Transaction Details Type': 'TRANSFER' }))!
    expect(k('JULIE LEBRETON')).toMatchObject({ description: 'To Julie Lebreton', category: 'Transfers to own accounts' })
    expect(k('CASA DE SEMENTE', 'Room 2 rent').category).toBe('Rent & housing')
    expect(k('JOHN DOE').category).toBe('Other / review')
  })

  it('lets personal merchant rules win', () => {
    const t = rowToTxn(row({ ID: 'C', Date: '2026-10-01', Amount: -4, Merchant: 'Pingo Doce Lisboa', 'Transaction Details Type': 'CARD' }),
      [{ match: 'pingo doce', category: 'Eating out & cafés' }])!
    expect(t.category).toBe('Eating out & cafés')
  })
})

describe('statement import', () => {
  const rows = [
    row({ ID: 'C-3', Date: '02-10-2026', 'Date Time': '02-10-2026 10:00:00', Amount: -5, 'Running Balance': 95, Merchant: 'Lidl', 'Transaction Details Type': 'CARD' }),
    row({ ID: 'C-3', Date: '02-10-2026', 'Date Time': '02-10-2026 11:00:00', Amount: 5, 'Running Balance': 100, Merchant: 'Lidl', 'Transaction Details Type': 'CARD' }),
    row({ ID: 'C-2', Date: '01-10-2026', 'Date Time': '01-10-2026 12:00:00', Amount: -20, 'Running Balance': 100, Merchant: 'Zara', 'Transaction Details Type': 'CARD' }),
    row({ ID: 'T-1', Date: '01-10-2026', 'Date Time': '01-10-2026 09:00:00', Amount: 100, 'Running Balance': 120, 'Transaction Details Type': 'MONEY_ADDED' }),
  ]
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows))
  const buf = new TextEncoder().encode(csv).buffer as ArrayBuffer

  it('parses a csv, finds the balances and de-duplicates', () => {
    const p = parseStatement(buf, 'statement.csv')
    // A refund reusing the purchase's Wise ID is kept as its own transaction.
    expect(p.txns.map((t) => t.id)).toEqual(['T-1|2026-10-01|100.00', 'C-2|2026-10-01|-20.00', 'C-3|2026-10-02|-5.00', 'C-3|2026-10-02|5.00'])
    expect(p).toMatchObject({ openingBalance: 20, closingBalance: 100, closingDate: '2026-10-02' })

    const first = mergeStatement(new Map(), p, defaultSettings())
    expect(first).toMatchObject({ added: 4, skipped: 0 })
    expect(balanceCheck(first.newTxns, first.settings)?.ok).toBe(true)

    const existing = new Map(first.newTxns.map((t) => [t.id, { ...t, category: 'Wedding', manual: true }]))
    const again = mergeStatement(existing, p, first.settings)
    expect(again).toMatchObject({ added: 0, skipped: 4 })
  })
})

describe('balanceCheck', () => {
  it('ignores entries added by hand', () => {
    const s = { ...defaultSettings(), openingBalance: 100, closingBalance: 90 }
    const txns = [
      { id: 'C-1|2026-10-01|-10.00', date: '2026-10-01', description: 'Lidl', amount: -10, category: 'Groceries & household' },
      { id: 'MANUAL-1', date: '2026-10-02', description: 'Cash coffee', amount: -3, category: 'Eating out & cafés', kind: 'MANUAL' },
    ]
    expect(balanceCheck(txns, s)?.ok).toBe(true)
  })
})
