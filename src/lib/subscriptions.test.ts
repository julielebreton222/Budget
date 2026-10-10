import { describe, expect, it } from 'vitest'
import { findSubscriptions, merchantKey, prettyName } from './subscriptions'
import type { Txn } from './types'

let n = 0
const t = (date: string, amount: number, description: string, category = 'Subscriptions, apps & phone'): Txn => ({
  id: `X-${n++}`, date, amount, description, category,
})

describe('merchantKey', () => {
  it('drops per-charge codes and phone numbers', () => {
    expect(merchantKey('Canva* I05030-32379612 +17372853388')).toBe('canva')
    expect(merchantKey('Uber   *One Membership UBER.COM/BILL')).toBe('uber *one')
    expect(merchantKey('Notion Labs, Inc. +14154004291')).toBe('notion labs')
    expect(merchantKey('Sqsp* Websit#254284093 SQUARESPACE.C')).toBe('sqsp')
  })
})

describe('prettyName', () => {
  it('cleans up billing names', () => {
    expect(prettyName('sqsp')).toBe('Squarespace')
    expect(prettyName('weglot paris')).toBe('Weglot')
    expect(prettyName('lycamobile portugal')).toBe('Lycamobile')
    expect(prettyName('canva')).toBe('Canva')
  })
})

describe('findSubscriptions', () => {
  it('finds a monthly charge, ignoring €1 card checks, and uses the latest price', () => {
    const txns = [
      t('2026-06-07', -4, 'Lycamobile Portugal Lda'), t('2026-07-05', -4, 'Lycamobile Portugal Lda'),
      t('2026-08-04', -4, 'Lycamobile Portugal Lda'), t('2026-08-04', -1, 'Lycamobile Portugal Lda'),
      t('2026-09-03', -7, 'Lycamobile Portugal Lda'), t('2026-10-03', -7, 'Lycamobile Portugal Lda'),
    ]
    const [s] = findSubscriptions(txns, '2026-10-10')
    expect(s).toMatchObject({ cadence: 'monthly', amount: 7, active: true, nextDate: '2026-11-02' })
  })

  it('marks a subscription stopped when charges dry up', () => {
    const txns = ['2025-03-24', '2025-04-24', '2025-05-24', '2025-06-24'].map((d) => t(d, -8.66, 'Notion Student NOTION.SO'))
    expect(findSubscriptions(txns, '2026-10-10')[0]).toMatchObject({ active: false, lastDate: '2025-06-24' })
  })

  it('finds yearly charges', () => {
    const txns = [t('2025-01-07', -55.83, 'Wordpress 98bpx7krcq', 'Business & website costs'), t('2026-01-06', -57.1, 'Wordpress 77abc', 'Business & website costs')]
    expect(findSubscriptions(txns, '2026-10-10')[0]).toMatchObject({ cadence: 'yearly', active: true })
  })

  it('skips groceries and irregular shopping', () => {
    const txns = [
      ...['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'].map((d) => t(d, -40, 'Pingo Doce', 'Groceries & household')),
      ...['2026-01-03', '2026-01-20', '2026-03-29', '2026-07-02'].map((d) => t(d, -15, 'Les Mills', 'Courses, fitness & learning')),
    ]
    expect(findSubscriptions(txns, '2026-10-10')).toEqual([])
  })
})
