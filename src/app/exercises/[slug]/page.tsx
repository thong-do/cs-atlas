import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExerciseWorkspace } from '@/components/exercises/exercise-workspace'
import { getCatalog, getExercise } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().exercises.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `${getExercise(slug)?.title ?? 'Exercise'} · LeetHub` }
}

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const exercise = getExercise(slug)
  if (!exercise) notFound()
  return <ExerciseWorkspace exercise={exercise} />
}
