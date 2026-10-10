import { useMemo } from 'react'
import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'
import MonthSwitcher from '../components/MonthSwitcher'
import Ring from '../components/Ring'
import Bar from '../components/Bar'
import Sparkles from '../components/Sparkles'
import { useStore } from '../lib/store'
import { BUSINESS_INCOME, BY_NAME, EXPENSE_CATEGORIES, FROM_OWN } from '../data/categories'
import { inMonth, monthDays, shortName, spentByCategory, statusOf, totals } from '../lib/calc'
import { euro, monthLabel, shiftMonth } from '../lib/format'

export default function Home({ go }: { go: (t: Tab) => void }) {
  const { ready, txns, skipped, settings, month, setMonth } = useStore()

  const m = useMemo(() => {
    const cur = inMonth(txns, month)
    const prevMonth = shiftMonth(month, -1)
    const prev = inMonth(txns, prevMonth)
    const t = totals(cur)
    const byCat = spentByCategory(cur)
    const budget = EXPENSE_CATEGORIES.reduce((a, c) => a + (settings.targets[c.name] ?? 0), 0)
    const days = monthDays(month)
    const left = budget - t.spending
    const business = cur.filter((x) => x.category === BUSINESS_INCOME).reduce((a, x) => a + x.amount, 0)
    const drawNow = cur.filter((x) => x.category === FROM_OWN).reduce((a, x) => a + x.amount, 0)
    const drawPrev = prev.filter((x) => x.category === FROM_OWN).reduce((a, x) => a + x.amount, 0)
    const jar = skipped.filter((s) => s.date.startsWith(month)).reduce((a, s) => a + s.price, 0)

    const rows = Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([name, spent]) => ({ name, spent, target: settings.targets[name] ?? 0 }))
    const ratio = (r: { spent: number; target: number }) => (r.target > 0 ? r.spent / r.target : Infinity)
    // The five biggest categories, shown worst (furthest past target) first.
    const top = [...rows]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
      .sort((a, b) => ratio(b) - ratio(a) || b.spent - a.spent)

    // One friendly headline: the biggest overspend, else the biggest win.
    const budgeted = rows.filter((r) => r.target > 0)
    const worst = [...budgeted].sort((a, b) => b.spent - b.target - (a.spent - a.target))[0]
    const best = [...budgeted].sort((a, b) => a.spent - a.target - (b.spent - b.target))[0]
    let insight = ''
    if (worst && worst.spent > worst.target)
      insight = `${shortName(worst.name)} is over by ${euro(worst.spent - worst.target)}, a quiet week would fix it.`
    else if (best && best.target > best.spent)
      insight = `You're ${euro(best.target - best.spent)} under in ${shortName(best.name)} ✦`

    return { t, budget, days, left, business, drawNow, drawPrev, prevMonth, jar, top, insight }
  }, [txns, skipped, settings, month])

  if (!ready) return null

  if (!txns.length)
    return (
      <section>
        <h1 className="screen-title">This month</h1>
        <p className="screen-sub">Spend less, earn more, save more ✦</p>
        <div className="card empty">
          <PurseArt />
          <h2>Nothing here yet</h2>
          <p>Import your Wise statement and your month will appear here.</p>
          <button className="btn" onClick={() => go('activity')}>Import a statement</button>
        </div>
      </section>
    )

  const spentStatus = statusOf(m.t.spending, m.budget)
  const perDay = m.left > 0 && m.days.left > 0 ? m.left / m.days.left : 0
  const goal = settings.incomeGoal
  const goalHit = goal > 0 && m.business >= goal
  const drawDiff = Math.round(m.drawNow) - Math.round(m.drawPrev)

  return (
    <section>
      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="card ring-card">
        <Ring value={m.budget > 0 ? m.t.spending / m.budget : 0} status={spentStatus}>
          <div className="ring-big money">{euro(Math.abs(m.left))}</div>
          <div className="ring-small">{m.left >= 0 ? 'left' : 'over budget'}</div>
        </Ring>
        <div className="ring-facts">
          <div>
            <div className="fact-label">Spent</div>
            <div className="fact money">{euro(m.t.spending)}</div>
            <div className="fact-sub">of {euro(m.budget)}</div>
          </div>
          <div>
            <div className="fact-label">Days left</div>
            <div className="fact money">{m.days.left}</div>
          </div>
          {m.days.left > 0 && m.left > 0 && (
            <div>
              <div className="fact-label">Per day</div>
              <div className="fact money">{euro(perDay)}</div>
              <div className="fact-sub">to stay on track</div>
            </div>
          )}
        </div>
      </div>

      {m.insight && <p className="insight">{m.insight}</p>}

      <div className="mini-cards">
        <div className="card mini">
          <div className="fact-label">Money in</div>
          <div className="fact money in">{euro(m.t.income)}</div>
          <div className="fact-sub">goal {euro(goal)}</div>
        </div>
        <div className="card mini">
          <div className="fact-label">Net</div>
          <div className={'fact money ' + (m.t.net >= 0 ? 'in' : '')}>{euro(m.t.net)}</div>
          <div className="fact-sub">in − spent</div>
        </div>
        <button className="card mini link" onClick={() => go('jar')}>
          <div className="fact-label">Didn't spend</div>
          <div className="fact money jar">{euro(m.jar)}</div>
          <div className="fact-sub">in the jar ›</div>
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">Top categories</h2>
        {m.top.length === 0 ? (
          <p className="muted">No spending in {monthLabel(month)} yet ✦</p>
        ) : (
          m.top.map((r) => (
            <div key={r.name} className="cat-row">
              <div className="cat-row-head">
                <span className="cat-name"><span aria-hidden="true">{BY_NAME.get(r.name)?.emoji}</span> {r.name}</span>
                <span className="num nowrap">
                  <b>{euro(r.spent)}</b> <span className="muted">/ {euro(r.target)}</span>
                </span>
              </div>
              <Bar value={r.target > 0 ? r.spent / r.target : 1} status={statusOf(r.spent, r.target)} label={r.name} />
            </div>
          ))
        )}
      </div>

      <div className={'card goal-card' + (goalHit ? ' hit' : '')}>
        {goalHit && <Sparkles key={month} />}
        <h2 className="card-title">⌨️ Typewriting income</h2>
        <div className="cat-row-head">
          <span className="money big">{euro(m.business)}</span>
          <span className="muted num">goal {euro(goal)}</span>
        </div>
        <Bar value={goal > 0 ? m.business / goal : 0} status={goalHit ? 'under' : 'close'} label="Business income vs goal" />
        <p className="goal-note">
          {goalHit ? 'Goal reached! You did it ✦' : `${euro(goal - m.business)} to go. Every client counts.`}
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">🐷 Savings draw</h2>
        <p className="muted small-top">Money moved in from your other accounts. Less is better.</p>
        <div className="draw">
          <div>
            <div className="fact-label">{monthLabel(month)}</div>
            <div className="fact money">{euro(m.drawNow)}</div>
          </div>
          <div>
            <div className="fact-label">{monthLabel(m.prevMonth)}</div>
            <div className="fact money muted">{euro(m.drawPrev)}</div>
          </div>
        </div>
        <p className={'draw-note ' + (drawDiff <= 0 ? 'good' : '')}>
          {m.drawNow === 0 && m.drawPrev === 0
            ? 'No savings used. Lovely ✦'
            : drawDiff < 0
              ? `${euro(-drawDiff)} less than last month ✦`
              : drawDiff === 0
                ? 'Same as last month.'
                : `${euro(drawDiff)} more than last month. Next month can be lighter.`}
        </p>
      </div>
    </section>
  )
}
