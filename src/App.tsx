import { useEffect, useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import Home from './screens/Home'
import Budget from './screens/Budget'
import Jar from './screens/Jar'
import Subs from './screens/Subs'
import Activity from './screens/Activity'
import { StoreProvider, useStore } from './lib/store'
import AddTxnSheet from './components/AddTxnSheet'
import { euro2 } from './lib/format'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <StoreProvider>
      <main className="app">
        <header className="topbar">
          <div className="logo">
            <img src="./icons/icon-192.png" alt="" />
            Pink Purse <span className="spark" aria-hidden="true">✦</span>
          </div>
        </header>
        {tab === 'home' && <Home go={setTab} />}
        {tab === 'budget' && <Budget go={setTab} />}
        {tab === 'subs' && <Subs go={setTab} />}
        {tab === 'jar' && <Jar />}
        {tab === 'activity' && <Activity />}
      </main>
      {(tab === 'home' || tab === 'budget' || tab === 'activity') && <AddButton />}
      <TabBar tab={tab} onChange={setTab} />
    </StoreProvider>
  )
}

/** Floating + button: add an expense (or money in) by hand. */
function AddButton() {
  const { saveTxn, setMonth } = useStore()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  return (
    <>
      <button className="fab" aria-label="Add an expense" onClick={() => setOpen(true)}>+</button>
      {open && (
        <AddTxnSheet
          onClose={() => setOpen(false)}
          onSave={(t) => {
            saveTxn(t)
            setMonth(t.date.slice(0, 7))
            setOpen(false)
            setToast(`Added ${t.description} · ${euro2(Math.abs(t.amount))} ✦`)
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
