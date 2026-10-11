import type { AuthStatus } from '@/lib/auth/auth-state'
import { NullStore } from './null-store'
import type { Store } from './types'

export type StoreMode = 'guest' | 'account'

export interface StoreState {
  store: Store
  ready: boolean
  available: boolean
  /** 'account' only while the SupabaseStore is active; the guest store, NullStore and the signed-in fallback are 'guest'. */
  mode: StoreMode
}

/**
 * Served while a store is being opened or switched. StoreProvider resets to this on every auth change,
 * so a closed guest db or a disposed account store is never served while the next one loads.
 */
export const LOADING_STORE_STATE: StoreState = { store: new NullStore(), ready: false, available: false, mode: 'guest' }

/** Which store to open for the current auth state. */
export function planStore(status: AuthStatus, userId: string | undefined, hasClient: boolean): 'wait' | 'guest' | 'account' {
  if (status === 'loading') return 'wait'
  return status === 'signed-in' && userId && hasClient ? 'account' : 'guest'
}
