import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Q = { module: string; choices: string[]; answer: number }
const csf = (JSON.parse(readFileSync('.velite/placements.json', 'utf8')) as { track: string; questions: Q[] }[])
  .find((p) => p.track === 'cs-fundamentals')!

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

test('tracks without a placement quiz show no placement card', async ({ page }) => {
  await page.goto('/algorithms/')
  await expect(page.getByRole('heading', { level: 1, name: 'Algorithms' })).toBeVisible()
  await expect(page.getByText('placement quiz')).toHaveCount(0)
})
