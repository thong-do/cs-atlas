import { Suspense } from 'react'
import { ExercisesTable } from '@/components/exercises/exercises-table'

export const metadata = { title: 'Exercises · LeetHub' }

export default function ExercisesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exercises</h1>
      <Suspense>
        <ExercisesTable />
      </Suspense>
    </div>
  )
}
