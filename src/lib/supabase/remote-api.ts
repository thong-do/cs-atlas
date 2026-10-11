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

const ORDER_BY: Record<(typeof TABLES)[number], string> = {
  profiles: 'user_id', progress: 'slug', notes: 'slug', cards: 'slug', review_logs: 'id', train_attempts: 'id', activity: 'date',
}
export const PAGE = 1000

/** Minimal shape of the supabase-js query builder used for paging. */
export interface PagedClient {
  from(table: string): {
    select(cols: string): {
      order(col: string): {
        range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
      }
    }
  }
}

/** Fetch every row of a table, one PostgREST page (max_rows) at a time. */
export async function fetchAllRows(client: PagedClient, table: string, orderBy: string): Promise<unknown[]> {
  const all: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select('*').order(orderBy).range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    all.push(...page)
    if (page.length < PAGE) return all
  }
}

export function createRemoteApi(client: SupabaseClient, userId: string): RemoteApi {
  const check = (error: { message: string } | null) => { if (error) throw new Error(error.message) }
  return {
    userId,
    async loadAll() {
      const results = await Promise.all(TABLES.map((t) => fetchAllRows(client as unknown as PagedClient, t, ORDER_BY[t])))
      const rows = {} as Record<(typeof TABLES)[number], unknown[]>
      TABLES.forEach((t, i) => { rows[t] = results[i] })
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
