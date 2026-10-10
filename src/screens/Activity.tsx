import { PurseArt } from '../components/EmptyArt'

export default function Activity() {
  return (
    <section>
      <h1 className="screen-title">Activity</h1>
      <p className="screen-sub">Every transaction, sorted into categories.</p>
      <div className="card empty">
        <PurseArt />
        <h2>No transactions yet</h2>
        <p>Download your statement from Wise as .xlsx or .csv. It stays on this device.</p>
        <button className="btn">Import Wise statement</button>
      </div>
    </section>
  )
}
