import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

const PAGES = ['/', '/roadmap/', '/exercises/', '/algorithms/two-pointers/', '/train/', '/stats/', '/settings/', '/tracks/', '/algorithms/', '/system-design/', '/system-design/client-server-http/', '/exercises/client-server-http-quiz/', '/system-design/dns-cdn/', '/exercises/dns-cdn-quiz/', '/exercises/design-global-static-site/', '/system-design/caching/', '/exercises/caching-quiz/', '/exercises/design-product-page-cache/', '/system-design/sql-vs-nosql/', '/exercises/sql-vs-nosql-quiz/', '/exercises/design-orders-and-activity-storage/', '/system-design/load-balancing/', '/exercises/load-balancing-quiz/', '/exercises/design-checkout-load-balancing/', '/system-design/replication-sharding/', '/exercises/replication-sharding-quiz/', '/exercises/design-message-store-sharding/', '/system-design/queues-streams/', '/exercises/queues-streams-quiz/', '/exercises/design-order-email-pipeline/', '/system-design/rate-limiting/', '/exercises/rate-limiting-quiz/', '/exercises/design-api-rate-limiter/', '/system-design/consistency-models/', '/exercises/consistency-models-quiz/', '/exercises/design-collaborative-cart/', '/system-design/url-shortener/', '/exercises/url-shortener-quiz/', '/exercises/design-pastebin/', '/system-design/news-feed/', '/exercises/news-feed-quiz/', '/exercises/design-notification-inbox/', '/system-design/chat/', '/exercises/chat-quiz/', '/exercises/design-live-comments/', '/auth/callback/', '/privacy/']

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
