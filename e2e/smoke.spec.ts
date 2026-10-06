import { expect, test } from '@playwright/test'

const PLACEHOLDER = 'Jump to a lesson or exercise…'

test('Ctrl+K opens the palette and navigates without page errors', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.goto('/algorithms/two-pointers/')
  await expect(page.locator('h1').first()).toBeVisible()
  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder(PLACEHOLDER)
  await expect(input).toBeVisible()
  await input.fill('two sum ii')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/exercises\/two-sum-ii\/$/)
  expect(errors.map((e) => e.message)).toEqual([])
})

test('sidebar Search button opens the palette', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/algorithms/two-pointers/')
  await page.getByRole('button', { name: /search/i }).first().click()
  await expect(page.getByPlaceholder(PLACEHOLDER)).toBeVisible()
  expect(errors.map((e) => e.message)).toEqual([])
})

test('body font resolves to Geist', async ({ page }) => {
  await page.goto('/')
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(family.toLowerCase()).toContain('geist')
})
