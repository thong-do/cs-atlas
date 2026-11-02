import { expect, test } from '@playwright/test'

const at = '2026-10-20T09:00:00.000Z'

function backup(progress: object[], settings: object = {}): string {
  return JSON.stringify({
    app: 'leethub',
    schemaVersion: 1,
    exportedAt: at,
    data: {
      progress, notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
      meta: { schemaVersion: 1, settings: { desiredRetention: 0.9, theme: 'system', ...settings } },
    },
  })
}

/** A backup with exactly one solved exercise and no placements. */
const backupWithOneSolve = () =>
  backup([{ slug: 'two-sum', status: 'solved', solveRating: 'alone', firstSolvedAt: at, needsResolve: false, updatedAt: at }])

/** A backup with no progress at all, only a placement that passed Algorithms Foundations. */
const backupWithPlacementOnly = () =>
  backup([], { placements: { algorithms: { passedModules: ['foundations'], takenAt: at } } })

async function importBackup(page: import('@playwright/test').Page, json: string) {
  await page.goto('/settings/')
  await page.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Replace all data' }).click()
  await expect(page.getByText('Backup restored')).toBeVisible()
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
  await importBackup(page, backupWithOneSolve())

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Continue' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'New to algorithms?' })).toHaveCount(0)
})

test('a placement alone, with nothing solved, also hides the Big-O card', async ({ page }) => {
  await importBackup(page, backupWithPlacementOnly())

  await page.goto('/')
  // Continue skips the placed-out Foundations, which proves the placement has loaded.
  await expect(page.getByRole('region', { name: 'Continue' })).toContainText('Trees')
  await expect(page.getByText('Solved', { exact: true })).toBeVisible()
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
