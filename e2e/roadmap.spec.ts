import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 900 } })

test('roadmap labels are inside the viewBox and do not overlap within a row', async ({ page }) => {
  await page.goto('/roadmap/')
  const svg = page.locator('svg[aria-label="Roadmap"]')
  await expect(svg).toBeVisible()
  await expect(svg.locator('text').first()).toBeVisible()

  const result = await svg.evaluate((el) => {
    const s = el as SVGSVGElement
    const vb = s.viewBox.baseVal
    const boxes = [...s.querySelectorAll('text')].map((t) => {
      const b = (t as SVGTextElement).getBBox()
      const m = (t.closest('g') as SVGGElement).transform.baseVal.consolidate()!.matrix
      return { text: t.textContent ?? '', x: b.x + m.e, y: b.y + m.f, w: b.width, h: b.height, row: Math.round(m.f) }
    })
    const outside = boxes.filter((b) => b.x < vb.x || b.y < vb.y || b.x + b.w > vb.x + vb.width || b.y + b.h > vb.y + vb.height).map((b) => b.text)
    const overlaps: string[] = []
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        if (a.row !== b.row) continue
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.text} / ${b.text}`)
      }
    }
    return { outside, overlaps }
  })
  expect(result.outside).toEqual([])
  expect(result.overlaps).toEqual([])
})

test('roadmap shows all three tracks and links lessons to their pages', async ({ page }) => {
  await page.goto('/roadmap/')
  const svg = page.locator('svg[aria-label="Roadmap"]')
  await expect(svg.getByText('Algorithms', { exact: true })).toBeVisible()
  await expect(svg.getByText('System Design', { exact: true })).toBeVisible()
  await expect(svg.getByText('CS Fundamentals', { exact: true })).toBeVisible()
  await svg.getByRole('link', { name: /^Caching:/ }).click()
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
})

test('roadmap opens fitted to show every track, then zooms with the toolbar and ctrl + wheel', async ({ page }) => {
  await page.goto('/roadmap/')
  const frame = page.getByRole('region', { name: 'Roadmap, scrollable' })
  const svg = page.locator('svg[aria-label="Roadmap"]')
  const width = () => svg.evaluate((el) => el.getBoundingClientRect().width)
  const scrolls = () => frame.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  await expect(svg.getByText('CS Fundamentals', { exact: true })).toBeVisible()

  // Default is the whole tree fitted to the frame: no sideways scroll, every track's band in one view's width.
  await expect(page.getByRole('button', { name: 'Fit', exact: true })).toBeDisabled()
  expect(await scrolls()).toBe(false)
  const fit = await width()

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(width).toBeGreaterThan(fit)
  expect(await scrolls()).toBe(true)

  // 100% draws 13px labels at true size (the fitted overview draws them smaller).
  await page.getByRole('button', { name: '100%' }).click()
  await expect(page.getByRole('toolbar').getByText('100%', { exact: true }).first()).toBeVisible()
  const label = svg.getByText('Caching', { exact: true })
  await label.scrollIntoViewIfNeeded()
  expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(12)

  await page.getByRole('button', { name: 'Fit', exact: true }).click()
  await expect.poll(width).toBeCloseTo(fit, 0)
  expect(await scrolls()).toBe(false)

  // Zooming out never goes below the overview.
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled()

  await svg.scrollIntoViewIfNeeded()
  const box = (await frame.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 100)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -100)
  await page.keyboard.up('Control')
  await expect.poll(width).toBeGreaterThan(fit)
})
