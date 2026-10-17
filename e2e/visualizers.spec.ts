import { expect, test } from '@playwright/test'

const PAGES = [
  { path: '/algorithms/heap/', final: 'Done: popped 1, 3 — heap is [4, 5, 8]' },
  { path: '/algorithms/dp-2d/', final: 'LCS length = 3' },
  { path: '/algorithms/dp-1d/', final: 'Best total = 12' },
  { path: '/algorithms/backtracking/', final: 'All 8 subsets found' },
  { path: '/system-design/dns-cdn/', final: 'Done: the first lookup took 75 ms, the cached one 5 ms' },
  { path: '/system-design/caching/', final: 'Done: 1 hit, 7 misses, 4 evictions' },
  { path: '/system-design/load-balancing/', final: 'Done: peak load 2 with round-robin vs 1 with least-connections' },
  { path: '/system-design/replication-sharding/', final: 'Done: adding D moved 1 of 5 keys; with hash mod N, going from 3 to 4 servers would move about 3 in 4 keys' },
  { path: '/system-design/news-feed/', final: 'Done: push made 8 feed writes and 1 read; hybrid made 3 writes and 2 reads — with millions of followers, skipping the celebrity\'s fan-out saves the most' },
  { path: '/system-design/rate-limiting/', final: 'Done: 9 requests allowed, 4 rejected — bursts drained the bucket, steady traffic refilled it' },
  { path: '/system-design/consensus-raft/', final: 'Done: S2 won term 2 with a majority, and x=1 committed on 2 of 3 nodes while S3 was down' },
  { path: '/system-design/distributed-transactions/', final: 'Done: 2PC kept both databases in agreement, but a coordinator crash left them blocked, holding locks, until it recovered' },
]
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 900 },
]

for (const { path, final } of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${path} visualizer steps to the end at ${vp.width}px`, async ({ page }) => {
      const errors: Error[] = []
      page.on('pageerror', (e) => errors.push(e))
      await page.setViewportSize(vp)
      await page.goto(path)
      const next = page.getByRole('button', { name: 'Next step' })
      await expect(next).toBeVisible()
      await expect(page.getByText(/Step 1 \/ \d+/)).toBeVisible()
      const fig = page.locator('figure').first()
      const heights = new Set<number>()
      const measure = async () => heights.add(Math.round((await fig.boundingBox())!.height))
      await measure()
      while (await next.isEnabled()) {
        await next.click()
        await measure()
      }
      expect([...heights]).toHaveLength(1)
      await expect(page.locator('figure [aria-live="polite"]')).toHaveText(final)
      const m = (await page.getByText(/Step \d+ \/ \d+/).textContent())!.match(/Step (\d+) \/ (\d+)/)!
      expect(m[1]).toBe(m[2])
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      expect(errors.map((e) => e.message)).toEqual([])
    })
  }
}

test('existing two-pointers visualizer still steps to its end', async ({ page }) => {
  await page.goto('/algorithms/two-pointers/')
  const next = page.getByRole('button', { name: 'Next step' })
  await expect(next).toBeVisible()
  while (await next.isEnabled()) await next.click()
  await expect(page.locator('figure [aria-live="polite"]')).toHaveText('4 + 6 = 10 — found it!')
  await expect(page.getByText(/Step 5 \/ 5/)).toBeVisible()
})
