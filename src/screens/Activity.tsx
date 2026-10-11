import { useMemo, useRef, useState } from 'react'
import { PurseArt } from '../components/EmptyArt'
import MonthSwitcher from '../components/MonthSwitcher'
import CategorySheet from '../components/CategorySheet'
import Settings from '../components/Settings'
import AddTxnSheet from '../components/AddTxnSheet'
import { BY_NAME, CATEGORIES, REVIEW } from '../data/categories'
import { useStore } from '../lib/store'
import type { ImportResult } from '../lib/wise'
import { dayLabel, euro, euro2, txnAmount } from '../lib/format'
import { balanceCheck, monthOf, totals } from '../lib/calc'
import type { Txn } from '../lib/types'

const ALL = '__all'
const NEEDS_REVIEW = '__review'

export default function Activity() {
  const { ready, txns, settings, month, setMonth, importFile, setCategory, saveTxn, deleteTxn } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(ALL)
  const [editing, setEditing] = useState<Txn | null>(null)
  const [editingHand, setEditingHand] = useState<Txn | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reviewCount = useMemo(() => txns.filter((t) => t.category === REVIEW).length, [txns])
  const check = useMemo(() => balanceCheck(txns, settings), [txns, settings])

  // Searching or reviewing looks across every month; otherwise show the chosen month.
  const allMonths = query.trim() !== '' || filter === NEEDS_REVIEW
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txns
      .filter((t) => allMonths || monthOf(t.date) === month)
      .filter((t) => (filter === ALL ? true : filter === NEEDS_REVIEW ? t.category === REVIEW : t.category === filter))
      .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.note ?? '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)))
  }, [txns, month, query, filter, allMonths])

  const days = useMemo(() => {
    const out: { date: string; items: Txn[] }[] = []
    for (const t of list) {
      if (out.at(-1)?.date !== t.date) out.push({ date: t.date, items: [] })
      out.at(-1)!.items.push(t)
    }
    return out
  }, [list])

  const sums = useMemo(() => totals(list), [list])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const res = await importFile(file)
      setResult(res)
      const latest = res.newTxns.reduce((m, t) => (t.date > m ? t.date : m), '')
      if (latest) setMonth(monthOf(latest))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.')
    } finally {
      setBusy(false)
    }
  }

  const importBtn = (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={onFile} />
      <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? 'Reading…' : 'Import Wise statement'}
      </button>
    </>
  )

  if (!ready) return null

  return (
    <section>
      <div className="title-row">
        <div>
          <h1 className="screen-title">Activity</h1>
          <p className="screen-sub">Every transaction, sorted into categories.</p>
        </div>
      </div>

      {error && <div className="card notice bad" role="alert">{error}</div>}

      {result && (
        <div className="card notice" role="status">
          <button className="icon-btn notice-close" aria-label="Dismiss" onClick={() => setResult(null)}>✕</button>
          <strong className="head">Import done ✦</strong>
          <p>
            Added <b>{result.added.toLocaleString('en-US')}</b> new transaction{result.added === 1 ? '' : 's'}, skipped{' '}
            <b>{result.skipped.toLocaleString('en-US')}</b> already there
            {result.needsReview > 0 && <>, <b>{result.needsReview}</b> need{result.needsReview === 1 ? 's' : ''} a category</>}.
          </p>
          {check && (
            <p className={'balance ' + (check.ok ? 'ok' : 'off')}>
              {check.ok
                ? <>✓ Balance matches Wise: {euro2(check.expected)}</>
                : <>Balance is {euro2(check.computed)} here vs {euro2(check.expected)} on Wise. A statement period may be missing.</>}
            </p>
          )}
        </div>
      )}

      {txns.length === 0 ? (
        <div className="card empty">
          <PurseArt />
          <h2>No transactions yet</h2>
          <p>Download your statement from Wise as .xlsx or .csv. It stays on this device.</p>
          {importBtn}
        </div>
      ) : (
        <>
          <div className="toolbar">
            {importBtn}
            {check && (
              <span className={'balance-pill ' + (check.ok ? 'ok' : 'off')} title="Opening balance + all transactions vs Wise's latest balance">
                {check.ok ? '✓ ' : ''}Balance {euro2(check.expected)}
              </span>
            )}
          </div>

          {!allMonths && <MonthSwitcher month={month} onChange={setMonth} />}

          <div className="filters">
            <input
              className="search"
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search transactions"
            />
            <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by category">
              <option value={ALL}>All categories</option>
              <option value={NEEDS_REVIEW}>Needs review ({reviewCount})</option>
              {['Income', 'Expense', 'Funding'].map((g) => (
                <optgroup key={g} label={g === 'Expense' ? 'Spending' : g === 'Funding' ? 'Own money moves' : 'Money in'}>
                  {CATEGORIES.filter((c) => c.group === g).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {reviewCount > 0 && filter !== NEEDS_REVIEW && (
            <button className="review-banner" onClick={() => setFilter(NEEDS_REVIEW)}>
              ❓ {reviewCount} transaction{reviewCount === 1 ? '' : 's'} need{reviewCount === 1 ? 's' : ''} a category. Tap to review
            </button>
          )}

          <div className="list-summary">
            {allMonths && <span>All months · </span>}
            <span>{list.length} transaction{list.length === 1 ? '' : 's'}</span>
            {list.length > 0 && <span> · out {euro(sums.spending)} · in {euro(sums.income)}</span>}
          </div>

          {days.length === 0 ? (
            <div className="card empty small">
              <p>{allMonths ? 'Nothing matches that. Try another word ✦' : 'No transactions this month.'}</p>
            </div>
          ) : (
            days.map((d) => (
              <div key={d.date} className="day">
                <h3 className="day-label">{dayLabel(d.date)}</h3>
                <div className="card list">
                  {d.items.map((t) => {
                    const cat = BY_NAME.get(t.category)
                    return (
                      <div key={t.id} className="txn">
                        <span className="txn-emoji" aria-hidden="true">{cat?.emoji ?? '❓'}</span>
                        <div className="txn-main">
                          {t.kind === 'MANUAL' ? (
                            <button className="txn-desc-btn" onClick={() => setEditingHand(t)} aria-label={`Edit ${t.description}`}>
                              {t.description} <span className="hand-tag">✎ by hand</span>
                            </button>
                          ) : (
                            <div className="txn-desc">{t.description}</div>
                          )}
                          <button
                            className={'chip' + (t.category === REVIEW ? ' review' : '') + (cat?.group === 'Funding' ? ' funding' : '')}
                            onClick={() => setEditing(t)}
                            aria-label={`Category: ${t.category}. Change`}
                          >
                            {t.category}
                          </button>
                        </div>
                        <div className="txn-amt">
                          <div className={'money ' + (t.amount > 0 ? 'in' : '')}>{txnAmount(t.amount)}</div>
                          {t.original && <div className="txn-orig num">{t.original}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}

      <Settings />

      {editingHand && (
        <AddTxnSheet
          txn={editingHand}
          onClose={() => setEditingHand(null)}
          onSave={(t) => {
            saveTxn(t)
            setEditingHand(null)
          }}
          onDelete={(id) => {
            deleteTxn(id)
            setEditingHand(null)
          }}
        />
      )}

      {editing && (
        <CategorySheet
          txn={editing}
          onClose={() => setEditing(null)}
          onPick={(c, always) => {
            setCategory(editing.id, c, always)
            setEditing(null)
          }}
        />
      )}
    </section>
  )
}
