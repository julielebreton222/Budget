export type Tab = 'home' | 'budget' | 'jar' | 'activity'

const icons: Record<Tab, React.ReactNode> = {
  home: (
    <path d="M4 11.5 12 5l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5h-6v5H5.5A1.5 1.5 0 0 1 4 19z" />
  ),
  budget: (
    <>
      <rect x="4" y="13" width="4" height="7" rx="2" />
      <rect x="10" y="8" width="4" height="12" rx="2" />
      <rect x="16" y="4" width="4" height="16" rx="2" />
    </>
  ),
  jar: (
    <>
      <path d="M8 3.5h8M9 3.5v3c-2.4 1-4 3-4 5.8V18a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18v-5.7c0-2.8-1.6-4.8-4-5.8v-3" />
      <path d="M6 14c2-1 4 1 6 0s4-1 6 0" />
    </>
  ),
  activity: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
}

const labels: Record<Tab, string> = { home: 'Home', budget: 'Budget', jar: 'Jar', activity: 'Activity' }

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button
            key={t}
            className="tab"
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => onChange(t)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {icons[t]}
            </svg>
            {labels[t]}
          </button>
        ))}
      </div>
    </nav>
  )
}
