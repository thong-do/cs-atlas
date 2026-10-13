'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/context'
import { getSupabase } from '@/lib/supabase/client'
import { createRemoteApi } from '@/lib/supabase/remote-api'
import { LeetHubDB } from './db'
import { DexieStore } from './dexie-store'
import { ACCOUNT_UNREACHABLE_MESSAGE, MOVE_FAILED_MESSAGE, moveGuestData } from './first-sync'
import { NullStore } from './null-store'
import { LOADING_STORE_STATE, planStore, type StoreMode, type StoreState } from './store-plan'
import { SupabaseStore } from './supabase-store'
import type { Store } from './types'

const StoreContext = createContext<StoreState>(LOADING_STORE_STATE)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const userId = user?.id
  const [state, setState] = useState<StoreState>(LOADING_STORE_STATE)

  useEffect(() => {
    // Never serve the previous store (closed guest db / disposed account store) while the next one loads.
    setState(LOADING_STORE_STATE)
    const client = getSupabase()
    const plan = planStore(status, userId, !!client)
    if (plan === 'wait') return
    let cancelled = false
    let dispose: (() => void) | undefined
    const db = new LeetHubDB()
    const startGuest = () =>
      db.open()
        .then(() => { if (!cancelled) setState({ store: new DexieStore(db), ready: true, available: true, mode: 'guest' }) })
        .catch(() => { if (!cancelled) setState({ store: new NullStore(), ready: true, available: false, mode: 'guest' }) })

    if (plan === 'guest' || !client || !userId) {
      void startGuest()
    } else {
      const remote = createRemoteApi(client, userId)
      db.open()
        .then(() => moveGuestData(new DexieStore(db), remote))
        .catch(async (err) => {
          if (err instanceof Error && (err.message === MOVE_FAILED_MESSAGE || err.message === ACCOUNT_UNREACHABLE_MESSAGE)) throw err
          // IndexedDB unavailable: nothing local to move, start from the account.
          if (cancelled) return null
          try {
            return { data: await remote.loadAll(), moved: 0 }
          } catch {
            throw new Error(ACCOUNT_UNREACHABLE_MESSAGE)
          }
        })
        .then((res) => {
          if (cancelled || !res) return
          const { data, moved } = res
          const store = new SupabaseStore(remote, data)
          dispose = () => store.dispose()
          setState({ store, ready: true, available: true, mode: 'account' })
          if (moved > 0) toast.success(`Moved ${moved} exercise${moved === 1 ? '' : 's'} from this device to your account`)
        })
        .catch((err) => {
          if (cancelled) return
          toast.error(err instanceof Error ? err.message : String(err))
          void startGuest()
        })
    }
    return () => {
      cancelled = true
      dispose?.()
      db.close()
    }
  }, [status, userId])

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  return useContext(StoreContext).store
}

export function useStoreStatus(): { ready: boolean; available: boolean; mode: StoreMode } {
  const { ready, available, mode } = useContext(StoreContext)
  return { ready, available, mode }
}

/** Runs `query` against the current store and re-runs it whenever the store reports a change (or the store/deps change). */
export function useLive<T>(query: (store: Store) => Promise<T>, deps: unknown[] = []): T | undefined {
  const store = useStore()
  const queryRef = useRef(query)
  queryRef.current = query
  // Bumped during render whenever the store or deps change, so a stale result is never returned for new inputs.
  const genRef = useRef(0)
  const inputsRef = useRef<unknown[] | undefined>(undefined)
  const inputs = [store, ...deps]
  const prev = inputsRef.current
  if (!prev || prev.length !== inputs.length || inputs.some((v, i) => !Object.is(v, prev[i]))) {
    inputsRef.current = inputs
    genRef.current++
  }
  const [result, setResult] = useState<{ gen: number; value: T } | undefined>(undefined)

  useEffect(() => {
    const gen = genRef.current
    let alive = true
    let latest = 0
    const run = () => {
      const id = ++latest
      queryRef.current(store).then(
        (value) => { if (alive && id === latest) setResult({ gen, value }) },
        (err) => { if (alive && id === latest) console.error(err) },
      )
    }
    run()
    const unsubscribe = store.subscribe(run)
    return () => { alive = false; unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])

  return result && result.gen === genRef.current ? result.value : undefined
}
