import { expect, test } from '@playwright/test'

test('signed out: Sign in opens the provider dialog', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', /\/privacy\/$/)
  expect(errors.map((e) => e.message)).toEqual([])
})

test('Sign in is reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible()
})

test('auth callback without a code shows an error and a way home', async ({ page }) => {
  await page.goto('/auth/callback/')
  await expect(page.getByRole('heading', { name: "Couldn't sign you in" })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()
})

test('settings has no Account section when signed out', async ({ page }) => {
  await page.goto('/settings/')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account' })).toHaveCount(0)
})
