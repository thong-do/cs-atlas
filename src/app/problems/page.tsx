import { Suspense } from 'react'
import { ProblemsTable } from '@/components/problems/problems-table'

export const metadata = { title: 'Problems · LeetHub' }

export default function ProblemsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Problems</h1>
      <Suspense>
        <ProblemsTable />
      </Suspense>
    </div>
  )
}
