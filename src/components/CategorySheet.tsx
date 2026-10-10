import { useEffect, useState } from 'react'
import { BUCKETS, CATEGORIES } from '../data/categories'
import type { Txn } from '../lib/types'

const SECTIONS: { title: string; names: string[] }[] = [
  { title: 'Money in', names: CATEGORIES.filter((c) => c.group === 'Income').map((c) => c.name) },
  ...BUCKETS.map((b) => ({ title: b, names: CATEGORIES.filter((c) => c.bucket === b).map((c) => c.name) })),
  { title: 'Moving my own money', names: CATEGORIES.filter((c) => c.group === 'Funding').map((c) => c.name) },
]

const emojiOf = new Map(CATEGORIES.map((c) => [c.name, c.emoji]))

type Props = { txn: Txn; onPick: (category: string, always: boolean) => void; onClose: () => void }

export default function CategorySheet({ txn, onPick, onClose }: Props) {
  const [always, setAlways] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose a category" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>Choose a category</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <p className="sheet-sub">{txn.description}</p>
        <label className="always">
          <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} />
          <span>Always use this category for “{txn.description}”</span>
        </label>
        <div className="sheet-body">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="sheet-section">{s.title}</h3>
              <div className="cat-grid">
                {s.names.map((n) => (
                  <button
                    key={n}
                    className={'cat-option' + (n === txn.category ? ' on' : '')}
                    onClick={() => onPick(n, always)}
                  >
                    <span aria-hidden="true">{emojiOf.get(n)}</span> {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
