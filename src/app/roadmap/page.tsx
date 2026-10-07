import { RoadmapView } from '@/components/roadmap/roadmap-view'

export const metadata = { title: 'Roadmap · CS Atlas' }

export default function RoadmapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Roadmap</h1>
      <p className="text-muted-foreground">
        Each track is a band, and each ring shows your mastery. Dashed lines link lessons across tracks. The dashed ring marks what to learn next, but every lesson is open, so jump anywhere.
      </p>
      <RoadmapView />
    </div>
  )
}
