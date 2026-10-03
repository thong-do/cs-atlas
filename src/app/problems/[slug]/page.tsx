import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProblemWorkspace } from '@/components/problems/problem-workspace'
import { getCatalog, getProblem } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().problems.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `${getProblem(slug)?.title ?? 'Problem'} · LeetHub` }
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const problem = getProblem(slug)
  if (!problem) notFound()
  return <ProblemWorkspace problem={problem} />
}
