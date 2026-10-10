import type { Tab } from '../components/TabBar'
import { PurseArt } from '../components/EmptyArt'

export default function Budget({ go }: { go: (t: Tab) => void }) {
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
