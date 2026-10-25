import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Q = { module: string; choices: string[]; answer: number }
const quizzes = JSON.parse(readFileSync('.velite/placements.json', 'utf8')) as { track: string; questions: Q[] }[]
const quiz = (track: string) => quizzes.find((p) => p.track === track)!.questions
const csf = { questions: quiz('cs-fundamentals') }

test('placing out of the first two modules moves Continue, and clearing restores it', async ({ page }) => {
  await page.goto('/cs-fundamentals/')
  await page.getByRole('link', { name: 'Take the 5-minute placement quiz' }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/placement\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'CS Fundamentals placement' })).toBeVisible()

  for (const [i, q] of csf.questions.entries()) {
    await expect(page.getByText(`Question ${i + 1} of ${csf.questions.length}`)).toBeVisible()
    const pass = q.module === 'foundations' || q.module === 'operating-systems'
    await page.getByRole('button', { name: q.choices[pass ? q.answer : (q.answer + 1) % 4], exact: true }).click()
  }

  await expect(page.getByRole('heading', { name: 'Your placement' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(2)
  await page.getByRole('link', { name: 'Start at The TCP/IP stack' }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/tcp-ip-stack\/$/)

  await page.goto('/cs-fundamentals/')
  await expect(page.getByText('Placed out')).toHaveCount(2)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/tcp-ip-stack\/$/)

  await page.goto('/cs-fundamentals/')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('link', { name: 'Take the 5-minute placement quiz' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(0)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/complexity\/$/)
})

for (const [slug, title] of [['algorithms', 'Algorithms'], ['system-design', 'System Design']] as const) {
  test(`${title} links to its placement quiz and announces progress`, async ({ page }) => {
    await page.goto(`/${slug}/`)
    await page.getByRole('link', { name: 'Take the 5-minute placement quiz' }).click()
    await expect(page).toHaveURL(new RegExp(`/${slug}/placement/$`))
    await expect(page.getByRole('heading', { level: 1, name: `${title} placement` })).toBeVisible()
    await expect(page.getByText(`Question 1 of ${quiz(slug).length}`)).toHaveAttribute('aria-live', 'polite')
  })
}

test('System Design never places out of Case Studies', async ({ page }) => {
  await page.goto('/system-design/placement/')
  const qs = quiz('system-design')
  for (const [i, q] of qs.entries()) {
    await expect(page.getByText(`Question ${i + 1} of ${qs.length}`)).toBeVisible()
    await page.getByRole('button', { name: q.choices[q.answer], exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Your placement' })).toBeVisible()
  await expect(page.getByText('Placed out')).toHaveCount(3)
  await expect(page.getByRole('list').getByText('Case Studies')).toHaveCount(0)
  await page.getByRole('link', { name: 'Start at URL shortener' }).click()
  await expect(page).toHaveURL(/\/system-design\/url-shortener\/$/)

  await page.goto('/system-design/')
  await expect(page.getByText('Placed out')).toHaveCount(3)
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/system-design\/url-shortener\/$/)
})

test.describe('on a 375px phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  test('the results screen with every question to revisit has no horizontal scroll', async ({ page }) => {
    await page.goto('/algorithms/placement/')
    const qs = quiz('algorithms')
    for (const [i, q] of qs.entries()) {
      await expect(page.getByText(`Question ${i + 1} of ${qs.length}`)).toBeVisible()
      await page.getByRole('button', { name: q.choices[(q.answer + 1) % 4], exact: true }).click()
    }
    await expect(page.getByRole('heading', { name: 'Questions to revisit' })).toBeVisible()
    await expect(page.getByText('Placed out')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Start at Arrays & Hashing' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
