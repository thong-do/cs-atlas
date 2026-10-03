import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import { LadderList } from '@/components/patterns/ladder-list'
import { MasteryBadge } from '@/components/patterns/mastery-badge'
import { Visualizer } from '@/components/visualizers/visualizer'
import { getCatalog, getPatternDoc, type TocEntry } from '@/lib/content'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().patterns.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `${getPatternDoc(slug)?.title ?? 'Pattern'} · LeetHub` }
}

function PatternLinks({ slugs, titleOf }: { slugs: string[]; titleOf: (slug: string) => string }) {
  return slugs.map((s, i) => (
    <span key={s}>{i > 0 && ', '}<Link href={`/patterns/${s}/`} className="underline">{titleOf(s)}</Link></span>
  ))
}

export default async function PatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = getPatternDoc(slug)
  if (!doc) notFound()
  const { problems, patterns } = getCatalog()
  const ladder = problems.filter((p) => p.patterns[0] === slug)
  const titleOf = (s: string) => patterns.find((p) => p.slug === s)?.title ?? s
  const toc: TocEntry[] = [
    { title: 'Recognize it', url: '#recognize-it', items: [] },
    ...doc.toc,
    { title: 'Problem ladder', url: '#problem-ladder', items: [] },
  ]

  return (
    <div className="gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_200px]">
      <article className="min-w-0 space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground"><Link href="/roadmap/" className="hover:underline">Roadmap</Link> / {doc.title}</p>
          <h1 className="text-3xl font-bold">{doc.title}</h1>
          <p className="text-lg text-muted-foreground">{doc.summary}</p>
          <p className="text-sm"><span className="font-medium">Typical cost:</span> {doc.complexity}</p>
          {doc.prerequisites.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Builds on: <PatternLinks slugs={doc.prerequisites} titleOf={titleOf} />
            </p>
          )}
          <MasteryBadge slug={slug} />
        </header>

        <section id="recognize-it" className="scroll-mt-20 space-y-2">
          <h2 className="text-2xl font-semibold">Recognize it</h2>
          <p className="text-muted-foreground">Reach for {doc.title} when you see:</p>
          <ul className="list-disc space-y-1 pl-6">
            {doc.triggers.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {doc.confusedWith.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Often confused with: <PatternLinks slugs={doc.confusedWith} titleOf={titleOf} />
            </p>
          )}
        </section>

        {doc.stub ? (
          <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
            Theory for this pattern is coming soon — the problem ladder below is ready to practice.
          </p>
        ) : (
          <div className="prose max-w-none dark:prose-invert prose-headings:scroll-mt-20">
            <MDXContent code={doc.body} components={{ Visualizer }} />
          </div>
        )}

        <section id="problem-ladder" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-semibold">Problem ladder</h2>
          <p className="text-sm text-muted-foreground">Easy to hard. Solve them in order — each one adds a twist.</p>
          <LadderList problems={ladder} />
        </section>
      </article>

      <aside className="hidden lg:block">
        <nav aria-label="On this page" className="sticky top-6 space-y-1 text-sm">
          <p className="mb-2 font-medium">On this page</p>
          {toc.map((item) => (
            <a key={item.url} href={item.url} className="block text-muted-foreground hover:text-foreground">{item.title}</a>
          ))}
        </nav>
      </aside>
    </div>
  )
}
