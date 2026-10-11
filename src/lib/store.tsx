import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as db from './db'
import { defaultSettings } from './defaults'
import { personalMatch } from './categorize'
import type { ImportResult } from './wise'
import type { Settings, Skipped, Txn } from './types'

type State = { ready: boolean; txns: Txn[]; skipped: Skipped[]; settings: Settings }

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function useStoreState() {
  const [state, setState] = useState<State>({ ready: false, txns: [], skipped: [], settings: defaultSettings() })
  const [month, setMonth] = useState(thisMonth)

  useEffect(() => {
    db.loadAll().then((d) => setState({ ready: true, ...d }))
  }, [])

  const importFile = useCallback(
    async (file: File): Promise<ImportResult> => {
      // SheetJS is large, so it only loads when a statement is imported.
      const { parseStatement, mergeStatement } = await import('./wise')
      const parsed = parseStatement(await file.arrayBuffer(), file.name, state.settings.merchantRules)
      const res = mergeStatement(new Map(state.txns.map((t) => [t.id, t])), parsed, state.settings)
      await db.putTxns(res.newTxns)
      await db.saveSettings(res.settings)
      setState((s) => ({ ...s, txns: [...s.txns, ...res.newTxns], settings: res.settings }))
      return res
    },
    [state.txns, state.settings],
  )

  /** Change one transaction's category. With `always`, also save a merchant rule and apply it everywhere. */
  const setCategory = useCallback(
    async (id: string, category: string, always: boolean) => {
      const target = state.txns.find((t) => t.id === id)
      if (!target) return
      let settings = state.settings
      if (always) {
        const match = target.description.toLowerCase().trim()
        settings = {
          ...settings,
          merchantRules: [{ match, category }, ...settings.merchantRules.filter((r) => r.match !== match)],
        }
      }
      const changed: Txn[] = []
      const txns = state.txns.map((t) => {
        let next = t
        if (t.id === id) next = { ...t, category, manual: true }
        else if (always && !t.manual) {
          const c = personalMatch(t.description, settings.merchantRules)
          if (c && c !== t.category) next = { ...t, category: c }
        }
        if (next !== t) changed.push(next)
        return next
      })
      setState((s) => ({ ...s, txns, settings }))
      await db.putTxns(changed)
      if (always) await db.saveSettings(settings)
    },
    [state.txns, state.settings],
  )

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...state.settings, ...patch }
      setState((s) => ({ ...s, settings: next }))
      await db.saveSettings(next)
    },
    [state.settings],
  )

  /** Add or replace a transaction entered by hand. */
  const saveTxn = useCallback(async (t: Txn) => {
    setState((s) => ({ ...s, txns: [...s.txns.filter((x) => x.id !== t.id), t] }))
    await db.putTxns([t])
  }, [])

  const deleteTxn = useCallback(async (id: string) => {
    setState((s) => ({ ...s, txns: s.txns.filter((x) => x.id !== id) }))
    await db.deleteTxn(id)
  }, [])

  const addSkipped = useCallback(async (item: Skipped) => {
    setState((s) => ({ ...s, skipped: [...s.skipped, item] }))
    await db.putSkipped(item)
  }, [])

  const removeSkipped = useCallback(async (id: string) => {
    setState((s) => ({ ...s, skipped: s.skipped.filter((k) => k.id !== id) }))
    await db.deleteSkipped(id)
  }, [])

  const replaceAll = useCallback(async (data: Omit<State, 'ready'>) => {
    await db.replaceAll(data)
    setState({ ready: true, ...data })
  }, [])

  return useMemo(
    () => ({ ...state, month, setMonth, importFile, setCategory, updateSettings, saveTxn, deleteTxn, addSkipped, removeSkipped, replaceAll }),
    [state, month, importFile, setCategory, updateSettings, saveTxn, deleteTxn, addSkipped, removeSkipped, replaceAll],
  )
}

type Store = ReturnType<typeof useStoreState>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreState()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
