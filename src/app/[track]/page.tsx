import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TrackHome } from '@/components/tracks/track-home'
import { getCatalog } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().tracks.map((t) => ({ track: t.slug }))
}

type Params = Promise<{ track: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track } = await params
  return { title: `${getCatalog().tracks.find((t) => t.slug === track)?.title ?? 'Track'} · CS Atlas` }
}

export default async function TrackPage({ params }: { params: Params }) {
  const { track } = await params
  if (!getCatalog().tracks.some((t) => t.slug === track)) notFound()
  return <TrackHome slug={track} />
}
