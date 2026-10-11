import { describe, expect, it } from 'vitest'
import { LOADING_STORE_STATE, planStore } from './store-plan'

describe('planStore', () => {
  it('waits while auth is loading', () => {
    expect(planStore('loading', undefined, true)).toBe('wait')
    expect(planStore('loading', 'u1', true)).toBe('wait')
  })
  it('uses the guest store when auth is disabled or signed out', () => {
    expect(planStore('disabled', undefined, false)).toBe('guest')
    expect(planStore('signed-out', undefined, true)).toBe('guest')
  })
  it('uses the guest store when signed in without a client or user id', () => {
    expect(planStore('signed-in', 'u1', false)).toBe('guest')
    expect(planStore('signed-in', undefined, true)).toBe('guest')
  })
  it('uses the account when signed in with a client', () => {
    expect(planStore('signed-in', 'u1', true)).toBe('account')
  })
})

describe('LOADING_STORE_STATE', () => {
  it('is not ready, so pages show their loading state during a store switch', () => {
    expect(LOADING_STORE_STATE.ready).toBe(false)
    expect(LOADING_STORE_STATE.available).toBe(false)
    expect(LOADING_STORE_STATE.mode).toBe('guest')
  })
  it('serves an empty store, never the previous one', async () => {
    expect(await LOADING_STORE_STATE.store.hasData()).toBe(false)
  })
})
