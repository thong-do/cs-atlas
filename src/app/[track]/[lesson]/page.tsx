import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import { LadderList } from '@/components/lessons/ladder-list'
import { MasteryBadge } from '@/components/lessons/mastery-badge'
import { Visualizer } from '@/components/visualizers/visualizer'
import { getCatalog, getLessonDoc, type TocEntry } from '@/lib/content'
import { lessonHref } from '@/lib/content/hrefs'
import { lessonExercises, trackLookup } from '@/lib/logic/lessons'

export const dynamicParams = false

export function generateStaticParams() {
  return getCatalog().lessons.map((l) => ({ track: l.track, lesson: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ track: string; lesson: string }> }): Promise<Metadata> {
  const { lesson } = await params
  return { title: `${getLessonDoc(lesson)?.title ?? 'Lesson'} · LeetHub` }
}

function LessonLinks({ slugs, lessonOf }: { slugs: string[]; lessonOf: (slug: string) => { track: string; slug: string; title: string } | undefined }) {
  return slugs.map((s, i) => (
    <span key={s}>{i > 0 && ', '}<Link href={lessonHref(lessonOf(s)!)} className="underline">{lessonOf(s)?.title ?? s}</Link></span>
  ))
}

export default async function LessonPage({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track, lesson: slug } = await params
  const doc = getLessonDoc(slug)
  if (!doc || doc.track !== track) notFound()
  const { exercises, lessons } = getCatalog()
  const ladder = lessonExercises(doc, exercises, trackLookup(lessons))
  const lessonOf = (s: string) => lessons.find((l) => l.slug === s)
  const toc: TocEntry[] = [
    ...(doc.triggers.length > 0 ? [{ title: 'Recognize it', url: '#recognize-it', items: [] }] : []),
    ...doc.toc,
    { title: 'Practice ladder', url: '#practice-ladder', items: [] },
  ]

  return (
    <div className="gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_200px]">
      <article className="min-w-0 space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground"><Link href="/roadmap/" className="hover:underline">Roadmap</Link> / {doc.title}</p>
          <h1 className="text-3xl font-bold">{doc.title}</h1>
          <p className="text-lg text-muted-foreground">{doc.summary}</p>
          {doc.complexity && <p className="text-sm"><span className="font-medium">Typical cost:</span> {doc.complexity}</p>}
          {doc.prerequisites.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Builds on: <LessonLinks slugs={doc.prerequisites} lessonOf={lessonOf} />
            </p>
          )}
          <MasteryBadge slug={slug} />
        </header>

        {doc.triggers.length > 0 && (
        <section id="recognize-it" className="scroll-mt-20 space-y-2">
          <h2 className="text-2xl font-semibold">Recognize it</h2>
          <p className="text-muted-foreground">Reach for {doc.title} when you see:</p>
          <ul className="list-disc space-y-1 pl-6">
            {doc.triggers.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {doc.confusedWith.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Often confused with: <LessonLinks slugs={doc.confusedWith} lessonOf={lessonOf} />
            </p>
          )}
        </section>
        )}

        <div className="prose max-w-none dark:prose-invert prose-headings:scroll-mt-20">
          <MDXContent code={doc.body} components={{ Visualizer }} />
        </div>

        <section id="practice-ladder" className="scroll-mt-20 space-y-3">
          <h2 className="text-2xl font-semibold">Practice ladder</h2>
          <p className="text-sm text-muted-foreground">Easy to hard. Solve them in order — each one adds a twist.</p>
          <LadderList exercises={ladder} />
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
