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

test('roadmap shows both tracks and the cross-track prerequisite', async ({ page }) => {
  await page.goto('/roadmap/')
  const svg = page.locator('svg[aria-label="Roadmap"]')
  await expect(svg.getByText('Algorithms', { exact: true })).toBeVisible()
  await expect(svg.getByText('System Design', { exact: true })).toBeVisible()
  await expect(svg.locator('path[data-from="arrays-hashing"][data-to="caching"]')).toHaveCount(1)
  const cross = svg.locator('path[data-from="arrays-hashing"][data-to="caching"]')
  await expect(cross).toHaveAttribute('stroke-dasharray', '6 4')
  const clear = await svg.evaluate((el) => {
    const p = el.querySelector('path[data-from="arrays-hashing"][data-to="caching"]') as SVGPathElement
    const left = p.getBBox().x
    return [...el.querySelectorAll('g[role="link"] circle')].every((c) => {
      const m = (c.closest('g') as SVGGElement).transform.baseVal.consolidate()!.matrix
      return left < m.e - (c as SVGCircleElement).r.baseVal.value
    })
  })
  expect(clear).toBe(true)
  await svg.getByRole('link', { name: /^Caching:/ }).click()
  await expect(page).toHaveURL(/\/system-design\/caching\/$/)
})
