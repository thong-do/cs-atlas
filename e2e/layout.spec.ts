import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

const PAGES = ['/', '/roadmap/', '/exercises/', '/algorithms/two-pointers/', '/train/', '/stats/', '/settings/', '/tracks/', '/algorithms/', '/system-design/', '/system-design/client-server-http/', '/exercises/client-server-http-quiz/', '/system-design/dns-cdn/', '/exercises/dns-cdn-quiz/', '/exercises/design-global-static-site/', '/system-design/caching/', '/exercises/caching-quiz/', '/exercises/design-product-page-cache/', '/system-design/sql-vs-nosql/', '/exercises/sql-vs-nosql-quiz/', '/exercises/design-orders-and-activity-storage/', '/system-design/load-balancing/', '/exercises/load-balancing-quiz/', '/exercises/design-checkout-load-balancing/', '/auth/callback/', '/privacy/']

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
