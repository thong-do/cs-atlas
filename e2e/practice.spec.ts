import { expect, test } from '@playwright/test'

const CORRECT = [
  'About 1.95 ms',
  'The key that was used least recently',
  'Update the database, then delete the cached key',
  'Add random jitter to TTLs and let one request refill while others wait',
  'Write-back',
]

test('taking the Caching quiz shows results, explanations and flashcards', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.goto('/exercises/caching-quiz/')
  await expect(page.getByRole('heading', { level: 1, name: 'Caching — quiz' })).toBeVisible()
  const check = page.getByRole('button', { name: 'Check answers' })
  await expect(check).toBeDisabled()
  expect(await page.locator('fieldset').count()).toBe(CORRECT.length)
  for (const text of CORRECT) await page.getByLabel(text, { exact: true }).check()
  await check.click()
  await expect(page.getByText('5 of 5 correct')).toBeVisible()
  await expect(page.getByText('0.95 × 1 ms + 0.05 × 20 ms')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Flashcards — in your reviews' })).toBeVisible()
  const card = page.getByRole('button', { name: /TTL \(time to live\)/ })
  await card.click()
  await expect(page.getByText('How long a cached entry stays valid')).toBeVisible()
  await page.getByRole('button', { name: 'Retake' }).click()
  await expect(check).toBeDisabled()
  expect(errors.map((e) => e.message)).toEqual([])
})

test('completing the design prompt saves the design as a note', async ({ page }) => {
  await page.goto('/exercises/design-product-page-cache/')
  await expect(page.getByRole('heading', { level: 1, name: 'Design: cache a product-details API' })).toBeVisible()
  await page.getByLabel('Your design').fill('Cache-aside in Redis keyed by product id; TTL 50s with jitter; delete on write.')
  await page.getByLabel('Key insight').fill('Delete on write, TTL as the staleness backstop')
  await page.getByRole('button', { name: 'Compare with reference' }).click()
  await expect(page.getByText('request coalescing')).toBeVisible()
  const boxes = page.getByRole('checkbox')
  await expect(boxes).toHaveCount(5)
  for (let i = 0; i < 4; i++) await boxes.nth(i).check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved — 4 of 5 rubric points')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Approach' })).toBeVisible()
  await expect(page.getByText(/Cache-aside in Redis keyed by product id/)).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Reference answer' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rubric' })).toBeVisible()
  await expect(page.getByText(/Protects hot keys from a stampede/)).toBeVisible()
})

test('the Caching ladder and the Exercises list show type badges and filter by type', async ({ page }) => {
  await page.goto('/system-design/caching/')
  const ladder = page.locator('#practice-ladder')
  await expect(ladder.getByText('Quiz', { exact: true })).toBeVisible()
  await expect(ladder.getByText('Design', { exact: true })).toBeVisible()
  await page.goto('/exercises/?type=quiz')
  await expect(page.getByLabel('Type')).toHaveValue('quiz')
  await expect(page.getByText('1 of 140 exercises')).toBeVisible()
})
