'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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

/** Runs `query` against the current store and re-runs it whenever the store reports a change (or the store/deps change). */
export function useLive<T>(query: (store: Store) => Promise<T>, deps: unknown[] = []): T | undefined {
  const store = useStore()
  const queryRef = useRef(query)
  queryRef.current = query
  const [result, setResult] = useState<{ store: Store; value: T } | undefined>(undefined)

  useEffect(() => {
    let alive = true
    let latest = 0
    const run = () => {
      const id = ++latest
      queryRef.current(store).then(
        (value) => { if (alive && id === latest) setResult({ store, value }) },
        (err) => { if (alive && id === latest) console.error(err) },
      )
    }
    run()
    const unsubscribe = store.subscribe(run)
    return () => { alive = false; unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])

  return result && result.store === store ? result.value : undefined
}
