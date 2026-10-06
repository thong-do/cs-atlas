#!/usr/bin/env node
// Usage: node scripts/check-deploy.mjs https://leethub-nine.vercel.app
// Checks the v1 redirects (308 → new URL → 200) and that every lesson, track and exercise page returns 200.
import { readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const base = (process.argv[2] ?? '').replace(/\/+$/, '')
if (!base) {
  console.error('Usage: node scripts/check-deploy.mjs <baseUrl>')
  process.exit(2)
}

const root = new URL('../content/', import.meta.url).pathname
const tracks = readdirSync(join(root, 'tracks'))
const lessonPaths = tracks.flatMap((t) =>
  readdirSync(join(root, 'tracks', t, 'lessons')).filter((f) => f.endsWith('.mdx')).map((f) => `/${t}/${basename(f, '.mdx')}/`),
)
const exercisePaths = readdirSync(join(root, 'exercises')).filter((f) => f.endsWith('.yaml')).map((f) => `/exercises/${basename(f, '.yaml')}/`)
const pages = ['/', '/tracks/', '/roadmap/', '/exercises/', '/train/', '/stats/', '/settings/', ...tracks.map((t) => `/${t}/`), ...lessonPaths, ...exercisePaths]

const REDIRECTS = [
  ['/patterns/two-pointers', '/algorithms/two-pointers/'],
  ['/patterns/two-pointers/', '/algorithms/two-pointers/'],
  ['/problems', '/exercises/'],
  ['/problems/', '/exercises/'],
  ['/problems/3sum', '/exercises/3sum/'],
  ['/problems/3sum/', '/exercises/3sum/'],
]

const failures = []

for (const [from, to] of REDIRECTS) {
  let url = base + from
  const hops = []
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { redirect: 'manual' })
    hops.push(res.status)
    if (res.status < 300 || res.status >= 400) break
    url = new URL(res.headers.get('location'), url).href
  }
  const finalPath = new URL(url).pathname
  const ok = hops.slice(0, -1).every((s) => s === 308) && hops.at(-1) === 200 && finalPath === to
  if (!ok) failures.push(`redirect ${from}: hops ${hops.join(' → ')}, ended at ${finalPath} (want 308 → ${to} → 200)`)
}

const BATCH = 10
for (let i = 0; i < pages.length; i += BATCH) {
  await Promise.all(
    pages.slice(i, i + BATCH).map(async (path) => {
      const res = await fetch(base + path)
      if (res.status !== 200) failures.push(`${path}: ${res.status}`)
    }),
  )
}

console.log(`Checked ${REDIRECTS.length} redirects and ${pages.length} pages on ${base}`)
if (failures.length > 0) {
  console.error(`FAIL (${failures.length}):\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('PASS')
