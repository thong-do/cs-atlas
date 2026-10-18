import { defineCollection, defineConfig, s } from 'velite'
import rehypeShiki from '@shikijs/rehype'
import rehypeSlug from 'rehype-slug'
import { validateContent } from './src/lib/content/validate'

const tracks = defineCollection({
  name: 'Track',
  pattern: 'tracks/*/track.yaml',
  schema: s
    .object({
      slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase words separated by dashes'),
      title: s.string(),
      summary: s.string(),
      order: s.number().int().positive(),
      modules: s
        .array(
          s.object({
            slug: s.string(),
            title: s.string(),
            lessons: s.array(s.string()).default([]),
            comingSoon: s.array(s.string()).default([]),
          }).strict(),
        )
        .min(1),
      path: s.path(),
    })
    .transform(({ path, ...t }) => ({ ...t, folder: path.split('/')[1] })),
})

const lessons = defineCollection({
  name: 'Lesson',
  pattern: 'tracks/*/lessons/*.mdx',
  schema: s
    .object({
      slug: s.slug('lessons'),
      title: s.string(),
      summary: s.string(),
      level: s.enum(['beginner', 'intermediate', 'advanced']),
      authors: s.array(s.string()).default([]),
      prerequisites: s.array(s.string()).default([]),
      confusedWith: s.array(s.string()).default([]),
      triggers: s.array(s.string()).default([]),
      complexity: s.string().optional(),
      path: s.path(),
      toc: s.toc(),
      raw: s.raw(),
      body: s.mdx(),
    })
    .strict() // unknown frontmatter keys (e.g. a typo like `prerequisite`) fail the build
    .transform(({ path, ...l }) => ({ ...l, path, track: path.split('/')[1] })),
})

const id = s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ids are lowercase-with-dashes')
const base = {
  slug: s.slug('exercises'),
  title: s.string(),
  lessons: s.array(s.string()).min(1),
  ladderOrder: s.number().int().positive(),
  path: s.path(),
}

const exercises = defineCollection({
  name: 'Exercise',
  pattern: 'exercises/*.yaml',
  schema: s.discriminatedUnion('type', [
    s.object({
      ...base,
      type: s.literal('external-problem'),
      leetcodeId: s.number().int().positive(),
      url: s.string().url(),
      difficulty: s.enum(['easy', 'medium', 'hard']),
      recognitionPrompt: s.string().min(10),
      hint: s.string().min(5),
    }).strict(),
    s.object({
      ...base,
      type: s.literal('quiz'),
      questions: s.array(s.object({
        id,
        prompt: s.string().min(1),
        choices: s.array(s.string().min(1)).min(2).max(5),
        answer: s.number().int().min(0),
        explanation: s.string().min(1),
      }).strict()).min(3).max(8),
      flashcards: s.array(s.object({
        id,
        front: s.string().min(1).max(200),
        back: s.string().min(1).max(200),
      }).strict()).max(20).default([]),
    }).strict(),
    s.object({
      ...base,
      type: s.literal('design-prompt'),
      prompt: s.string().min(1),
      rubric: s.array(s.object({ id, point: s.string().min(1) }).strict()).min(3).max(8),
      reference: s.string().min(1),
      hint: s.string().min(1).optional(),
      kind: s.enum(['design', 'diagnose']).default('design'),
    }).strict(),
  ]), // unknown fields (e.g. a pasted solution) fail the build
})

export default defineConfig({
  root: 'content',
  strict: true, // schema violations (missing/unknown fields) fail the build
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { tracks, lessons, exercises },
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [rehypeShiki as any, { themes: { light: 'github-light', dark: 'github-dark' } }],
    ],
  },
  prepare: ({ tracks, lessons, exercises }) => {
    const errors = validateContent({
      tracks: tracks.map((t) => ({ slug: t.slug, folder: t.folder, order: t.order, modules: t.modules })),
      lessons: lessons.map((l) => ({ ...l, headings: l.toc.map((h) => h.title) })),
      exercises,
    })
    if (errors.length > 0) {
      throw new Error(`Content validation failed:\n- ${errors.join('\n- ')}`)
    }
    // path and raw exist only for validation; keep them out of the emitted data (and the client bundle).
    for (const l of lessons) {
      delete (l as { raw?: string }).raw
      delete (l as { path?: string }).path
    }
    for (const e of exercises) delete (e as { path?: string }).path
  },
})
