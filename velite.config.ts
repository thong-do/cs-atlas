import { defineCollection, defineConfig, s } from 'velite'
import rehypeShiki from '@shikijs/rehype'
import rehypeSlug from 'rehype-slug'
import { validateContent } from './src/lib/content/validate'

const tracks = defineCollection({
  name: 'Track',
  pattern: 'tracks/*/track.yaml',
  schema: s
    .object({
      slug: s.string(),
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
      body: s.mdx(),
    })
    .transform(({ path, ...l }) => ({ ...l, track: path.split('/')[1] })),
})

const exercises = defineCollection({
  name: 'Exercise',
  pattern: 'exercises/*.yaml',
  schema: s
    .object({
      slug: s.slug('exercises'),
      // Phase 2 turns this into a discriminated union when quiz and flashcard exercises arrive.
      type: s.literal('external-problem'),
      title: s.string(),
      leetcodeId: s.number().int().positive(),
      url: s.string().url(),
      difficulty: s.enum(['easy', 'medium', 'hard']),
      lessons: s.array(s.string()).min(1),
      ladderOrder: s.number().int().positive(),
      recognitionPrompt: s.string().min(10),
      hint: s.string().min(5),
    })
    .strict(), // unknown fields (e.g. a pasted solution) fail the build
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
  },
})
