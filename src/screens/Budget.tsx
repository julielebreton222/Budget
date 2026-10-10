import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'
import { useStore } from '../lib/store'

export default function Budget({ go }: { go: (t: Tab) => void }) {
  const { ready, txns } = useStore()
  if (!ready) return null
  if (txns.length)
    return (
      <section>
        <h1 className="screen-title">Budget</h1>
        <p className="screen-sub">Your monthly targets, category by category.</p>
        <div className="card empty">
          <PurseArt />
          <h2>Coming in the next step ✦</h2>
          <p>{txns.length.toLocaleString('en-US')} transactions are ready for this screen.</p>
        </div>
      </section>
    )
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
}
