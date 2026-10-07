import { expect, test } from '@playwright/test'

const INSIGHT = 'Store each value → index; look up target − x before inserting.'

test('solve → review when due → export → import into a fresh browser', async ({ browser }) => {
  const context = await browser.newContext({ acceptDownloads: true })

  // 1. Solve Two Sum on day 1.
  const day1 = await context.newPage()
  await day1.clock.install({ time: new Date('2026-10-03T09:00:00') })
  await day1.goto('/exercises/two-sum/')
  await day1.getByRole('button', { name: 'Mark solved' }).click()
  await day1.getByRole('radio', { name: 'Solved it alone' }).click()
  await day1.getByLabel('Key insight').fill(INSIGHT)
  await day1.getByRole('button', { name: 'Save solve' }).click()
  await expect(day1.getByText('Next review:')).toBeVisible()
  await expect(day1.getByText(INSIGHT)).toBeVisible()
  await day1.close()

  // 2. Weeks later it is due on Today; reveal and rate it.
  const later = await context.newPage()
  await later.clock.install({ time: new Date('2026-10-20T09:00:00') })
  await later.goto('/')
  await expect(later.getByRole('heading', { name: 'Two Sum', exact: true })).toBeVisible()
  await later.getByRole('button', { name: 'Reveal' }).click()
  await expect(later.getByText(INSIGHT)).toBeVisible()
  await later.getByRole('button', { name: 'Good', exact: true }).click()
  await expect(later.getByText('All caught up 🎉')).toBeVisible()

  // 3. Export a backup.
  await later.goto('/settings/')
  const downloadPromise = later.waitForEvent('download')
  await later.getByRole('button', { name: 'Export backup' }).click()
  const backupPath = await (await downloadPromise).path()
  expect(backupPath).toBeTruthy()

  // 4. Import into a brand-new browser profile and find the note again.
  const fresh = await browser.newContext()
  const page = await fresh.newPage()
  await page.goto('/settings/')
  await page.getByLabel('Import backup').setInputFiles(backupPath!)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Replace all data' }).click()
  await expect(page.getByText('Backup restored')).toBeVisible()
  await page.goto('/exercises/two-sum/')
  await expect(page.getByText(INSIGHT)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log a re-solve' })).toBeVisible()
  await expect(page.getByText('Next review:')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reviews' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByText('Solved (alone)')).toBeVisible()

  await context.close()
  await fresh.close()
})
