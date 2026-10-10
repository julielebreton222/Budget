import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../data/categories'
import type { Skipped } from '../lib/types'

const REASONS = ["Didn't need it", 'Waited 48h', 'Found it cheaper', 'Used what I had', 'Just a craving']
const MOODS = ['😌', '💪', '🥰', '😅', '🤔']

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = { onSave: (s: Skipped) => void; onClose: () => void }

export default function SkipSheet({ onSave, onClose }: Props) {
  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Shopping & clothing')
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [mood, setMood] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const amount = parseFloat(price.replace(',', '.'))
  const valid = item.trim() !== '' && amount > 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!valid) return
    const reason = [...reasons, note.trim()].filter(Boolean).join(' · ')
    onSave({
      id: crypto.randomUUID(),
      date,
      item: item.trim(),
      price: Math.round(amount * 100) / 100,
      category,
      ...(reason && { reason }),
      ...(mood && { mood }),
    })
  }

  const toggle = (r: string) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label="I didn't buy it" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>I didn't buy it! ✦</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body form">
          <label className="field">
            <span>What was it?</span>
            <input autoFocus value={item} onChange={(e) => setItem(e.target.value)} placeholder="Pink linen dress" aria-invalid={tried && !item.trim()} />
            {tried && !item.trim() && <small className="err">Tell the jar what you skipped</small>}
          </label>
          <div className="field-row">
            <label className="field">
              <span>Price €</span>
              <input inputMode="decimal" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45" aria-invalid={tried && !(amount > 0)} />
              {tried && !(amount > 0) && <small className="err">Add the price</small>}
            </label>
            <label className="field">
              <span>Date</span>
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
            </label>
          </div>
          <label className="field">
            <span>Category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </label>
          <div className="field">
            <span>Why I skipped it</span>
            <div className="chips">
              {REASONS.map((r) => (
                <button type="button" key={r} className={'pick' + (reasons.includes(r) ? ' on' : '')} aria-pressed={reasons.includes(r)} onClick={() => toggle(r)}>{r}</button>
              ))}
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Something else…" aria-label="Other reason" />
          </div>
          <div className="field">
            <span>How I felt</span>
            <div className="chips">
              {MOODS.map((m) => (
                <button type="button" key={m} className={'pick mood' + (mood === m ? ' on' : '')} aria-pressed={mood === m} onClick={() => setMood(mood === m ? '' : m)}>{m}</button>
              ))}
            </div>
          </div>
          <button className="btn full" type="submit">Put it in the jar</button>
        </div>
      </form>
    </div>
  )
}
