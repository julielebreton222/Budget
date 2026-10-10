import { useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import Home from './screens/Home'
import Budget from './screens/Budget'
import Jar from './screens/Jar'
import Subs from './screens/Subs'
import Activity from './screens/Activity'
import { StoreProvider } from './lib/store'

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
      <TabBar tab={tab} onChange={setTab} />
    </StoreProvider>
  )
}
