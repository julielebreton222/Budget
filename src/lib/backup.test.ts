import { describe, expect, it } from 'vitest'
import { makeBackup, parseBackup } from './backup'
import { defaultSettings } from './defaults'

describe('backup', () => {
  it('round-trips data and settings', () => {
    const txn = { id: 'C-1|2026-10-01|-5.00', date: '2026-10-01', description: 'Lidl', amount: -5, category: 'Groceries & household' }
    const skip = { id: 's1', date: '2026-10-02', item: 'Dress', price: 45, category: 'Shopping & clothing' }
    const b = makeBackup([txn], [skip], { ...defaultSettings(), jarGoal: 500 })
    const back = parseBackup(JSON.stringify(b))
    expect(back.txns).toEqual([txn])
    expect(back.skipped).toEqual([skip])
    expect(back.settings.jarGoal).toBe(500)
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/Pink Purse backup/)
    expect(() => parseBackup('{"hello":1}')).toThrow(/Pink Purse backup/)
  })

  it('fills in settings added after the backup was made', () => {
    const back = parseBackup(JSON.stringify({ app: 'pink-purse', txns: [], skipped: [], settings: { jarGoal: 200 } }))
    expect(back.settings).toMatchObject({ jarGoal: 200, incomeGoal: 600, merchantRules: [] })
  })
})
