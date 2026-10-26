import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Step = { id: string; ask: string; unit: string; answer: number; work: string }
type Drill = { slug: string; type: string; steps: Step[] }
const drill = (JSON.parse(readFileSync('.velite/exercises.json', 'utf8')) as Drill[])
  .find((e) => e.slug === 'estimate-photo-storage')!
// The picker's smallest prefix has scale 1 for every unit except seconds (ms), so typing the base value with that prefix is exact.
const BASE_LABEL: Record<string, string> = { bytes: 'B', 'bytes/s': 'B/s', 'bits/s': 'bit/s', 'requests/s': '/s', count: '×1' }

test('an estimation drill grades each step and records the attempt', async ({ page }) => {
  await page.goto('/exercises/estimate-photo-storage/')
  await expect(page.getByRole('heading', { level: 1, name: /Estimate: / })).toBeVisible()

  for (const [i, st] of drill.steps.entries()) {
    const section = page.getByRole('region', { name: `${i + 1}. ${st.ask}` })
    // Step 1 right; every later step 100× too big, far outside any tolerance.
    await section.getByLabel('Your estimate').fill(String(i === 0 ? st.answer : st.answer * 100))
    // No unit is preselected, so a typed number alone cannot be checked.
    await expect(section.getByRole('button', { name: 'Check' })).toBeDisabled()
    await section.getByLabel('Unit').selectOption({ label: BASE_LABEL[st.unit] })
    await section.getByRole('button', { name: 'Check' }).click()
    await expect(section.getByText(i === 0 ? '✓ Within range' : '✗ Outside range')).toBeVisible()
    await expect(section.getByText(st.work)).toBeVisible()
  }

  await expect(page.getByRole('status').filter({ hasText: 'right' })).toHaveText(`1 of ${drill.steps.length} right`)
  await expect(page.getByText('Saved to your progress')).toBeVisible()

  await page.getByRole('button', { name: 'Try again' }).click()
  const first = page.getByRole('region', { name: `1. ${drill.steps[0].ask}` }).getByLabel('Your estimate')
  await expect(first).toHaveValue('')
  await expect(first).toBeFocused()
})

test('Check stays disabled for input that is not an amount, and explains zero', async ({ page }) => {
  await page.goto('/exercises/estimate-photo-storage/')
  const section = page.getByRole('region', { name: `1. ${drill.steps[0].ask}` })
  const check = section.getByRole('button', { name: 'Check' })
  await expect(check).toBeDisabled()
  await section.getByLabel('Your estimate').fill('7,5')
  await expect(check).toBeDisabled()
  await expect(section.getByText('Enter a number like 7.5, 7,500 or 1e4.')).toBeVisible()
  await section.getByLabel('Your estimate').fill('0')
  await expect(check).toBeDisabled()
  await expect(section.getByText('Enter an amount above zero.')).toBeVisible()
  await section.getByLabel('Your estimate').fill('7,500')
  await expect(check).toBeDisabled() // still no unit chosen
  await section.getByLabel('Unit').selectOption({ label: BASE_LABEL[drill.steps[0].unit] })
  await expect(check).toBeEnabled()
})
