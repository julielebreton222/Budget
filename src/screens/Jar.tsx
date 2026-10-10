import { useMemo, useRef, useState } from 'react'
import JarSvg from '../components/JarSvg'
import SkipSheet from '../components/SkipSheet'
import Sparkles from '../components/Sparkles'
import { useStore } from '../lib/store'
import { BY_NAME } from '../data/categories'
import { dayLabel, euro, euro2 } from '../lib/format'
import type { Skipped, Txn } from '../lib/types'

/** Typical spend per purchase in a category, from real money-out transactions. */
function avgSpend(txns: Txn[], category: string) {
  const out = txns.filter((t) => t.category === category && t.amount < 0)
  if (out.length < 3) return 0
  return out.reduce((a, t) => a - t.amount, 0) / out.length
}

const CONVERSIONS = [
  { category: 'Eating out & cafés', one: 'café visit', many: 'café visits' },
  { category: 'Travel – accommodation', one: 'night in a hostel', many: 'nights in a hostel' },
  { category: 'Groceries & household', one: 'grocery run', many: 'grocery runs' },
  { category: 'Transport (local)', one: 'ride', many: 'rides' },
]

const fmtCount = (n: number) => (n >= 10 ? Math.round(n).toString() : (Math.round(n * 2) / 2).toString())

export default function Jar() {
  const { ready, txns, skipped, settings, addSkipped, removeSkipped, updateSettings } = useStore()
  const [adding, setAdding] = useState(false)
  const [burst, setBurst] = useState(0)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const [undo, setUndo] = useState<Skipped | null>(null)
  const [editGoal, setEditGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const undoTimer = useRef<number | undefined>(undefined)

  const goal = Math.max(1, settings.jarGoal)
  const [now] = useState(() => new Date())
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const year = String(now.getFullYear())

  const t = useMemo(() => {
    const sum = (list: Skipped[]) => list.reduce((a, s) => a + s.price, 0)
    return {
      month: sum(skipped.filter((s) => s.date.startsWith(ym))),
      year: sum(skipped.filter((s) => s.date.startsWith(year))),
      all: sum(skipped),
    }
  }, [skipped, ym, year])

  const level = Math.floor(t.all / goal) + 1
  const fill = (t.all % goal) / goal

  const conversions = useMemo(() => {
    if (t.all <= 0) return []
    return CONVERSIONS.map((c) => ({ ...c, avg: avgSpend(txns, c.category) }))
      .filter((c) => c.avg > 0 && t.all / c.avg >= 0.5)
      .slice(0, 3)
      .map((c) => {
        const n = t.all / c.avg
        return { text: `${fmtCount(n)} ${n === 1 ? c.one : c.many}`, hint: `avg ${euro2(c.avg)}` }
      })
  }, [txns, t.all])

  const list = useMemo(() => [...skipped].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [skipped])

  if (!ready) return null

  async function save(s: Skipped) {
    const before = Math.floor(t.all / goal)
    const after = Math.floor((t.all + s.price) / goal)
    await addSkipped(s)
    setAdding(false)
    setBurst((b) => b + 1)
    if (after > before) setLevelUp(after)
  }

  function remove(s: Skipped) {
    removeSkipped(s.id)
    setUndo(s)
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), 5000)
  }

  function commitGoal() {
    const v = Math.round(parseFloat(goalDraft.replace(',', '.')))
    if (v > 0 && v !== settings.jarGoal) updateSettings({ jarGoal: v })
    setEditGoal(false)
  }

  return (
    <section>
      <h1 className="screen-title">What I didn't spend</h1>
      <p className="screen-sub">Every skipped buy is money that stays with you.</p>

      <div className="card jar-card">
        <div className="jar-wrap">
          <JarSvg fill={fill} level={level} />
          {burst > 0 && <Sparkles key={burst} count={18} />}
        </div>
        <div className="jar-total money">{euro(t.all)}</div>
        <div className="jar-goal">
          {editGoal ? (
            <input
              className="target-input"
              type="number"
              inputMode="decimal"
              autoFocus
              value={goalDraft}
              aria-label="Jar goal"
              onChange={(e) => setGoalDraft(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={(e) => e.key === 'Enter' && commitGoal()}
            />
          ) : (
            <button className="target-btn" onClick={() => { setGoalDraft(String(settings.jarGoal)); setEditGoal(true) }} aria-label={`Jar goal ${euro(goal)}. Edit`}>
              {euro(goal - (t.all % goal))} to fill Jar {level} · goal {euro(goal)} ✎
            </button>
          )}
        </div>
        {levelUp && (
          <p className="level-up" role="status">
            Jar {levelUp} is full! ✦ On to Jar {levelUp + 1}
          </p>
        )}
        <button className="btn big-btn" onClick={() => setAdding(true)}>I didn't buy it! ✦</button>
      </div>

      <div className="mini-cards">
        <div className="card mini"><div className="fact-label">This month</div><div className="fact money jar">{euro(t.month)}</div></div>
        <div className="card mini"><div className="fact-label">This year</div><div className="fact money jar">{euro(t.year)}</div></div>
        <div className="card mini"><div className="fact-label">All time</div><div className="fact money jar">{euro(t.all)}</div></div>
      </div>

      {conversions.length > 0 && (
        <div className="card conversions">
          <h2 className="card-title">That's the same as…</h2>
          {conversions.map((c) => (
            <div key={c.text} className="conv">
              <span className="head">= {c.text}</span>
              <span className="muted small">{c.hint}</span>
            </div>
          ))}
        </div>
      )}

      {undo && (
        <div className="toast" role="status">
          Removed “{undo.item}”
          <button onClick={() => { addSkipped(undo); setUndo(null) }}>Undo</button>
        </div>
      )}

      {list.length > 0 ? (
        <>
          <h2 className="list-title">Skipped</h2>
          <div className="card list">
            {list.map((s) => (
              <div key={s.id} className="txn skip-row">
                <span className="txn-emoji" aria-hidden="true">{s.mood || BY_NAME.get(s.category)?.emoji || '✦'}</span>
                <div className="txn-main">
                  <div className="txn-desc">{s.item}</div>
                  <div className="skip-meta">{dayLabel(s.date)}{s.reason ? ` · ${s.reason}` : ''}</div>
                </div>
                <div className="txn-amt">
                  <div className="money jar-amt">{euro2(s.price)}</div>
                </div>
                <button className="icon-btn del" aria-label={`Remove ${s.item}`} onClick={() => remove(s)}>✕</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted center">Almost bought something and walked away? Pop it in the jar.</p>
      )}

      {adding && <SkipSheet onSave={save} onClose={() => setAdding(false)} />}
    </section>
  )
}
