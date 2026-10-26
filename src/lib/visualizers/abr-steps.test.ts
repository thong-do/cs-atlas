import { describe, expect, it } from 'vitest'
import { abrPlayerSteps } from './abr-steps'

describe('abrPlayerSteps', () => {
  const steps = abrPlayerSteps()

  it('has 10 steps with only the last done', () => {
    expect(steps).toHaveLength(10)
    expect(steps.filter((s) => s.done)).toHaveLength(1)
    expect(steps[9].done).toBe(true)
  })

  it('pins the traced segments, bandwidth, renditions, downloads, stalls and buffers', () => {
    expect(steps.map((s) => s.segment)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, 8, null])
    expect(steps.map((s) => s.bandwidthMbps)).toEqual([null, 8, 8, 8, 2, 2, 2, 4, 4, null])
    expect(steps.map((s) => s.renditionKbps)).toEqual([null, 400, 5000, 5000, 5000, 1000, 1000, 1000, 2500, null])
    expect(steps.map((s) => s.downloadSeconds)).toEqual([null, 0.2, 2.5, 2.5, 10, 2, 2, 1, 2.5, null])
    expect(steps.map((s) => s.stallSeconds)).toEqual([0, 0, 0, 0, 3, 0, 0, 0, 0, 0])
    expect(steps.map((s) => s.bufferSeconds)).toEqual([0, 4, 5.5, 7, 4, 6, 8, 11, 12.5, 12.5])
    expect(steps.map((s) => s.totalStallSeconds)).toEqual([0, 0, 0, 0, 3, 3, 3, 3, 3, 3])
  })

  it('pins the history', () => {
    expect(steps.map((s) => s.history)).toEqual([
      [],
      [400],
      [400, 5000],
      [400, 5000, 5000],
      [400, 5000, 5000, 5000],
      [400, 5000, 5000, 5000, 1000],
      [400, 5000, 5000, 5000, 1000, 1000],
      [400, 5000, 5000, 5000, 1000, 1000, 1000],
      [400, 5000, 5000, 5000, 1000, 1000, 1000, 2500],
      [400, 5000, 5000, 5000, 1000, 1000, 1000, 2500],
    ])
  })

  it('pins every caption verbatim', () => {
    expect(steps.map((s) => s.caption)).toEqual([
      'The player started with an empty buffer and a 4-rendition ladder: 400, 1,000, 2,500 and 5,000 kbps',
      'Segment 1 at 400 kbps (no measurement yet) downloaded in 0.2 s; playback started with 4 s buffered',
      'Measured 8 Mbit/s, so segment 2 jumped to 5,000 kbps; it took 2.5 s and the buffer grew to 5.5 s',
      'Segment 3 stayed at 5,000 kbps; 2.5 s to download, buffer 7 s',
      'Bandwidth fell to 2 Mbit/s: segment 4, chosen at 5,000 kbps from the old 8 Mbit/s measurement, took 10 s; the 7 s buffer ran dry and playback stalled for 3 s',
      'Measured 2 Mbit/s, so segment 5 stepped down to 1,000 kbps; 2 s to download, buffer 6 s',
      'Segment 6 stayed at 1,000 kbps; buffer 8 s',
      'Segment 7 stayed at 1,000 kbps while bandwidth recovered to 4 Mbit/s; buffer 11 s',
      'Measured 4 Mbit/s, so segment 8 stepped up to 2,500 kbps; buffer 12.5 s',
      'Done: 8 segments, one 3 s stall; the player stepped down to 1,000 kbps and recovered to 2,500 kbps',
    ])
  })
})
