import { expect, test } from '@playwright/test'

test('a quick training round records attempts and shows up in stats', async ({ page }) => {
  await page.goto('/train/')
  await page.getByRole('button', { name: 'Quick round (5)' }).click()
  for (let i = 0; i < 5; i++) {
    await page.getByRole('group', { name: 'Pattern options' }).getByRole('button').first().click()
    await page.getByRole('button', { name: i === 4 ? 'See results' : 'Next question' }).click()
  }
  await expect(page.getByRole('heading', { name: /You got \d of 5/ })).toBeVisible()

  await page.goto('/stats/')
  await expect(page.getByRole('heading', { name: 'Recognition accuracy' })).toBeVisible()
  await expect(page.getByTestId('recognition-row').first()).toBeVisible()
})

test('Today "Start a quick round" jumps straight into question 1 of 5', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Start a quick round' }).click()
  await expect(page.getByText('Question 1 / 5')).toBeVisible()
})
