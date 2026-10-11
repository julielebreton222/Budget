import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { defaultSettings } from '../lib/defaults'
import { downloadBackup, makeBackup, parseBackup, type Backup } from '../lib/backup'
import { euro } from '../lib/format'
import BudgetEditor from './BudgetEditor'

function GoalInput({ label, value, onSave }: { label: string; value: number; onSave: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  const [last, setLast] = useState(value)
  if (value !== last) {
    setLast(value)
    setDraft(String(value))
  }
  const commit = () => {
    const n = Math.round(parseFloat(draft.replace(',', '.')))
    if (n > 0 && n !== value) onSave(n)
    else setDraft(String(value))
  }
  return (
    <label className="setting">
      <span>{label}</span>
      <span className="euro-input">
        €
        <input
          type="number"
          inputMode="decimal"
          min={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </span>
    </label>
  )
}

export default function Settings() {
  const { txns, skipped, settings, updateSettings, replaceAll } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setMsg(null)
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'That file could not be read.', bad: true })
    }
  }

  async function restore() {
    if (!pending) return
    await replaceAll({ txns: pending.txns, skipped: pending.skipped, settings: pending.settings })
    setMsg({ text: `Restored ${pending.txns.length.toLocaleString('en-US')} transactions and ${pending.skipped.length} jar items ✦` })
    setPending(null)
  }

  async function reset() {
    await replaceAll({ txns: [], skipped: [], settings: defaultSettings() })
    setConfirmReset(false)
    setMsg({ text: 'All data erased. A fresh start ✦' })
  }

  const backupDate = pending?.exportedAt
    ? new Date(pending.exportedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'an unknown date'

  return (
    <div className="settings">
      <h2 className="list-title">Settings</h2>

      <div className="card">
        <GoalInput label="Typewriting income goal / month" value={settings.incomeGoal} onSave={(n) => updateSettings({ incomeGoal: n })} />
        <GoalInput label="Jar goal" value={settings.jarGoal} onSave={(n) => updateSettings({ jarGoal: n })} />
      </div>

      <BudgetEditor />

      {settings.merchantRules.length > 0 && (
        <div className="card">
          <h3 className="card-title">My merchant rules</h3>
          {settings.merchantRules.map((r) => (
            <div key={r.match} className="rule">
              <span className="rule-text">
                <b>{r.match}</b> → {r.category}
              </span>
              <button
                className="icon-btn del"
                aria-label={`Remove rule for ${r.match}`}
                onClick={() => updateSettings({ merchantRules: settings.merchantRules.filter((x) => x.match !== r.match) })}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Backup</h3>
        <p className="muted small-top">
          Your data lives only on this device. Export a backup to keep it safe or to move it between your iPhone and Mac.
        </p>
        <div className="settings-btns">
          <button className="btn soft" onClick={() => downloadBackup(makeBackup(txns, skipped, settings))}>Export backup</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
          <button className="btn lilac" onClick={() => fileRef.current?.click()}>Restore backup</button>
        </div>
        {pending && (
          <div className="confirm" role="alertdialog" aria-label="Confirm restore">
            <p>
              Replace everything on this device with the backup from <b>{backupDate}</b>? It has{' '}
              <b>{pending.txns.length.toLocaleString('en-US')}</b> transactions and <b>{pending.skipped.length}</b> jar items
              ({euro(pending.skipped.reduce((a, s) => a + s.price, 0))}).
            </p>
            <div className="settings-btns">
              <button className="btn" onClick={restore}>Yes, restore</button>
              <button className="btn soft" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Start over</h3>
        {!confirmReset ? (
          <button className="btn danger-soft" onClick={() => setConfirmReset(true)}>Reset all data</button>
        ) : (
          <div className="confirm danger" role="alertdialog" aria-label="Confirm reset">
            <p>
              This erases all <b>{txns.length.toLocaleString('en-US')}</b> transactions, <b>{skipped.length}</b> jar items and your
              targets from this device. Export a backup first if you might want them back.
            </p>
            <div className="settings-btns">
              <button className="btn danger" onClick={reset}>Yes, erase everything</button>
              <button className="btn soft" onClick={() => setConfirmReset(false)}>Keep my data</button>
            </div>
          </div>
        )}
      </div>

      {msg && <p className={'settings-msg ' + (msg.bad ? 'bad' : '')} role="status">{msg.text}</p>}
      <p className="muted center small">Pink Purse ✦ your money, on your device.</p>
    </div>
  )
}
