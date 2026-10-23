import type { Placement, PlacementQuestion, Settings, TrackMeta } from '@/lib/types'

export interface PlacementScore {
  /** Modules where every question was answered correctly, in track order. */
  passedModules: string[]
  byModule: Record<string, { correct: number; total: number }>
}

export function scorePlacement(track: TrackMeta, questions: PlacementQuestion[], answers: number[]): PlacementScore {
  const byModule: PlacementScore['byModule'] = {}
  questions.forEach((q, i) => {
    const score = (byModule[q.module] ??= { correct: 0, total: 0 })
    score.total += 1
    if (answers[i] === q.answer) score.correct += 1
  })
  const passedModules = track.modules
    .map((m) => m.slug)
    .filter((slug) => byModule[slug] !== undefined && byModule[slug].correct === byModule[slug].total)
  return { passedModules, byModule }
}

/** Lessons in every passed module. Unknown module slugs (renamed or removed content) are ignored. */
export function skippedLessons(track: TrackMeta, placement: Placement | undefined): Set<string> {
  if (!placement) return new Set()
  const passed = new Set(placement.passedModules)
  return new Set(track.modules.filter((m) => passed.has(m.slug)).flatMap((m) => m.lessons))
}

export function allSkippedLessons(tracks: TrackMeta[], placements: Record<string, Placement> | undefined): Set<string> {
  return new Set(tracks.flatMap((t) => [...skippedLessons(t, placements?.[t.slug])]))
}

/** New settings with one track's placement set (or cleared with null); every other field is kept. */
export function withPlacement(settings: Settings, track: string, placement: Placement | null): Settings {
  const { placements, ...rest } = settings
  const next = { ...placements }
  if (placement) next[track] = placement
  else delete next[track]
  return Object.keys(next).length > 0 ? { ...rest, placements: next } : rest
}
