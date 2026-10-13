import { expect, test } from '@playwright/test'

test('privacy page explains storage, region and controls', async ({ page }) => {
  await page.goto('/privacy/')
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible()
  await expect(page.getByText('Singapore (ap-southeast-1)')).toBeVisible()
  await expect(page.getByRole('link', { name: 'thongdo.swe@gmail.com' })).toHaveAttribute('href', 'mailto:thongdo.swe@gmail.com')
  await expect(page.getByRole('link', { name: 'Settings' }).last()).toBeVisible()
})
