import { TracksOverview } from '@/components/tracks/tracks-overview'

export const metadata = { title: 'Tracks · LeetHub' }

export default function TracksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tracks</h1>
      <TracksOverview />
    </div>
  )
}
