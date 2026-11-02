import { expect, test } from '@playwright/test'

/** A backup with exactly one solved exercise and no placements. */
function backupWithOneSolve(): string {
  const at = '2026-10-20T09:00:00.000Z'
  return JSON.stringify({
    app: 'leethub',
    schemaVersion: 1,
    exportedAt: at,
    data: {
      progress: [{ slug: 'two-sum', status: 'solved', solveRating: 'alone', firstSolvedAt: at, needsResolve: false, updatedAt: at }],
      notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
      meta: { schemaVersion: 1, settings: { desiredRetention: 0.9, theme: 'system' } },
    },
  })
}

test('a fresh guest is pointed to Complexity & Big-O on Today, above Continue', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('region', { name: 'New to algorithms?' })
  await expect(card.getByRole('heading', { name: 'New to algorithms?' })).toBeVisible()
  await expect(card).toContainText('Start with Complexity & Big-O')
  await expect(card.getByRole('link', { name: /Complexity & Big-O/ })).toHaveAttribute('href', '/cs-fundamentals/complexity/')
  const continueCard = page.getByRole('region', { name: 'Continue' })
  await expect(continueCard).toBeVisible()
  const [cardBox, continueBox] = [await card.boundingBox(), await continueCard.boundingBox()]
  expect(cardBox!.y).toBeLessThan(continueBox!.y)
})

test('the Big-O card is gone once one exercise is solved', async ({ page }) => {
  await page.goto('/settings/')
  await page.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupWithOneSolve()) })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Replace all data' }).click()
  await expect(page.getByText('Backup restored')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Continue' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'New to algorithms?' })).toHaveCount(0)
})

test('the Algorithms home points to Complexity & Big-O, and other tracks do not', async ({ page }) => {
  await page.goto('/algorithms/')
  const line = page.getByText(/New to Big-O\?/)
  await expect(line).toBeVisible()
  await expect(line.getByRole('link', { name: /Complexity & Big-O/ })).toHaveAttribute('href', '/cs-fundamentals/complexity/')

  for (const slug of ['system-design', 'cs-fundamentals']) {
    await page.goto(`/${slug}/`)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByText(/New to Big-O\?/)).toHaveCount(0)
  }
})
