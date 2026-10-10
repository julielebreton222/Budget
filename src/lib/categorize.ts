import rulesJson from '../data/rules.json'
import type { MerchantRule } from './types'

const BUILT_IN: [RegExp, string][] = (rulesJson as [string, string][]).map(([p, c]) => [new RegExp(p), c])

const BUSINESS_CLIENTS = ['PEDRO BESSA', 'NENA VAREILLES', 'VERONICA FREEL', 'CLARA SEGARD']

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Personal rules from the Activity tab. They match on the cleaned description and win over everything. */
export function personalMatch(description: string, rules: MerchantRule[]): string | undefined {
  const d = norm(description)
  return rules.find((r) => r.match && d.includes(norm(r.match)))?.category
}

/** Money in (deposits, top-ups, conversions), matched on the payer name. */
export function categorizeIn(kind: string, payer: string): string {
  const p = payer.toUpperCase()
  if (kind === 'MONEY_ADDED' || kind === 'CONVERSION') return 'Transfers from own accounts'
  if (p.includes('JULIE LEBRETON')) return 'Transfers from own accounts'
  if (p.includes('STRIPE')) return 'Business income (typewriting & sales)'
  if (BUSINESS_CLIENTS.some((n) => p.includes(n))) return 'Business income (typewriting & sales)'
  if (p.includes('TURTLE')) return 'Salary / employment'
  if (p.includes('MANGOPAY')) return 'Second-hand sales (Vinted)'
  if (p.includes('CHRISTINA LEBRETON') || p.includes('NEUHAUS')) return 'Gifts & family support'
  if (p.includes('LIVINGSTON')) return 'Money from Josh'
  if (p.includes('CASA DE SEMENTE')) return 'Refunds & deposits returned'
  return 'Other income'
}

/** Money out and card refunds: first matching built-in regex on "merchant payee reference". */
export function categorizeOut(merchant: string, payee: string, reference: string): string {
  const text = [merchant, payee, reference]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return BUILT_IN.find(([re]) => re.test(text))?.[1] ?? 'Other / review'
}
