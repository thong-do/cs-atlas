import { describe, expect, it } from 'vitest'
import { fetchAllRows, type PagedClient } from './remote-api'

function fakeClient(total: number, failAtFrom?: number): { client: PagedClient; calls: number[]; orders: string[] } {
  const calls: number[] = []
  const orders: string[] = []
  const client: PagedClient = {
    from: () => ({
      select: () => ({
        order: (col) => {
          orders.push(col)
          return {
            range: async (from, to) => {
              calls.push(from)
              if (from === failAtFrom) return { data: null, error: { message: 'page failed' } }
              const data = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => ({ n: from + i }))
              return { data, error: null }
            },
          }
        },
      }),
    }),
  }
  return { client, calls, orders }
}

describe('fetchAllRows', () => {
  it('returns all rows across pages in order', async () => {
    const { client, calls, orders } = fakeClient(2345)
    const rows = (await fetchAllRows(client, 'review_logs', 'id')) as { n: number }[]
    expect(rows).toHaveLength(2345)
    expect(rows.every((r, i) => r.n === i)).toBe(true)
    expect(calls).toEqual([0, 1000, 2000])
    expect(orders[0]).toBe('id')
  })

  it('stops after an empty page when the total is an exact multiple', async () => {
    const { client, calls } = fakeClient(2000)
    expect(await fetchAllRows(client, 't', 'id')).toHaveLength(2000)
    expect(calls).toEqual([0, 1000, 2000])
  })

  it('rejects when a page errors', async () => {
    const { client } = fakeClient(2345, 1000)
    await expect(fetchAllRows(client, 't', 'id')).rejects.toThrow('page failed')
  })
})
