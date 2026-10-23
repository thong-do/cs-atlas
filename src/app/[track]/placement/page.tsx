import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlacementQuiz } from '@/components/tracks/placement-quiz'
import { getCatalog, getPlacement, placementTracks } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return placementTracks().map((track) => ({ track }))
}

type Params = Promise<{ track: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params
  return { title: `${getCatalog().tracks.find((t) => t.slug === track)?.title ?? 'Track'} placement · CS Atlas` }
}

export default async function PlacementPage({ params }: { params: Params }) {
  const { track } = await params
  const placement = getPlacement(track)
  if (!placement) notFound()
  return <PlacementQuiz placement={placement} />
}
