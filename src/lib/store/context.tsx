'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LeetHubDB } from './db'
import { DexieStore } from './dexie-store'
import { NullStore } from './null-store'
import type { Store } from './types'

interface StoreState {
  store: Store
  ready: boolean
  available: boolean
}

const initialState: StoreState = { store: new NullStore(), ready: false, available: false }
const StoreContext = createContext<StoreState>(initialState)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState)

  useEffect(() => {
    let cancelled = false
    const db = new LeetHubDB()
    db.open()
      .then(() => {
        if (!cancelled) setState({ store: new DexieStore(db), ready: true, available: true })
      })
      .catch(() => {
        if (!cancelled) setState({ store: new NullStore(), ready: true, available: false })
      })
    return () => {
      cancelled = true
      db.close()
    }
  }, [])

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  return useContext(StoreContext).store
}

export function useStoreStatus(): { ready: boolean; available: boolean } {
  const { ready, available } = useContext(StoreContext)
  return { ready, available }
}

/** Live query over the store; re-runs when the underlying IndexedDB data changes. */
export function useLive<T>(query: (store: Store) => Promise<T>, deps: unknown[] = []): T | undefined {
  const store = useStore()
  return useLiveQuery(() => query(store), [store, ...deps])
}
