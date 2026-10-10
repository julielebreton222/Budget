import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'
import { useStore } from '../lib/store'

export default function Home({ go }: { go: (t: Tab) => void }) {
  const { ready, txns } = useStore()
  if (!ready) return null
  if (txns.length)
    return (
      <section>
        <h1 className="screen-title">This month</h1>
        <p className="screen-sub">Spend less, earn more, save more ✦</p>
        <div className="card empty">
          <PurseArt />
          <h2>Coming in the next step ✦</h2>
          <p>{txns.length.toLocaleString('en-US')} transactions are ready for this screen.</p>
        </div>
      </section>
    )
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
}
