export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 2
const STEPS = [0.3, 0.4, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2]

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

/** Next preset step above `z`, so repeated clicks land on round numbers even after a pinch. */
export const zoomIn = (z: number) => STEPS.find((s) => s > z + 1e-6) ?? MAX_ZOOM
export const zoomOut = (z: number) => [...STEPS].reverse().find((s) => s < z - 1e-6) ?? MIN_ZOOM

/** Largest zoom (never above 1) at which `natural` fits in `available` pixels. */
export const fitZoom = (available: number, natural: number) => (natural > 0 && available > 0 ? clampZoom(Math.min(1, available / natural)) : 1)

/** New scroll offset that keeps the content point under `anchor` (px from the viewport edge) fixed when zoom changes. */
export const anchoredScroll = (scroll: number, anchor: number, from: number, to: number) => ((scroll + anchor) / from) * to - anchor
