import { expect, test } from '@playwright/test'

const V1_PROGRESS = {
  slug: '3sum', status: 'solved', solveRating: 'alone', firstSolvedAt: '2026-09-01T09:00:00.000Z',
  needsResolve: false, updatedAt: '2026-09-01T09:00:00.000Z',
}
const V1_CARD = {
  slug: '3sum',
  due: '2026-09-05T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  card: {
    due: '2026-09-05T09:00:00.000Z', stability: 3, difficulty: 5, elapsed_days: 0, scheduled_days: 4,
    learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: '2026-09-01T09:00:00.000Z',
  },
}

test('v1 local progress survives the upgrade: solved and due', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T09:00:00') })
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  await page.evaluate(async ({ progress, card }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('leethub')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['progress', 'cards'], 'readwrite')
      tx.objectStore('progress').put(progress)
      tx.objectStore('cards').put(card)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, { progress: V1_PROGRESS, card: V1_CARD })

  await page.reload()
  await expect(page.getByRole('heading', { name: '3Sum', exact: true })).toBeVisible()

  await page.goto('/exercises/?q=3sum')
  await expect(page.getByRole('img', { name: 'Solved alone' }).first()).toBeVisible()
  await page.goto('/exercises/3sum/')
  await expect(page.getByText('Next review:')).toBeVisible()
})
