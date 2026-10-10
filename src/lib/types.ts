export type Txn = {
  // De-duplication key: Wise ID + date + amount. Wise reuses one ID for a card payment, its refund
  // and any tip or adjustment, so the ID alone would drop real transactions.
  id: string
  wiseId?: string // Wise "ID" column, e.g. "CARD-4452528514"
  date: string // "YYYY-MM-DD"
  description: string
  amount: number // EUR, negative = money out, positive = money in
  category: string
  original?: string // e.g. "4,043 CRC" when paid in another currency
  manual?: boolean // category changed by hand; imports and rules never overwrite it
  kind?: string // Wise "Transaction Details Type": CARD, DEPOSIT, TRANSFER, MONEY_ADDED, CONVERSION
  note?: string // Wise payment reference
}

export type Skipped = {
  id: string
  date: string
  item: string
  price: number
  category: string
  reason?: string
  mood?: string
}

export type MerchantRule = { match: string; category: string }

export type Settings = {
  targets: Record<string, number>
  incomeGoal: number
  jarGoal: number
  merchantRules: MerchantRule[]
  // Balance anchors from imported statements, used for the "balance matches" check.
  openingBalance?: number // balance before the earliest imported transaction
  openingDate?: string
  closingBalance?: number // latest Running Balance seen in a statement
  closingDate?: string
}
