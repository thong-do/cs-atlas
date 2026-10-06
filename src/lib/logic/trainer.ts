import type { LessonMeta, ExerciseMeta, TrainAttempt } from '@/lib/types'
import { TRAINER_TRACK } from './lessons'
import { recognitionAccuracy } from './mastery'
import { shuffle, type Rng } from './rng'

export interface TrainQuestion {
  problemSlug: string
  prompt: string
  correct: string
  options: string[]
}

export function pickDistractors(correct: string, lessons: LessonMeta[], rng: Rng): string[] {
  const pool = lessons.map((l) => l.slug).filter((slug) => slug !== correct)
  const confused = [...new Set(lessons.find((l) => l.slug === correct)?.confusedWith ?? [])].filter((s) => pool.includes(s))
  const rest = pool.filter((s) => !confused.includes(s))
  return [...shuffle(confused, rng), ...shuffle(rest, rng)].slice(0, 3)
}

export function buildQuestion(exercise: ExerciseMeta, lessons: LessonMeta[], rng: Rng): TrainQuestion {
  const correct = exercise.lessons[0]
  return {
    problemSlug: exercise.slug,
    prompt: exercise.recognitionPrompt,
    correct,
    options: shuffle([correct, ...pickDistractors(correct, lessons, rng)], rng),
  }
}

export function pickTrainExercises(exercises: ExerciseMeta[], attempts: TrainAttempt[], count: number, rng: Rng): ExerciseMeta[] {
  const weighted = exercises
    .filter((p) => p.recognitionPrompt.trim().length > 0)
    .map((p) => ({ p, w: 2 - (recognitionAccuracy(attempts, p.lessons[0]) ?? 0) }))
  const picked: ExerciseMeta[] = []
  while (picked.length < count && weighted.length > 0) {
    let r = rng() * weighted.reduce((sum, x) => sum + x.w, 0)
    let i = 0
    while (i < weighted.length - 1 && r >= weighted[i].w) {
      r -= weighted[i].w
      i++
    }
    picked.push(weighted.splice(i, 1)[0].p)
  }
  return picked
}

export function buildRound(
  exercises: ExerciseMeta[],
  lessons: LessonMeta[],
  attempts: TrainAttempt[],
  count: number,
  rng: Rng,
): TrainQuestion[] {
  const pool = lessons.filter((l) => l.track === TRAINER_TRACK)
  const inPool = new Set(pool.map((l) => l.slug))
  const eligible = exercises.filter((e) => inPool.has(e.lessons[0]))
  return pickTrainExercises(eligible, attempts, count, rng).map((e) => buildQuestion(e, pool, rng))
}
