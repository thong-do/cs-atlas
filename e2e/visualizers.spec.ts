import { expect, test } from '@playwright/test'

const PAGES = [
  { slug: 'heap', final: 'Done: popped 1, 3 — heap is [4, 5, 8]' },
  { slug: 'dp-2d', final: 'LCS length = 3' },
  { slug: 'dp-1d', final: 'Best total = 12' },
  { slug: 'backtracking', final: 'All 8 subsets found' },
]
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 1280, height: 900 },
]

for (const { slug, final } of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${slug} visualizer steps to the end at ${vp.width}px`, async ({ page }) => {
      const errors: Error[] = []
      page.on('pageerror', (e) => errors.push(e))
      await page.setViewportSize(vp)
      await page.goto(`/patterns/${slug}/`)
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
      if (slug === 'heap') expect([...heights]).toHaveLength(1)
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
  await page.goto('/patterns/two-pointers/')
  const next = page.getByRole('button', { name: 'Next step' })
  await expect(next).toBeVisible()
  while (await next.isEnabled()) await next.click()
  await expect(page.locator('figure [aria-live="polite"]')).toHaveText('4 + 6 = 10 — found it!')
  await expect(page.getByText(/Step 5 \/ 5/)).toBeVisible()
})
