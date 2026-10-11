import { useState } from 'react'
import { BUCKETS, EXPENSE_CATEGORIES } from '../data/categories'
import { useStore } from '../lib/store'
import { euro } from '../lib/format'

/** Settings card for building "My budget": a monthly target per spending category. */
export default function BudgetEditor() {
  const { settings, updateSettings } = useStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const start = () => {
    const base = settings.customTargets ?? settings.targets
    setDraft(Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.name, String(base[c.name] ?? 0)])))
    setSaved(false)
    setOpen(true)
  }

  const num = (v: string | undefined) => Math.max(0, Math.round(parseFloat((v ?? '').replace(',', '.')) || 0))
  const total = EXPENSE_CATEGORIES.reduce((a, c) => a + num(draft[c.name]), 0)
  const current = EXPENSE_CATEGORIES.reduce((a, c) => a + (settings.targets[c.name] ?? 0), 0)

  function save() {
    const targets = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.name, num(draft[c.name])]))
    updateSettings({ customTargets: targets, targets })
    setSaved(true)
    setOpen(false)
  }

  if (!open)
    return (
      <div className="card">
        <h3 className="card-title">My budget</h3>
        <p className="muted small-top">
          {settings.customTargets
            ? `Your own budget: ${euro(EXPENSE_CATEGORIES.reduce((a, c) => a + (settings.customTargets![c.name] ?? 0), 0))} a month.`
            : `Set your own monthly target for every category. Right now the total is ${euro(current)} a month.`}
        </p>
        <button className="btn soft full" onClick={start}>
          {settings.customTargets ? 'Edit my budget' : 'Create my budget'}
        </button>
        {saved && <p className="settings-msg">Saved and in use ✦</p>}
      </div>
    )

  return (
    <div className="card budget-editor">
      <div className="cat-row-head">
        <h3 className="card-title">My budget</h3>
        <span className="money big">{euro(total)}</span>
      </div>
      <p className="muted small-top">Monthly target per category. Put 0 for anything you'd rather not spend on.</p>
      {BUCKETS.map((b) => (
        <div key={b}>
          <h4 className="sheet-section">
            {b} · {euro(EXPENSE_CATEGORIES.filter((c) => c.bucket === b).reduce((a, c) => a + num(draft[c.name]), 0))}
          </h4>
          {EXPENSE_CATEGORIES.filter((c) => c.bucket === b).map((c) => (
            <label key={c.name} className="setting">
              <span className="cat-name"><span aria-hidden="true">{c.emoji}</span> {c.name}</span>
              <span className="euro-input">
                €
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={draft[c.name] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [c.name]: e.target.value }))}
                />
              </span>
            </label>
          ))}
        </div>
      ))}
      <div className="settings-btns editor-actions">
        <button className="btn" onClick={save}>Save &amp; use</button>
        <button className="btn soft" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}
