import { z } from 'zod'
import { SCHEMA_VERSION, type Activity, type UserData } from '@/lib/types'

export interface ExportFile {
  app: 'leethub'
  schemaVersion: number
  exportedAt: string
  data: UserData
}

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date')
const count = z.number().int().min(0)

const exportFileSchema = z.object({
  app: z.literal('leethub'),
  schemaVersion: z.number().int().positive(),
  exportedAt: iso,
  data: z.object({
    progress: z.array(z.object({
      slug: z.string(),
      status: z.enum(['unsolved', 'solved']),
      solveRating: z.enum(['alone', 'hint', 'solution']).optional(),
      firstSolvedAt: iso.optional(),
      needsResolve: z.boolean(),
      updatedAt: iso,
    })),
    notes: z.array(z.object({
      slug: z.string(), insight: z.string(), approach: z.string(), complexity: z.string(),
      mistakes: z.string(), code: z.string(), updatedAt: iso,
    })),
    cards: z.array(z.object({
      slug: z.string(),
      card: z.object({ due: iso, last_review: iso.optional(), state: z.number().int() }).passthrough(),
      due: iso,
      updatedAt: iso,
    })),
    reviewLogs: z.array(z.object({
      id: z.string(), slug: z.string(), rating: z.enum(['again', 'hard', 'good', 'easy']), reviewedAt: iso,
    })),
    trainAttempts: z.array(z.object({
      id: z.string(), problemSlug: z.string(), correctPattern: z.string(), chosenPattern: z.string(),
      correct: z.boolean(), at: iso,
    })),
    activity: z.array(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reviews: count, solves: count, trains: count,
    })),
    meta: z.object({
      schemaVersion: z.number().int(),
      lastBackupAt: iso.optional(),
      settings: z.object({
        desiredRetention: z.number().min(0.7).max(0.97),
        theme: z.enum(['system', 'light', 'dark']),
      }),
    }),
  }),
})

export function buildExport(data: UserData, now: Date): ExportFile {
  return { app: 'leethub', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data }
}

export function parseExport(text: string): { ok: true; file: ExportFile } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  const result = exportFileSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { ok: false, error: `Not a LeetHub backup: ${issue.path.join('.') || 'file'} — ${issue.message}` }
  }
  if (result.data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of LeetHub. Update the app first.' }
  }
  return { ok: true, file: result.data as ExportFile }
}

function newest<T>(local: T[], incoming: T[], key: (x: T) => string, stamp: (x: T) => string): T[] {
  const map = new Map(local.map((x) => [key(x), x]))
  for (const x of incoming) {
    const current = map.get(key(x))
    if (!current || Date.parse(stamp(x)) > Date.parse(stamp(current))) map.set(key(x), x)
  }
  return [...map.values()]
}

function union<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map(local.map((x) => [x.id, x]))
  for (const x of incoming) if (!map.has(x.id)) map.set(x.id, x)
  return [...map.values()]
}

function mergeActivity(local: Activity[], incoming: Activity[]): Activity[] {
  const map = new Map(local.map((a) => [a.date, { ...a }]))
  for (const a of incoming) {
    const cur = map.get(a.date)
    map.set(a.date, cur
      ? { date: a.date, reviews: Math.max(cur.reviews, a.reviews), solves: Math.max(cur.solves, a.solves), trains: Math.max(cur.trains, a.trains) }
      : { ...a })
  }
  return [...map.values()]
}

export function mergeUserData(local: UserData, incoming: UserData): UserData {
  const backups = [local.meta.lastBackupAt, incoming.meta.lastBackupAt].filter((x): x is string => !!x).sort()
  return {
    progress: newest(local.progress, incoming.progress, (x) => x.slug, (x) => x.updatedAt),
    notes: newest(local.notes, incoming.notes, (x) => x.slug, (x) => x.updatedAt),
    cards: newest(local.cards, incoming.cards, (x) => x.slug, (x) => x.updatedAt),
    reviewLogs: union(local.reviewLogs, incoming.reviewLogs),
    trainAttempts: union(local.trainAttempts, incoming.trainAttempts),
    activity: mergeActivity(local.activity, incoming.activity),
    meta: {
      schemaVersion: SCHEMA_VERSION,
      settings: local.meta.settings,
      ...(backups.length ? { lastBackupAt: backups.at(-1) } : {}),
    },
  }
}
