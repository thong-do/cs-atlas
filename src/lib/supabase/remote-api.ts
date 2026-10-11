import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserData } from '@/lib/types'
import { fromRows, toApplyPayload, toReplacePayload, type Changes, type RemoteRows } from './rows'

export interface RemoteApi {
  userId: string
  loadAll(): Promise<UserData>
  applyChanges(changes: Changes): Promise<void>
  replaceAll(data: UserData): Promise<void>
  deleteAccount(): Promise<void>
  onRemoteChange(cb: () => void): () => void
}

const TABLES = ['profiles', 'progress', 'notes', 'cards', 'review_logs', 'train_attempts', 'activity'] as const

export function createRemoteApi(client: SupabaseClient, userId: string): RemoteApi {
  const check = (error: { message: string } | null) => { if (error) throw new Error(error.message) }
  return {
    userId,
    async loadAll() {
      const results = await Promise.all(TABLES.map((t) => client.from(t).select('*')))
      const rows = {} as Record<(typeof TABLES)[number], unknown[]>
      TABLES.forEach((t, i) => {
        check(results[i].error)
        rows[t] = results[i].data ?? []
      })
      return fromRows(rows as unknown as RemoteRows)
    },
    async applyChanges(changes) {
      check((await client.rpc('apply_changes', { payload: toApplyPayload(changes) })).error)
    },
    async replaceAll(data) {
      check((await client.rpc('replace_all', { payload: toReplacePayload(data) })).error)
    },
    async deleteAccount() {
      check((await client.rpc('delete_my_account')).error)
    },
    onRemoteChange(cb) {
      const channel = client.channel(`user-${userId}`)
      for (const table of TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => cb())
      }
      channel.subscribe()
      return () => { void client.removeChannel(channel) }
    },
  }
}
