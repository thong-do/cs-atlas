import { describe, expect, it } from 'vitest'
import { anchoredScroll, clampZoom, fitZoom, MAX_ZOOM, MIN_ZOOM, zoomIn, zoomOut } from './zoom'

describe('zoom', () => {
  it('steps through presets and stops at the limits', () => {
    expect(zoomIn(1)).toBe(1.25)
    expect(zoomOut(1)).toBe(0.8)
    expect(zoomIn(0.9)).toBe(1)
    expect(zoomOut(0.9)).toBe(0.8)
    expect(zoomIn(MAX_ZOOM)).toBe(MAX_ZOOM)
    expect(zoomOut(MIN_ZOOM)).toBe(MIN_ZOOM)
  })

  it('clamps', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM)
    expect(clampZoom(9)).toBe(MAX_ZOOM)
  })

  it('fits to the available width but never enlarges past 1', () => {
    expect(fitZoom(790, 1580)).toBe(0.5)
    expect(fitZoom(2000, 1580)).toBe(1)
    expect(fitZoom(100, 1580)).toBe(MIN_ZOOM)
    expect(fitZoom(0, 1580)).toBe(1)
  })

  it('keeps the anchored point fixed', () => {
    // point at content x = (100 + 50) / 1 = 150; after 2x it sits at 300, so scroll = 300 - 50
    expect(anchoredScroll(100, 50, 1, 2)).toBe(250)
    expect(anchoredScroll(250, 50, 2, 1)).toBe(100)
  })
})
