import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Lesson = { slug: string; track: string }
type Exercise = { slug: string; lessons: string[] }
const lessons = JSON.parse(readFileSync('.velite/lessons.json', 'utf8')) as Lesson[]
const exercises = JSON.parse(readFileSync('.velite/exercises.json', 'utf8')) as Exercise[]
const trackOf = new Map(lessons.map((l) => [l.slug, l.track]))

/** A backup in which every exercise whose primary lesson is in `track` was solved alone. */
function backupSolving(track: string): string {
  const at = '2026-10-20T09:00:00.000Z'
  const progress = exercises
    .filter((e) => trackOf.get(e.lessons[0]) === track)
    .map((e) => ({ slug: e.slug, status: 'solved', solveRating: 'alone', firstSolvedAt: at, needsResolve: false, updatedAt: at }))
  return JSON.stringify({
    app: 'leethub',
    schemaVersion: 1,
    exportedAt: at,
    data: {
      progress, notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
      meta: { schemaVersion: 1, settings: { desiredRetention: 0.9, theme: 'system' } },
    },
  })
}

test('another track’s exercises are related practice and do not hold a lesson back', async ({ page }) => {
  await page.goto('/system-design/caching/')
  const related = page.locator('#related-practice')
  await expect(related.getByRole('heading', { name: 'Related practice' })).toBeVisible()
  await expect(related.getByRole('link', { name: 'LRU Cache', exact: true })).toBeVisible()
  await expect(page.locator('#practice-ladder').getByRole('link', { name: 'LRU Cache', exact: true })).toHaveCount(0)
})

test('a finished track says so on its home and on Today, without pointing at other tracks', async ({ page }) => {
  await page.goto('/settings/')
  await page.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupSolving('system-design')) })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Replace all data' }).click()
  await expect(page.getByText('Backup restored')).toBeVisible()

  await page.goto('/system-design/')
  await expect(page.getByRole('status').filter({ hasText: 'Track complete' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Continue/ })).toHaveCount(0)

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Tracks finished' })).toContainText('System Design')
  await expect(page.getByRole('region', { name: 'Continue' })).toHaveCount(0)
  await expect(page.getByText('You’ve solved every exercise here. Keep reviewing!')).toBeVisible()
})

test('a lesson links its helpful background in another track', async ({ page }) => {
  await page.goto('/algorithms/arrays-hashing/')
  const background = page.getByText('Helpful background:')
  await expect(background.getByRole('link', { name: 'Complexity' })).toHaveAttribute('href', '/cs-fundamentals/complexity/')
})

test('Algorithms can be finished without ever using the trainer', async ({ page }) => {
  await page.goto('/settings/')
  await page.getByLabel('Import backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupSolving('algorithms')) })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Replace all data' }).click()
  await expect(page.getByText('Backup restored')).toBeVisible()

  await page.goto('/algorithms/')
  await expect(page.getByRole('status').filter({ hasText: 'Track complete' })).toBeVisible()
})
