import { useMemo, useState } from 'react'
import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'
import MonthSwitcher from '../components/MonthSwitcher'
import Bar from '../components/Bar'
import Sparkline from '../components/Sparkline'
import { useStore } from '../lib/store'
import { BUCKETS, EXPENSE_CATEGORIES, presetTargets } from '../data/categories'
import { categoryHistory, inMonth, spentByCategory, statusOf } from '../lib/calc'
import { euro, shiftMonth } from '../lib/format'

const STEP1 = presetTargets('step1')
const STEP2 = presetTargets('step2')
const same = (a: Record<string, number>, b: Record<string, number>) => Object.keys(b).every((k) => (a[k] ?? 0) === b[k])

export default function Budget({ go }: { go: (t: Tab) => void }) {
  const { ready, txns, settings, updateSettings, month, setMonth } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const spent = useMemo(() => spentByCategory(inMonth(txns, month)), [txns, month])
  const history = useMemo(() => categoryHistory(txns, month, 6, shiftMonth), [txns, month])

  if (!ready) return null
  if (!txns.length)
    return (
      <section>
        <h1 className="screen-title">Budget</h1>
        <p className="screen-sub">Your monthly targets, category by category.</p>
        <div className="card empty">
          <PurseArt />
          <h2>No spending to compare yet</h2>
          <p>Once a statement is in, every category shows up here next to its target.</p>
          <button className="btn soft" onClick={() => go('activity')}>Go to Activity</button>
        </div>
      </section>
    )

  const targets = settings.targets
  const totalTarget = EXPENSE_CATEGORIES.reduce((a, c) => a + (targets[c.name] ?? 0), 0)
  const totalSpent = EXPENSE_CATEGORIES.reduce((a, c) => a + (spent[c.name] ?? 0), 0)
  const custom = settings.customTargets
  const preset = custom && same(targets, custom) ? 'custom' : same(targets, STEP2) ? 'step2' : same(targets, STEP1) ? 'step1' : null

  function startEdit(name: string) {
    setEditing(name)
    setDraft(String(targets[name] ?? 0))
  }

  function commit() {
    if (!editing) return
    const v = Math.max(0, Math.round(parseFloat(draft.replace(',', '.')) || 0))
    if (v !== (targets[editing] ?? 0)) updateSettings({ targets: { ...targets, [editing]: v } })
    setEditing(null)
  }

  return (
    <section>
      <h1 className="screen-title">Budget</h1>
      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="card budget-total">
        <div className="cat-row-head">
          <span className="head">Total</span>
          <span className="num"><b className="money big">{euro(totalSpent)}</b> <span className="muted">/ {euro(totalTarget)}</span></span>
        </div>
        <Bar value={totalTarget ? totalSpent / totalTarget : 0} status={statusOf(totalSpent, totalTarget)} label="Total spending vs budget" />
        <div className="presets">
          <span className="muted">Targets:</span>
          <button className={'btn small ' + (preset === 'step1' ? '' : 'soft')} onClick={() => updateSettings({ targets: STEP1 })}>Step 1</button>
          <button className={'btn small ' + (preset === 'step2' ? '' : 'soft')} onClick={() => updateSettings({ targets: STEP2 })}>Step 2</button>
          {custom && (
            <button className={'btn small ' + (preset === 'custom' ? '' : 'soft')} onClick={() => updateSettings({ targets: custom })}>My budget</button>
          )}
          {!preset && <span className="muted small">edited</span>}
        </div>
      </div>

      {BUCKETS.map((bucket) => {
        const cats = EXPENSE_CATEGORIES.filter((c) => c.bucket === bucket)
        const bSpent = cats.reduce((a, c) => a + (spent[c.name] ?? 0), 0)
        const bTarget = cats.reduce((a, c) => a + (targets[c.name] ?? 0), 0)
        return (
          <div key={bucket}>
            <div className="bucket-head">
              <h2>{bucket}</h2>
              <span className="num muted">{euro(bSpent)} / {euro(bTarget)}</span>
            </div>
            <div className="card list">
              {cats.map((c) => {
                const s = spent[c.name] ?? 0
                const t = targets[c.name] ?? 0
                const st = statusOf(s, t)
                return (
                  <div key={c.name} className="budget-row">
                    <div className="budget-top">
                      <span className="cat-name"><span aria-hidden="true">{c.emoji}</span> {c.name}</span>
                      <Sparkline values={history.series[c.name] ?? Array(6).fill(0)} label={`${c.name}, last 6 months`} />
                    </div>
                    <div className="budget-mid">
                      <span className={'money budget-spent ' + st}>{euro(s)}</span>
                      <span className="muted"> of </span>
                      {editing === c.name ? (
                        <input
                          className="target-input"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          autoFocus
                          value={draft}
                          aria-label={`Target for ${c.name}`}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commit()
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                      ) : (
                        <button className="target-btn" onClick={() => startEdit(c.name)} aria-label={`Target ${euro(t)} for ${c.name}. Edit`}>
                          {euro(t)} ✎
                        </button>
                      )}
                      <span className={'budget-left ' + st}>
                        {s > t ? `${euro(s - t)} over` : t > 0 ? `${euro(t - s)} left` : ''}
                      </span>
                    </div>
                    <Bar value={t > 0 ? s / t : s > 0 ? 1 : 0} status={st} label={c.name} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
