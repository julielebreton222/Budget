import { useMemo, useState } from 'react'
import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'
import { useStore } from '../lib/store'
import { BY_NAME } from '../data/categories'
import { findSubscriptions, type Subscription } from '../lib/subscriptions'
import { dayLabel, euro, euro2 } from '../lib/format'

const per: Record<Subscription['cadence'], string> = { weekly: '/ week', monthly: '/ month', yearly: '/ year' }

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysUntil(date: string, today: string) {
  const ms = Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')
  return Math.round(ms / 86400000)
}

function dueText(s: Subscription, today: string) {
  const d = daysUntil(s.nextDate, today)
  if (d < 0) return `was due ${dayLabel(s.nextDate)}`
  if (d === 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  if (d <= 14) return `due in ${d} days`
  return `next ${dayLabel(s.nextDate)}`
}

export default function Subs({ go }: { go: (t: Tab) => void }) {
  const { ready, txns, settings, updateSettings } = useStore()
  const [today] = useState(todayStr)
  const [open, setOpen] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)

  const all = useMemo(() => findSubscriptions(txns, today), [txns, today])
  const hidden = new Set(settings.hiddenSubs ?? [])
  const visible = all.filter((s) => !hidden.has(s.key))
  const active = visible.filter((s) => s.active)
  const stopped = visible.filter((s) => !s.active)
  const hiddenList = all.filter((s) => hidden.has(s.key))
  const monthly = active.reduce((a, s) => a + s.monthly, 0)
  const saved = stopped.reduce((a, s) => a + s.monthly, 0)
  const soon = active.filter((s) => daysUntil(s.nextDate, today) >= 0 && daysUntil(s.nextDate, today) <= 7)

  const hide = (key: string) => updateSettings({ hiddenSubs: [...(settings.hiddenSubs ?? []), key] })
  const unhide = (key: string) => updateSettings({ hiddenSubs: (settings.hiddenSubs ?? []).filter((k) => k !== key) })

  if (!ready) return null

  if (!txns.length)
    return (
      <section>
        <h1 className="screen-title">Subscriptions</h1>
        <p className="screen-sub">Everything that charges you again and again.</p>
        <div className="card empty">
          <PurseArt />
          <h2>No subscriptions found yet</h2>
          <p>Import your Wise statement and repeat payments show up here on their own.</p>
          <button className="btn soft" onClick={() => go('activity')}>Go to Activity</button>
        </div>
      </section>
    )

  const row = (s: Subscription) => {
    const isOpen = open === s.key
    return (
      <div key={s.key} className={'sub' + (s.active ? '' : ' off')}>
        <button className="sub-main" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.key)}>
          <span className="txn-emoji" aria-hidden="true">{BY_NAME.get(s.category)?.emoji ?? '🔁'}</span>
          <span className="sub-text">
            <span className="txn-desc">{s.name}</span>
            <span className="sub-meta">
              {s.active ? dueText(s, today) : `last paid ${dayLabel(s.lastDate)}`}
            </span>
          </span>
          <span className="txn-amt">
            <span className="money sub-price">{euro2(s.amount)}</span>
            <span className="txn-orig">{per[s.cadence]}</span>
          </span>
        </button>
        {isOpen && (
          <div className="sub-detail">
            <p className="muted small">
              {s.cadence === 'monthly' ? '' : `≈ ${euro2(s.monthly)} a month · `}
              {euro(s.monthly * 12)} a year · {s.charges.length} payment{s.charges.length === 1 ? '' : 's'} so far · {s.category}
              <br />
              <span className="sub-raw">{s.raw}</span>
            </p>
            <div className="sub-charges">
              {s.charges.slice(0, 12).map((t) => (
                <span key={t.id} className="sub-charge num">
                  {dayLabel(t.date)} <b>{euro2(-t.amount)}</b>
                </span>
              ))}
            </div>
            <button className="btn soft small" onClick={() => hide(s.key)}>Not a subscription</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <section>
      <h1 className="screen-title">Subscriptions</h1>
      <p className="screen-sub">Everything that charges you again and again.</p>

      <div className="card subs-total">
        <div>
          <div className="fact-label">Per month</div>
          <div className="money subs-big">{euro2(monthly)}</div>
        </div>
        <div>
          <div className="fact-label">Per year</div>
          <div className="fact money">{euro(monthly * 12)}</div>
        </div>
        <div>
          <div className="fact-label">Active</div>
          <div className="fact money">{active.length}</div>
        </div>
      </div>

      {soon.length > 0 && (
        <p className="insight">
          Coming up this week: {soon.map((s) => `${s.name} ${euro2(s.amount)}`).join(', ')}.
        </p>
      )}

      {active.length > 0 ? (
        <>
          <h2 className="list-title">Active</h2>
          <div className="card list">{active.map(row)}</div>
          <p className="muted small center tip">Cancelling one you barely use is an easy win. Every euro goes straight to savings ✦</p>
        </>
      ) : (
        <div className="card empty small"><p>No active subscriptions right now. Lovely ✦</p></div>
      )}

      {stopped.length > 0 && (
        <>
          <div className="bucket-head">
            <h2>Looks cancelled</h2>
            <span className="num good-text">saving {euro2(saved)} / month ✦</span>
          </div>
          <div className="card list">{stopped.map(row)}</div>
        </>
      )}

      {hiddenList.length > 0 && (
        <div className="hidden-subs">
          <button className="link-btn" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? 'Hide' : 'Show'} {hiddenList.length} marked “not a subscription”
          </button>
          {showHidden && (
            <div className="card list">
              {hiddenList.map((s) => (
                <div key={s.key} className="rule">
                  <span className="rule-text">{s.name}</span>
                  <button className="btn soft small" onClick={() => unhide(s.key)}>Put back</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="muted small center">
        Found automatically from repeat payments at the same price. Tap one to see every charge.
      </p>
    </section>
  )
}
