import { Suspense } from 'react'
import { TrainView } from '@/components/train/train-view'

export const metadata = { title: 'Train · LeetHub' }

export default function TrainPage() {
  return (
    <Suspense>
      <TrainView />
    </Suspense>
  )
}
