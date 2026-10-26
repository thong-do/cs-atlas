export const ABR_LADDER_KBPS = [400, 1000, 2500, 5000]
export const ABR_SEGMENT_SECONDS = 4
/** Bandwidth during each of the 8 segment downloads, in Mbit/s. */
export const ABR_BANDWIDTH_MBPS = [8, 8, 8, 2, 2, 2, 4, 4]
const SAFETY = 0.8

export interface AbrStep {
  segment: number | null
  bandwidthMbps: number | null
  renditionKbps: number | null
  downloadSeconds: number | null
  stallSeconds: number
  bufferSeconds: number
  totalStallSeconds: number
  history: number[]
  caption: string
  done?: boolean
}

const num = (n: number) => n.toLocaleString('en-US')
/** Seconds with at most one decimal. */
const sec = (n: number) => `${Number(n.toFixed(1)).toLocaleString('en-US', { maximumFractionDigits: 1 })} s`
const round = (n: number) => Math.round(n * 1e9) / 1e9

export function abrPlayerSteps(): AbrStep[] {
  const lowest = ABR_LADDER_KBPS[0]
  const steps: AbrStep[] = []
  const history: number[] = []
  const stalls: number[] = []
  let buffer = 0
  let totalStall = 0

  steps.push({
    segment: null, bandwidthMbps: null, renditionKbps: null, downloadSeconds: null,
    stallSeconds: 0, bufferSeconds: 0, totalStallSeconds: 0, history: [],
    caption: `The player started with an empty buffer and a ${ABR_LADDER_KBPS.length}-rendition ladder: ${ABR_LADDER_KBPS.slice(0, -1).map(num).join(', ')} and ${num(ABR_LADDER_KBPS[ABR_LADDER_KBPS.length - 1])} kbps`,
  })

  ABR_BANDWIDTH_MBPS.forEach((bw, idx) => {
    const seg = idx + 1
    const prevBw = idx > 0 ? ABR_BANDWIDTH_MBPS[idx - 1] : null
    // The throughput measured while downloading the previous segment.
    const fitting = prevBw === null ? [] : ABR_LADDER_KBPS.filter((r) => r <= SAFETY * prevBw * 1000)
    const rendition = fitting.length > 0 ? fitting[fitting.length - 1] : lowest
    const prevRendition = idx > 0 ? history[idx - 1] : null
    const download = round((rendition * ABR_SEGMENT_SECONDS) / (bw * 1000))
    const before = buffer
    const stall = idx === 0 ? 0 : round(Math.max(0, download - before))
    buffer = idx === 0 ? ABR_SEGMENT_SECONDS : round(Math.max(0, before - download) + ABR_SEGMENT_SECONDS)
    if (buffer < 0) throw new Error(`Negative buffer after segment ${seg}`)
    totalStall = round(totalStall + stall)
    history.push(rendition)
    stalls.push(stall)

    const rungs = prevRendition === null ? 0 : ABR_LADDER_KBPS.indexOf(rendition) - ABR_LADDER_KBPS.indexOf(prevRendition)
    let caption: string
    if (idx === 0) {
      caption = `Segment 1 at ${num(rendition)} kbps (no measurement yet) downloaded in ${sec(download)}; playback started with ${sec(buffer)} buffered`
    } else if (stall > 0) {
      caption = `Bandwidth fell to ${num(bw)} Mbit/s: segment ${seg}, chosen at ${num(rendition)} kbps from the old ${num(prevBw!)} Mbit/s measurement, took ${sec(download)}; the ${sec(before)} buffer ran dry and playback stalled for ${sec(stall)}`
    } else if (rungs === 0 && bw !== prevBw) {
      caption = `Segment ${seg} stayed at ${num(rendition)} kbps while bandwidth ${bw > prevBw! ? 'recovered' : 'fell'} to ${num(bw)} Mbit/s; buffer ${sec(buffer)}`
    } else if (rungs === 0) {
      caption = `Segment ${seg} stayed at ${num(rendition)} kbps; ${seg === 3 ? `${sec(download)} to download, ` : ''}buffer ${sec(buffer)}`
    } else {
      const verb = rungs < 0 ? 'stepped down' : rungs > 1 ? 'jumped' : 'stepped up'
      const extra = seg === 2 ? `; it took ${sec(download)} and the buffer grew to ${sec(buffer)}` : seg === 5 ? `; ${sec(download)} to download, buffer ${sec(buffer)}` : `; buffer ${sec(buffer)}`
      caption = `Measured ${num(prevBw!)} Mbit/s, so segment ${seg} ${verb} to ${num(rendition)} kbps${extra}`
    }

    steps.push({
      segment: seg, bandwidthMbps: bw, renditionKbps: rendition, downloadSeconds: download,
      stallSeconds: stall, bufferSeconds: buffer, totalStallSeconds: totalStall, history: [...history], caption,
    })
  })

  const summed = round(stalls.reduce((a, b) => a + b, 0))
  if (summed !== totalStall) throw new Error(`Total stall ${totalStall} s differs from the per-segment sum ${summed} s`)
  const stallIdx = stalls.findIndex((s) => s > 0)
  const stalledCount = stalls.filter((s) => s > 0).length
  const low = Math.min(...history.slice(stallIdx))
  const final = history[history.length - 1]
  steps.push({
    segment: null, bandwidthMbps: null, renditionKbps: null, downloadSeconds: null,
    stallSeconds: 0, bufferSeconds: buffer, totalStallSeconds: totalStall, history: [...history], done: true,
    caption: `Done: ${ABR_BANDWIDTH_MBPS.length} segments, ${stalledCount === 1 ? 'one' : stalledCount} ${sec(totalStall)} stall; the player stepped down to ${num(low)} kbps and recovered to ${num(final)} kbps`,
  })
  return steps
}
