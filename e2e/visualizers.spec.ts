import { expect, test } from '@playwright/test'

const PAGES = [
  { slug: 'heap', final: 'Heap property restored' },
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
      while (await next.isEnabled()) await next.click()
      await expect(page.locator('figure [aria-live="polite"]')).toHaveText(final)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
      expect(errors.map((e) => e.message)).toEqual([])
    })
  }
}
