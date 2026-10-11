import { useEffect, useState } from 'react'
import { BUCKETS, CATEGORIES } from '../data/categories'
import { todayStr } from '../lib/format'
import type { Txn } from '../lib/types'

type Props = {
  txn?: Txn // editing an entry added by hand
  onSave: (t: Txn) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const OUT_GROUPS = BUCKETS.map((b) => ({ label: b, names: CATEGORIES.filter((c) => c.bucket === b).map((c) => c.name) }))
const IN_GROUPS = [
  { label: 'Money in', names: CATEGORIES.filter((c) => c.group === 'Income').map((c) => c.name) },
  { label: 'My own money', names: ['Transfers from own accounts'] },
]
const OUT_EXTRA = { label: 'My own money', names: ['Transfers to own accounts'] }

export default function AddTxnSheet({ txn, onSave, onDelete, onClose }: Props) {
  const [dir, setDir] = useState<'out' | 'in'>(txn && txn.amount > 0 ? 'in' : 'out')
  const [amount, setAmount] = useState(txn ? String(Math.abs(txn.amount)) : '')
  const [what, setWhat] = useState(txn?.description ?? '')
  const [category, setCategory] = useState(txn?.category ?? 'Eating out & cafés')
  const [date, setDate] = useState(txn?.date ?? todayStr())
  const [note, setNote] = useState(txn?.note ?? '')
  const [tried, setTried] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const groups = dir === 'out' ? [...OUT_GROUPS, OUT_EXTRA] : IN_GROUPS

  function switchDir(d: 'out' | 'in') {
    setDir(d)
    const fits = (d === 'out' ? [...OUT_GROUPS, OUT_EXTRA] : IN_GROUPS).some((g) => g.names.includes(category))
    if (!fits) setCategory(d === 'out' ? 'Eating out & cafés' : 'Business income (typewriting & sales)')
  }

  const value = parseFloat(amount.replace(',', '.'))
  const valid = what.trim() !== '' && value > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!valid) return
    const cents = Math.round(value * 100) / 100
    const t: Txn = {
      id: txn?.id ?? `MANUAL-${crypto.randomUUID()}`,
      date,
      description: what.trim(),
      amount: dir === 'out' ? -cents : cents,
      category,
      kind: 'MANUAL',
      manual: true,
    }
    if (note.trim()) t.note = note.trim()
    onSave(t)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={txn ? 'Edit entry' : 'Add an expense'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{txn ? 'Edit entry' : dir === 'out' ? 'Add an expense' : 'Add money in'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body form">
          <div className="segmented" role="radiogroup" aria-label="Money out or in">
            <button type="button" role="radio" aria-checked={dir === 'out'} className={dir === 'out' ? 'on' : ''} onClick={() => switchDir('out')}>
              Money out
            </button>
            <button type="button" role="radio" aria-checked={dir === 'in'} className={dir === 'in' ? 'on in' : ''} onClick={() => switchDir('in')}>
              Money in
            </button>
          </div>
          <label className="field amount-field">
            <span>Amount €</span>
            <input
              autoFocus={!txn}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-invalid={tried && !(value > 0)}
            />
            {tried && !(value > 0) && <small className="err">Add the amount</small>}
          </label>
          <label className="field">
            <span>What was it?</span>
            <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder={dir === 'out' ? 'Coffee with Ana' : 'Typewriting client'} aria-invalid={tried && !what.trim()} />
            {tried && !what.trim() && <small className="err">Give it a name</small>}
          </label>
          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.names.map((n) => <option key={n}>{n}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
            </label>
          </div>
          <label className="field">
            <span>Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Paid in cash" />
          </label>
          <button className="btn full" type="submit">{txn ? 'Save changes' : dir === 'out' ? 'Add expense' : 'Add money in'}</button>
          {txn && onDelete && (
            confirmDelete ? (
              <div className="confirm danger">
                <p>Delete “{txn.description}”? This can't be undone.</p>
                <div className="settings-btns">
                  <button type="button" className="btn danger" onClick={() => onDelete(txn.id)}>Yes, delete</button>
                  <button type="button" className="btn soft" onClick={() => setConfirmDelete(false)}>Keep it</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn danger-soft full" onClick={() => setConfirmDelete(true)}>Delete entry</button>
            )
          )}
          <p className="muted small center">Entries added by hand are for cash or other accounts. Anything paid with Wise arrives with your next import.</p>
        </div>
      </form>
    </div>
  )
}
