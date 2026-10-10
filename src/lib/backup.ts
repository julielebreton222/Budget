import { defaultSettings } from './defaults'
import type { Settings, Skipped, Txn } from './types'

export type Backup = { app: 'pink-purse'; version: 1; exportedAt: string; txns: Txn[]; skipped: Skipped[]; settings: Settings }

export function makeBackup(txns: Txn[], skipped: Skipped[], settings: Settings): Backup {
  return { app: 'pink-purse', version: 1, exportedAt: new Date().toISOString(), txns, skipped, settings }
}

export function downloadBackup(b: Backup) {
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pink-purse-backup-${b.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Reads and checks a backup file. Throws a friendly message if it isn't one. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a Pink Purse backup.")
  }
  if (!isObj(data) || data.app !== 'pink-purse' || !Array.isArray(data.txns) || !Array.isArray(data.skipped)) {
    throw new Error("That file isn't a Pink Purse backup.")
  }
  const txns = data.txns.filter(
    (t): t is Txn => isObj(t) && typeof t.id === 'string' && typeof t.date === 'string' && typeof t.amount === 'number' && typeof t.category === 'string',
  )
  const skipped = data.skipped.filter(
    (s): s is Skipped => isObj(s) && typeof s.id === 'string' && typeof s.price === 'number' && typeof s.item === 'string',
  )
  const settings = { ...defaultSettings(), ...(isObj(data.settings) ? (data.settings as Partial<Settings>) : {}) }
  return { app: 'pink-purse', version: 1, exportedAt: String(data.exportedAt ?? ''), txns, skipped, settings }
}
