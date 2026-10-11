import { useEffect, useMemo, useState } from 'react'
import MonthSwitcher from './MonthSwitcher'
import Bar from './Bar'
import CategorySheet from './CategorySheet'
import { useStore } from '../lib/store'
import { BUCKETS, CATEGORIES } from '../data/categories'
import { inMonth, statusOf, totals } from '../lib/calc'
import { dayLabel, euro, euro2, monthLabel, txnAmount } from '../lib/format'
import type { Txn } from '../lib/types'

type Props = { focus?: string; onBack: () => void }

const SECTIONS = [
  { title: 'Money in', names: CATEGORIES.filter((c) => c.group === 'Income').map((c) => c.name), kind: 'in' as const },
  ...BUCKETS.map((b) => ({ title: b, names: CATEGORIES.filter((c) => c.bucket === b).map((c) => c.name), kind: 'out' as const })),
  { title: 'Moving my own money', names: CATEGORIES.filter((c) => c.group === 'Funding').map((c) => c.name), kind: 'own' as const },
]

const emojiOf = new Map(CATEGORIES.map((c) => [c.name, c.emoji]))

export default function MonthDetail({ focus, onBack }: Props) {
  const { txns, settings, month, setMonth, setCategory } = useStore()
  const [open, setOpen] = useState<Set<string>>(() => new Set(focus ? [focus] : []))
  const [editing, setEditing] = useState<Txn | null>(null)

  useEffect(() => {
    if (focus) document.getElementById(`cat-${focus}`)?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [focus])

  const cur = useMemo(() => inMonth(txns, month), [txns, month])
  const t = useMemo(() => totals(cur), [cur])
  const byCat = useMemo(() => {
    const m = new Map<string, Txn[]>()
    for (const x of cur) {
      const list = m.get(x.category)
      if (list) list.push(x)
      else m.set(x.category, [x])
    }
    for (const list of m.values()) list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.amount - b.amount))
    return m
  }, [cur])

  const present = SECTIONS.flatMap((s) => s.names).filter((n) => byCat.has(n))
  const allOpen = present.length > 0 && present.every((n) => open.has(n))

  const toggle = (name: string) =>
    setOpen((o) => {
      const next = new Set(o)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  return (
    <section className="detail">
      <div className="detail-top">
        <button className="icon-btn" aria-label="Back to Home" onClick={onBack}>‹</button>
        <h1 className="screen-title">Month in detail</h1>
      </div>
      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="card detail-sum">
        <div><div className="fact-label">Money in</div><div className="fact money in">{euro(t.income)}</div></div>
        <div><div className="fact-label">Spent</div><div className="fact money">{euro(t.spending)}</div></div>
        <div><div className="fact-label">Net</div><div className={'fact money ' + (t.net >= 0 ? 'in' : '')}>{euro(t.net)}</div></div>
      </div>

      {cur.length === 0 ? (
        <div className="card empty small"><p>No transactions in {monthLabel(month)}.</p></div>
      ) : (
        <>
          <div className="detail-tools">
            <span className="muted small">{cur.length} transactions</span>
            <button className="link-btn" onClick={() => setOpen(allOpen ? new Set() : new Set(present))}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {SECTIONS.map((s) => {
            const names = s.names.filter((n) => byCat.has(n))
            if (!names.length) return null
            const sectionTotal = names.reduce((a, n) => a + byCat.get(n)!.reduce((x, y) => x + y.amount, 0), 0)
            return (
              <div key={s.title}>
                <div className="bucket-head">
                  <h2>{s.title}</h2>
                  <span className="num muted">{s.kind === 'out' ? euro(-sectionTotal) : euro(sectionTotal)}</span>
                </div>
                <div className="card list">
                  {names.map((name) => {
                    const list = byCat.get(name)!
                    const sum = list.reduce((a, x) => a + x.amount, 0)
                    const spent = -sum
                    const target = settings.targets[name] ?? 0
                    const isOpen = open.has(name)
                    return (
                      <div key={name} id={`cat-${name}`} className="detail-cat">
                        <button className="detail-cat-head" aria-expanded={isOpen} onClick={() => toggle(name)}>
                          <span className="txn-emoji" aria-hidden="true">{emojiOf.get(name)}</span>
                          <span className="detail-cat-name">
                            <span className="txn-desc">{name}</span>
                            <span className="sub-meta">
                              {list.length} transaction{list.length === 1 ? '' : 's'}
                              {s.kind === 'out' && target > 0 && ` · target ${euro(target)}`}
                            </span>
                          </span>
                          <span className={'money detail-cat-sum' + (s.kind === 'in' ? ' in' : '')}>
                            {s.kind === 'out' ? euro2(spent) : txnAmount(sum)}
                          </span>
                          <span className={'chev' + (isOpen ? ' up' : '')} aria-hidden="true">›</span>
                        </button>
                        {s.kind === 'out' && (target > 0 || spent > 0) && (
                          <div className="detail-bar">
                            <Bar value={target > 0 ? spent / target : 1} status={statusOf(spent, target)} label={`${name} vs target`} />
                          </div>
                        )}
                        {isOpen && (
                          <div className="detail-txns">
                            {list.map((x) => (
                              <div key={x.id} className="detail-txn">
                                <div className="detail-txn-main">
                                  <div className="detail-txn-desc">
                                    {x.description}
                                    {x.kind === 'MANUAL' && <span className="hand-tag">by hand</span>}
                                  </div>
                                  <div className="sub-meta">
                                    {dayLabel(x.date)}
                                    {x.original ? ` · ${x.original}` : ''}
                                  </div>
                                </div>
                                <div className={'money detail-txn-amt' + (x.amount > 0 ? ' in' : '')}>{txnAmount(x.amount)}</div>
                                <button className="chip move" onClick={() => setEditing(x)} aria-label={`Change category of ${x.description}`}>
                                  Move
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {editing && (
        <CategorySheet
          txn={editing}
          onClose={() => setEditing(null)}
          onPick={(c, always) => {
            setCategory(editing.id, c, always)
            setOpen((o) => new Set(o).add(c))
            setEditing(null)
          }}
        />
      )}
    </section>
  )
}
