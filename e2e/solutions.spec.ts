import { expect, test, type Page } from '@playwright/test'

const HOOK = "Don't search for the partner. Let the partner find you."

async function markSolved(page: Page, slug: string, insight: string) {
  await page.goto(`/exercises/${slug}/`)
  await page.getByRole('button', { name: 'Mark solved' }).click()
  await page.getByRole('radio', { name: 'Solved it alone' }).click()
  await page.getByLabel('Key insight').fill(insight)
  await page.getByRole('button', { name: 'Save solve' }).click()
  await expect(page.getByText('Next review:')).toBeVisible()
}

test('a solution opens one step at a time', async ({ page }) => {
  await page.goto('/exercises/two-sum/')
  const solution = page.getByRole('region', { name: 'Solution' })
  const headings = solution.getByRole('heading')
  await expect(solution.getByRole('button')).toHaveText(['Show hint'])
  await expect(headings).toHaveCount(0)

  const order: [string, string, string | null][] = [
    ['Show hint', 'Hint', 'Show intuition'],
    ['Show intuition', 'Intuition', 'Show brute force'],
    ['Show brute force', 'Brute force', 'Show optimal'],
    ['Show optimal', 'Optimal', null],
  ]
  const seen: string[] = []
  for (const [button, heading, next] of order) {
    await expect(page.getByRole('button', { name: 'Show optimal' })).toHaveCount(button === 'Show optimal' ? 1 : 0)
    await expect(page.getByText(HOOK)).toHaveCount(0)
    await solution.getByRole('button', { name: button }).click()
    seen.push(heading)
    await expect(headings).toHaveText(seen)
    await expect(solution.getByRole('heading', { name: heading, exact: true })).toBeFocused()
    if (next) await expect(solution.getByRole('button')).toHaveText([next])
  }
  await expect(solution.getByRole('button')).toHaveCount(0)
  await expect(page.getByText(`Remember it: ${HOOK}`)).toBeVisible()
  await expect(page.getByText('Pattern: Arrays & Hashing')).toBeVisible()
})

test('keyboard focus follows each opened step, never falling to the page', async ({ page }) => {
  await page.goto('/exercises/3sum/')
  const button = page.getByRole('region', { name: 'Solution' }).getByRole('button', { name: 'Show hint' })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Hint' })).toBeFocused()
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('H2')
})

test('a page with a Better section offers it between brute force and optimal', async ({ page }) => {
  await page.goto('/exercises/contains-duplicate/')
  const solution = page.getByRole('region', { name: 'Solution' })
  for (const step of ['hint', 'intuition', 'brute force']) await solution.getByRole('button', { name: `Show ${step}` }).click()
  await solution.getByRole('button', { name: 'Show better approach' }).click()
  await expect(solution.getByRole('heading')).toHaveText(['Hint', 'Intuition', 'Brute force', 'Better'])
  await expect(solution.getByRole('button')).toHaveText(['Show optimal'])
})

test('Mark solved defaults to how far the learner looked', async ({ page }) => {
  await page.goto('/exercises/two-sum/')
  const solution = page.getByRole('region', { name: 'Solution' })
  await page.getByRole('button', { name: 'Mark solved' }).click()
  await expect(page.getByRole('radio', { name: 'Solved it alone' })).toBeChecked()
  await page.keyboard.press('Escape')

  await solution.getByRole('button', { name: 'Show hint' }).click()
  await page.getByRole('button', { name: 'Mark solved' }).click()
  await expect(page.getByRole('radio', { name: 'Needed a hint' })).toBeChecked()
  await page.keyboard.press('Escape')

  await solution.getByRole('button', { name: 'Show intuition' }).click()
  await solution.getByRole('button', { name: 'Show brute force' }).click()
  await page.getByRole('button', { name: 'Mark solved' }).click()
  await expect(page.getByRole('radio', { name: 'Looked at the solution' })).toBeChecked()
  await page.getByRole('radio', { name: 'Solved it alone' }).click()
  await expect(page.getByRole('radio', { name: 'Solved it alone' })).toBeChecked()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Mark solved' }).click()
  await expect(page.getByRole('radio', { name: 'Looked at the solution' })).toBeChecked()
})

test('a problem without a solution file only has the hint', async ({ page }) => {
  await page.goto('/exercises/3sum/')
  const solution = page.getByRole('region', { name: 'Solution' })
  await solution.getByRole('button', { name: 'Show hint' }).click()
  await expect(solution.getByRole('heading', { name: 'Hint' })).toBeFocused()
  await expect(page.getByText('Sort, fix one number, then two-pointer the rest; skip duplicates.')).toBeVisible()
  await expect(solution.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show intuition' })).toHaveCount(0)
})

test('the review card shows the hook after Reveal, only when there is one', async ({ browser }) => {
  const context = await browser.newContext()
  const day1 = await context.newPage()
  await day1.clock.install({ time: new Date('2026-10-03T09:00:00') })
  await markSolved(day1, 'two-sum', 'Store value → index; look up target − x first.')
  await markSolved(day1, '3sum', 'Sort, fix one, two-pointer the rest.')
  await day1.close()

  const later = await context.newPage()
  await later.clock.install({ time: new Date('2026-10-20T09:00:00') })
  await later.goto('/')
  const card = (title: string) => later.locator('article').filter({ has: later.getByRole('heading', { name: title, exact: true }) })
  await expect(card('Two Sum')).toBeVisible()
  await expect(card('3Sum')).toBeVisible()
  await expect(later.getByText('Remember it:')).toHaveCount(0)

  await card('Two Sum').getByRole('button', { name: 'Reveal' }).click()
  await expect(card('Two Sum').getByText(`Remember it: ${HOOK}`)).toBeVisible()
  await card('3Sum').getByRole('button', { name: 'Reveal' }).click()
  await expect(card('3Sum').getByRole('button', { name: 'Good', exact: true })).toBeVisible()
  await expect(card('3Sum').getByText('Remember it:')).toHaveCount(0)
  await context.close()
})
