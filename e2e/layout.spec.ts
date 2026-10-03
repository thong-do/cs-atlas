import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

const PAGES = ['/', '/roadmap/', '/problems/', '/patterns/two-pointers/', '/train/', '/stats/', '/settings/']

for (const path of PAGES) {
  test(`no horizontal page scroll at 375px: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
}
