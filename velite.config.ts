import { defineCollection, defineConfig, s } from 'velite'
import rehypeShiki from '@shikijs/rehype'
import rehypeSlug from 'rehype-slug'
import { validateContent } from './src/lib/content/validate'

const patterns = defineCollection({
  name: 'Pattern',
  pattern: 'patterns/*.mdx',
  schema: s.object({
    slug: s.slug('patterns'),
    title: s.string(),
    prerequisites: s.array(s.string()).default([]),
    confusedWith: s.array(s.string()).default([]),
    triggers: s.array(s.string()).min(1),
    complexity: s.string(),
    summary: s.string(),
    stub: s.boolean().default(false),
    toc: s.toc(),
    body: s.mdx(),
  }),
})

const problems = defineCollection({
  name: 'Problem',
  pattern: 'problems/*.yaml',
  schema: s
    .object({
      slug: s.slug('problems'),
      title: s.string(),
      leetcodeId: s.number().int().positive(),
      url: s.string().url(),
      difficulty: s.enum(['easy', 'medium', 'hard']),
      patterns: s.array(s.string()).min(1),
      ladderOrder: s.number().int().positive(),
      recognitionPrompt: s.string().min(10),
      hint: s.string().min(5),
    })
    .strict(), // unknown fields (e.g. a pasted solution) fail the build
})

const roadmap = defineCollection({
  name: 'Roadmap',
  pattern: 'roadmap.yaml',
  single: true,
  schema: s.object({ order: s.array(s.string()).min(1) }),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { patterns, problems, roadmap },
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [rehypeShiki as any, { themes: { light: 'github-light', dark: 'github-dark' } }],
    ],
  },
  prepare: ({ patterns, problems, roadmap }) => {
    const errors = validateContent({ roadmap: roadmap.order, patterns, problems })
    if (errors.length > 0) {
      throw new Error(`Content validation failed:\n- ${errors.join('\n- ')}`)
    }
  },
})
