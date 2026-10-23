import { expect, test } from '@playwright/test'

test('tracks page lists all three tracks and links to their homes', async ({ page }) => {
  await page.goto('/tracks/')
  await expect(page.getByRole('heading', { level: 1, name: 'Tracks' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Algorithms/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /System Design/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /CS Fundamentals/ })).toBeVisible()
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

test('the CS Fundamentals home shows all five modules with every lesson linked, and Continue opens the first lesson', async ({ page }) => {
  await page.goto('/cs-fundamentals/')
  await expect(page.getByRole('heading', { level: 1, name: 'CS Fundamentals' })).toBeVisible()
  for (const name of ['Foundations', 'Operating systems', 'Networking', 'Databases', 'Machine & math']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  }
  await expect(page.getByText('Coming soon')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /The memory hierarchy/ })).toHaveAttribute('href', '/cs-fundamentals/memory-hierarchy/')
  await expect(page.getByRole('link', { name: /Number representation/ })).toHaveAttribute('href', '/cs-fundamentals/number-representation/')
  await expect(page.getByRole('link', { name: /Discrete math essentials/ })).toHaveAttribute('href', '/cs-fundamentals/discrete-math-essentials/')
  await expect(page.getByRole('link', { name: /Indexes & B-trees/ })).toHaveAttribute('href', '/cs-fundamentals/indexes-btrees/')
  await expect(page.getByRole('link', { name: /Query planning/ })).toHaveAttribute('href', '/cs-fundamentals/query-planning/')
  await expect(page.getByRole('link', { name: /HTTP\/1\.1, HTTP\/2 and HTTP\/3/ })).toHaveAttribute('href', '/cs-fundamentals/http-versions/')
  await page.getByRole('link', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/cs-fundamentals\/complexity\/$/)
})
