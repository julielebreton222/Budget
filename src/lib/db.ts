import { openDB, type DBSchema } from 'idb'
import type { Settings, Skipped, Txn } from './types'
import { defaultSettings } from './defaults'

interface PurseDB extends DBSchema {
  txns: { key: string; value: Txn; indexes: { date: string } }
  skipped: { key: string; value: Skipped }
  settings: { key: string; value: Settings }
}

const SETTINGS_KEY = 'main'

const dbPromise = openDB<PurseDB>('pink-purse', 1, {
  upgrade(db) {
    const txns = db.createObjectStore('txns', { keyPath: 'id' })
    txns.createIndex('date', 'date')
    db.createObjectStore('skipped', { keyPath: 'id' })
    db.createObjectStore('settings')
  },
})

export async function loadAll() {
  const db = await dbPromise
  const [txns, skipped, settings] = await Promise.all([
    db.getAll('txns'),
    db.getAll('skipped'),
    db.get('settings', SETTINGS_KEY),
  ])
  return { txns, skipped, settings: { ...defaultSettings(), ...settings } }
}

export async function putTxns(list: Txn[]) {
  const db = await dbPromise
  const tx = db.transaction('txns', 'readwrite')
  await Promise.all([...list.map((t) => tx.store.put(t)), tx.done])
}

export async function saveSettings(s: Settings) {
  const db = await dbPromise
  await db.put('settings', s, SETTINGS_KEY)
}

export async function deleteTxn(id: string) {
  const db = await dbPromise
  await db.delete('txns', id)
}

export async function putSkipped(s: Skipped) {
  const db = await dbPromise
  await db.put('skipped', s)
}

export async function deleteSkipped(id: string) {
  const db = await dbPromise
  await db.delete('skipped', id)
}

export async function replaceAll(data: { txns: Txn[]; skipped: Skipped[]; settings: Settings }) {
  const db = await dbPromise
  const tx = db.transaction(['txns', 'skipped', 'settings'], 'readwrite')
  await Promise.all([
    tx.objectStore('txns').clear(),
    tx.objectStore('skipped').clear(),
    tx.objectStore('settings').clear(),
  ])
  await Promise.all([
    ...data.txns.map((t) => tx.objectStore('txns').put(t)),
    ...data.skipped.map((s) => tx.objectStore('skipped').put(s)),
    tx.objectStore('settings').put(data.settings, SETTINGS_KEY),
    tx.done,
  ])
}
