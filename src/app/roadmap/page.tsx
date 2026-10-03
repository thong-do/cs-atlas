import { RoadmapView } from '@/components/roadmap/roadmap-view'

export const metadata = { title: 'Roadmap · LeetHub' }

export default function RoadmapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Roadmap</h1>
      <p className="text-muted-foreground">
        Each ring shows your mastery. The dashed ring marks what to learn next — but every pattern is open, jump anywhere.
      </p>
      <RoadmapView />
    </div>
  )
}
