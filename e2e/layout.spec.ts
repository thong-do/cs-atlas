import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

const PAGES = ['/', '/roadmap/', '/problems/', '/patterns/two-pointers/', '/train/', '/stats/', '/settings/']

for (const path of PAGES) {
  test(`no horizontal page scroll at 375px: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    // Data-driven content renders after the heading; poll until the layout has settled.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
    await page.waitForTimeout(250)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
