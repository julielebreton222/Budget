import { JarArt } from '../components/EmptyArt'

export default function Jar() {
  return (
    <section>
      <h1 className="screen-title">What I didn't spend</h1>
      <p className="screen-sub">Every skipped buy is money that stays with you.</p>
      <div className="card empty">
        <JarArt />
        <h2>Your jar is waiting</h2>
        <p>Almost bought something and walked away? Pop it in the jar.</p>
        <button className="btn">I didn't buy it! ✦</button>
      </div>
    </section>
  )
}
