import { expect, test } from '@playwright/test'

test('tracks page lists both tracks and links to their homes', async ({ page }) => {
  await page.goto('/tracks/')
  await expect(page.getByRole('heading', { level: 1, name: 'Tracks' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Algorithms/ })).toBeVisible()
  await page.getByRole('link', { name: /System Design/ }).click()
  await expect(page).toHaveURL(/\/system-design\/$/)
})

test('a track home shows modules, lessons and coming-soon titles', async ({ page }) => {
  await page.goto('/system-design/')
  await expect(page.getByRole('heading', { level: 1, name: 'System Design' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Foundations' })).toBeVisible()
  await expect(page.getByText('Load balancing')).toBeVisible()
  await expect(page.getByText('Coming soon').first()).toBeVisible()
  await page.getByRole('link', { name: 'Caching', exact: true }).click()
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
  await expect(page.getByRole('link', { name: 'System Design' }).first()).toBeVisible()
})

test('Continue opens the first lesson that is not mastered', async ({ page }) => {
  await page.goto('/algorithms/')
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/algorithms\/arrays-hashing\/$/)
})

test('the palette groups lessons by track', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Jump to a lesson or exercise…').fill('caching')
  await expect(page.getByRole('group', { name: 'System Design' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
})
