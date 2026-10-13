# Phase 1 — Accounts & Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners can sign in with GitHub or Google, and their progress then lives in Supabase and syncs across devices. Signed-out guest mode stays exactly as it is today.

**Architecture:**
- **Two stores behind one interface.** `Store` gains `subscribe()`, and `useLive` re-runs queries on store notifications instead of using Dexie live queries.
- **When signed out,** `DexieStore` is used, as today.
- **When signed in,** `SupabaseStore` holds an in-memory snapshot of the user's data and writes through Postgres functions. A thin `RemoteApi` wraps all network calls and refreshes the snapshot on Realtime events.
- **First sign-in** merges guest data into the account, then clears the local copy.
- **Hosting** stays a static export. All Supabase calls run in the browser, and row-level security protects the data.

**Tech Stack:**
- Next.js 15 (static export), React 19, TypeScript
- Dexie, ts-fsrs
- `@supabase/supabase-js` v2 and the Supabase CLI (local Postgres, pgTAP)
- Vitest, Playwright, shadcn/ui (Radix)

**Spec:** `docs/superpowers/specs/2026-10-11-phase-1-accounts-sync-design.md`

## Global Constraints

- **Repository.** The repo root is `/Users/thongdo/IT/algorithms/leethub`, on branch `feat/phase-1`. Never commit to `main` and never push.
- **Commit trailer.** Every commit message ends with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- **Data compatibility.** Guest storage stays v1:
  - IndexedDB name `leethub` and the `LeetHubDB` schema
  - the storage types in `src/lib/types.ts`
  - the backup format (`app: 'leethub'`, `SCHEMA_VERSION`)

  New code may add methods to `DexieStore` but must not change its tables.
- **The UI depends on the interface only.** UI code reads data only through `useStore()` and `useLive()`. No component imports `DexieStore`, `SupabaseStore` or supabase-js directly. The only exceptions are the auth UI, which uses `useAuth()`, and `src/lib/supabase/*`.
- **Configuration is optional.** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, auth is `disabled`. The app is then guest-only and shows no Sign in UI.
- **Database names.** SQL uses snake_case versions of the v1 field names (`problem_slug`, `correct_pattern`, `chosen_pattern`, `solve_rating`, …). Exactly one module, `src/lib/supabase/rows.ts`, maps between the two.
- **Security.** Every public table has RLS enabled and policies limited to `user_id = (select auth.uid())` for the `authenticated` role. `anon` gets no access. Functions set `search_path = ''`.
- **User-facing error messages**, used verbatim:
  - Offline: `You're offline — this change wasn't saved.`
  - Other failures: `Couldn't save to your account. Try again.`
  - First-sync failure: `Couldn't move this device's progress — it's still saved here. Try signing in again.`
- **Data region.** The privacy page names the region as **Singapore (ap-southeast-1)**. The owner creates the Supabase project in that region.
- **Verification before each commit.** `npm test`, `npm run typecheck` and `npm run lint` must pass. Tasks that touch UI or routes also run `npm run e2e`. Task 2 also runs `npx supabase test db`.

## Review Focus

1. **One user can read or write another user's rows.** Expected: impossible, through tables, functions or Realtime. *Pinned by Task 2 pgTAP (`rls.test.sql`).*
2. **A guest with progress signs in and the upload fails midway.** Expected: local progress stays intact, and the app keeps working on the device. *Pinned by Task 5 (`first-sync.test.ts`, failure cases).*
3. **A signed-in write fails because the device is offline.** Expected: the UI rolls back to the true state and shows the offline message. *Pinned by Task 4 (`supabase-store.test.ts`, rollback).*
4. **Two devices on the same day.** Expected: activity counts add up instead of being overwritten. *Pinned by Task 2 pgTAP (`functions.test.sql`) and Task 4 (fake parity).*
5. **The site is built with no Supabase environment variables.** Expected: the guest-only app is unchanged and shows no Sign in button. *Pinned by Task 5 (`auth-state.test.ts`) and the unchanged guest e2e flows.*

---

## File map

| Area | Files |
|---|---|
| Store layer | `src/lib/store/types.ts` (`subscribe`), `src/lib/store/context.tsx` (`useLive`, `StoreProvider`), `src/lib/store/mutations.ts` (new), `src/lib/store/dexie-store.ts` (uses mutations, `subscribe`, `clearAll`), `src/lib/store/null-store.ts`, `src/lib/store/store-contract.ts` (new), `src/lib/store/supabase-store.ts` (new), `src/lib/store/first-sync.ts` (new) |
| Supabase | `supabase/config.toml`, `supabase/migrations/20261011000000_phase1_accounts.sql`, `supabase/tests/rls.test.sql`, `supabase/tests/functions.test.sql`, `src/lib/supabase/client.ts`, `src/lib/supabase/rows.ts`, `src/lib/supabase/remote-api.ts`, `src/lib/supabase/fake-remote-api.ts` |
| Auth | `src/lib/auth/context.tsx`, `src/lib/auth/auth-state.ts`, `src/app/auth/callback/page.tsx`, `src/components/auth/*` |
| UI | `src/components/app-shell.tsx`, `src/components/status-banners.tsx`, `src/components/providers.tsx`, `src/components/settings/settings-view.tsx`, `src/components/settings/account-section.tsx`, `src/app/privacy/page.tsx` |
| Build, CI, docs | `package.json`, `playwright.config.ts`, `.github/workflows/ci.yml`, `.env.example`, `CONTRIBUTING.md`, `README.md`, `docs/roadmap.md` |

---

### Task 1: Store notifications, store-agnostic `useLive`, shared mutations and a contract suite

This task changes no behaviour. It prepares the store layer for a second implementation.

**Files:**
- Create: `src/lib/store/mutations.ts`, `src/lib/store/mutations.test.ts`, `src/lib/store/store-contract.ts`
- Modify: `src/lib/store/types.ts`, `src/lib/store/dexie-store.ts`, `src/lib/store/null-store.ts`, `src/lib/store/context.tsx`, `src/lib/store/dexie-store.test.ts`, `package.json` (remove `dexie-react-hooks`)

**Interfaces:**
- Produces:

```ts
// types.ts — added to Store
subscribe(onChange: () => void): () => void
// mutations.ts
export type ActivityField = 'reviews' | 'solves' | 'trains'
export interface WriteSet {
  progress?: ProblemProgress; note?: Note; card?: ReviewCard; log?: ReviewLog; attempt?: TrainAttempt
  bump?: { date: string; field: ActivityField }
}
export function solveWrites(prev: { progress?: ProblemProgress; note?: Note; card?: ReviewCard }, slug: string, solveRating: SolveRating, insight: string, now: Date, desiredRetention: number): WriteSet
export function reviewWrites(prev: { progress?: ProblemProgress; card?: ReviewCard }, slug: string, rating: ReviewRating, now: Date, desiredRetention: number): WriteSet
export function noteWrite(note: Omit<Note, 'updatedAt'>, now: Date): Note
export function trainWrites(attempt: Omit<TrainAttempt, 'id'>): WriteSet
export function applyBump(current: Activity | undefined, bump: { date: string; field: ActivityField }): Activity
export function sortUserData(data: UserData): UserData   // the sort DexieStore.getUserData applies today
// store-contract.ts
export function runStoreContract(name: string, makeStore: () => Promise<Store>): void
// DexieStore — extra (not on Store)
clearAll(): Promise<void>
```

- [ ] **Step 1: Write the failing mutation tests**

Create `src/lib/store/mutations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { localDate } from '@/lib/logic/dates'
import { applyBump, noteWrite, reviewWrites, solveWrites, sortUserData, trainWrites } from './mutations'

const now = new Date(2026, 9, 3, 9)

describe('mutations', () => {
  it('solveWrites builds progress, note, card, log and a solves bump', () => {
    const w = solveWrites({}, 'two-sum', 'alone', '  map value to index  ', now, 0.9)
    expect(w.progress).toMatchObject({ slug: 'two-sum', status: 'solved', solveRating: 'alone', needsResolve: false, firstSolvedAt: now.toISOString(), updatedAt: now.toISOString() })
    expect(w.note).toMatchObject({ slug: 'two-sum', insight: 'map value to index', approach: '', updatedAt: now.toISOString() })
    expect(Date.parse(w.card!.due)).toBeGreaterThan(now.getTime())
    expect(w.log).toMatchObject({ slug: 'two-sum', kind: 'solve', reviewedAt: now.toISOString() })
    expect(w.bump).toEqual({ date: localDate(now), field: 'solves' })
  })

  it('solveWrites keeps firstSolvedAt and the existing note fields', () => {
    const prev = {
      progress: { slug: 's', status: 'solved' as const, solveRating: 'hint' as const, firstSolvedAt: '2026-01-01T00:00:00.000Z', needsResolve: true, updatedAt: '2026-01-01T00:00:00.000Z' },
      note: { slug: 's', insight: 'old', approach: 'two passes', complexity: '', mistakes: '', code: '', updatedAt: '2026-01-01T00:00:00.000Z' },
    }
    const w = solveWrites(prev, 's', 'alone', 'new insight', now, 0.9)
    expect(w.progress?.firstSolvedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(w.progress?.needsResolve).toBe(false)
    expect(w.note?.approach).toBe('two passes')
  })

  it('solveWrites rejects an invalid insight', () => {
    expect(() => solveWrites({}, 's', 'alone', '   ', now, 0.9)).toThrow('Write the key insight in one line.')
  })

  it('reviewWrites reschedules, logs, flags needsResolve on again, and bumps reviews', () => {
    const solved = solveWrites({}, 's', 'alone', 'insight', now, 0.9)
    const later = new Date(2026, 9, 20, 9)
    const w = reviewWrites({ progress: solved.progress, card: solved.card }, 's', 'again', later, 0.9)
    expect(w.log).toMatchObject({ kind: 'review', rating: 'again' })
    expect(w.progress?.needsResolve).toBe(true)
    expect(w.bump).toEqual({ date: localDate(later), field: 'reviews' })
  })

  it('reviewWrites throws without a card', () => {
    expect(() => reviewWrites({}, 's', 'good', now, 0.9)).toThrow('No review card for "s"')
  })

  it('noteWrite validates and stamps', () => {
    const n = noteWrite({ slug: 's', insight: ' x ', approach: '', complexity: '', mistakes: '', code: '' }, now)
    expect(n).toMatchObject({ insight: 'x', updatedAt: now.toISOString() })
  })

  it('trainWrites assigns an id and bumps trains on the attempt date', () => {
    const at = now.toISOString()
    const w = trainWrites({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'tp', correct: true, at })
    expect(w.attempt?.id).toMatch(/[0-9a-f-]{36}/)
    expect(w.bump).toEqual({ date: localDate(now), field: 'trains' })
  })

  it('applyBump starts at zero and increments one field', () => {
    expect(applyBump(undefined, { date: '2026-10-03', field: 'solves' })).toEqual({ date: '2026-10-03', reviews: 0, solves: 1, trains: 0 })
    expect(applyBump({ date: '2026-10-03', reviews: 2, solves: 1, trains: 0 }, { date: '2026-10-03', field: 'reviews' }).reviews).toBe(3)
  })

  it('sortUserData sorts every collection by its key', () => {
    const meta = { schemaVersion: 1, settings: { desiredRetention: 0.9, theme: 'system' as const } }
    const sorted = sortUserData({
      progress: [{ slug: 'b' }, { slug: 'a' }] as never, notes: [], cards: [], reviewLogs: [{ id: '2' }, { id: '1' }] as never,
      trainAttempts: [], activity: [{ date: '2026-10-02' }, { date: '2026-10-01' }] as never, meta,
    })
    expect(sorted.progress.map((p) => p.slug)).toEqual(['a', 'b'])
    expect(sorted.reviewLogs.map((l) => l.id)).toEqual(['1', '2'])
    expect(sorted.activity.map((a) => a.date)).toEqual(['2026-10-01', '2026-10-02'])
  })
})
```

Run `npx vitest run src/lib/store/mutations.test.ts`. Expected: FAIL, because the module does not exist.

- [ ] **Step 2: Implement `src/lib/store/mutations.ts`**

Move the logic out of `DexieStore` unchanged:

```ts
import { localDate } from '@/lib/logic/dates'
import { initialReviewRating, newCard, scheduleReview } from '@/lib/logic/fsrs'
import { validateInsight } from '@/lib/logic/insight'
import type {
  Activity, Note, ProblemProgress, ReviewCard, ReviewLog, ReviewRating, SolveRating, TrainAttempt, UserData,
} from '@/lib/types'

export type ActivityField = 'reviews' | 'solves' | 'trains'

/** The rows one user action writes. Both stores apply a WriteSet; neither re-implements the rules. */
export interface WriteSet {
  progress?: ProblemProgress
  note?: Note
  card?: ReviewCard
  log?: ReviewLog
  attempt?: TrainAttempt
  bump?: { date: string; field: ActivityField }
}

const emptyNote = (slug: string): Omit<Note, 'updatedAt'> => ({ slug, insight: '', approach: '', complexity: '', mistakes: '', code: '' })

function checkedInsight(insight: string): string {
  const valid = validateInsight(insight)
  if (!valid.ok) throw new Error(valid.error)
  return valid.value
}

export function solveWrites(
  prev: { progress?: ProblemProgress; note?: Note; card?: ReviewCard },
  slug: string, solveRating: SolveRating, insight: string, now: Date, desiredRetention: number,
): WriteSet {
  const text = checkedInsight(insight)
  const at = now.toISOString()
  const rating = initialReviewRating(solveRating)
  const card = scheduleReview(prev.card?.card ?? newCard(now), rating, now, desiredRetention)
  return {
    progress: { slug, status: 'solved', solveRating, firstSolvedAt: prev.progress?.firstSolvedAt ?? at, needsResolve: false, updatedAt: at },
    note: { ...(prev.note ?? emptyNote(slug)), insight: text, updatedAt: at },
    card: { slug, card, due: card.due, updatedAt: at },
    log: { id: crypto.randomUUID(), slug, rating, reviewedAt: at, kind: 'solve' },
    bump: { date: localDate(now), field: 'solves' },
  }
}

export function reviewWrites(
  prev: { progress?: ProblemProgress; card?: ReviewCard },
  slug: string, rating: ReviewRating, now: Date, desiredRetention: number,
): WriteSet {
  if (!prev.card) throw new Error(`No review card for "${slug}"`)
  const at = now.toISOString()
  const card = scheduleReview(prev.card.card, rating, now, desiredRetention)
  return {
    card: { slug, card, due: card.due, updatedAt: at },
    log: { id: crypto.randomUUID(), slug, rating, reviewedAt: at, kind: 'review' },
    ...(prev.progress ? { progress: { ...prev.progress, needsResolve: rating === 'again', updatedAt: at } } : {}),
    bump: { date: localDate(now), field: 'reviews' },
  }
}

export function noteWrite(note: Omit<Note, 'updatedAt'>, now: Date): Note {
  return { ...note, insight: checkedInsight(note.insight), updatedAt: now.toISOString() }
}

export function trainWrites(attempt: Omit<TrainAttempt, 'id'>): WriteSet {
  return { attempt: { ...attempt, id: crypto.randomUUID() }, bump: { date: localDate(new Date(attempt.at)), field: 'trains' } }
}

export function applyBump(current: Activity | undefined, bump: { date: string; field: ActivityField }): Activity {
  const base = current ?? { date: bump.date, reviews: 0, solves: 0, trains: 0 }
  return { ...base, [bump.field]: base[bump.field] + 1 }
}

export function sortUserData(data: UserData): UserData {
  const by = <T>(key: (x: T) => string) => (a: T, b: T) => key(a).localeCompare(key(b))
  return {
    progress: [...data.progress].sort(by((x) => x.slug)),
    notes: [...data.notes].sort(by((x) => x.slug)),
    cards: [...data.cards].sort(by((x) => x.slug)),
    reviewLogs: [...data.reviewLogs].sort(by((x) => x.id)),
    trainAttempts: [...data.trainAttempts].sort(by((x) => x.id)),
    activity: [...data.activity].sort(by((x) => x.date)),
    meta: data.meta,
  }
}
```

Run the test. Expected: PASS.

- [ ] **Step 3: Add `subscribe` to `Store` and to all implementations; refactor `DexieStore` onto the mutations**

In `src/lib/store/types.ts`, add this to `interface Store`:

```ts
  /** Calls `onChange` after any change visible to this store (own writes, other tabs, other devices). Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void
```

In `null-store.ts`, add `subscribe = (_onChange: () => void) => () => {}`.

In `dexie-store.ts`:
- **`subscribe`** uses Dexie's global `storagemutated` event. It fires for this tab's writes and for other tabs' writes:

  ```ts
  import Dexie from 'dexie'
  // …
  subscribe(onChange: () => void): () => void {
    const listener = () => onChange()
    Dexie.on('storagemutated', listener)
    return () => Dexie.on('storagemutated').unsubscribe(listener)
  }
  ```

- **`markSolved`, `recordReview`, `saveNote` and `recordTrainAttempt`** compute their rows with the `mutations.ts` functions. They read `prev` inside the same Dexie transaction they write in, as today, and write the `WriteSet`:
  - `bulkPut`/`put` for `progress`, `note` and `card`
  - `add` for `log` and `attempt`
  - for `bump`: `const current = await db.activity.get(bump.date); await db.activity.put(applyBump(current, bump))`

  Behaviour must stay identical.
- **`getUserData`** uses `sortUserData`.
- **Add `async clearAll(): Promise<void>`:** clear every table in one `rw` transaction, including `meta`.

- [ ] **Step 4: Rewrite `useLive` without `dexie-react-hooks`**

In `src/lib/store/context.tsx`, replace the `useLive` implementation and remove the `dexie-react-hooks` import:

```ts
/** Runs `query` against the current store and re-runs it whenever the store reports a change (or the store/deps change). */
export function useLive<T>(query: (store: Store) => Promise<T>, deps: unknown[] = []): T | undefined {
  const store = useStore()
  const queryRef = useRef(query)
  queryRef.current = query
  const [result, setResult] = useState<{ store: Store; value: T } | undefined>(undefined)

  useEffect(() => {
    let alive = true
    let latest = 0
    const run = () => {
      const id = ++latest
      queryRef.current(store).then(
        (value) => { if (alive && id === latest) setResult({ store, value }) },
        (err) => { if (alive && id === latest) console.error(err) },
      )
    }
    run()
    const unsubscribe = store.subscribe(run)
    return () => { alive = false; unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])

  return result && result.store === store ? result.value : undefined
}
```

Import `useRef` from React. Then run `npm uninstall dexie-react-hooks`.

- [ ] **Step 5: Extract the store contract suite**

Create `src/lib/store/store-contract.ts` with `export function runStoreContract(name: string, makeStore: () => Promise<Store>)`. It wraps a `describe(\`${name} contract\`, …)` and contains, using only `Store` methods, these behavioural tests moved out of `dexie-store.test.ts`:

| Test | Source |
|---|---|
| `markSolved` creates progress, note, scheduled card, log and activity | Dexie lines 17–27 |
| Rejects an invalid insight without writing anything | lines 29–33 |
| Re-solving keeps history | lines 35–48 |
| Lists due cards and records reviews | lines 52–60 |
| Throws when reviewing with no card | line 62+ |
| Validates insight on `saveNote` | line 68+ |
| Records train attempts with activity | line 73+ |
| Returns default meta and saves settings and backup time | line 79+ |
| `importAll` changes `importId` in both modes and ignores one in the file | line 88+ |
| Stamps the export time as `lastBackupAt` inside the file | line 116+ |
| Replace-imports into an empty store, and reviews still work afterwards | line 123+ |
| Merge-import twice is idempotent | line 133+ |
| Replace-import over a non-empty store discards rows not in the file | line 148+ |
| Merge keeps the newer record on both sides | line 168+ |

Add one new contract test:

```ts
it('notifies subscribers after a write', async () => {
  const store = await makeStore()
  let calls = 0
  const off = store.subscribe(() => { calls++ })
  await store.markSolved('two-sum', 'alone', 'map value to index', day(3))
  await new Promise((r) => setTimeout(r, 50))
  expect(calls).toBeGreaterThan(0)
  off()
})
```

`dexie-store.test.ts` keeps only the Dexie-specific tests:
- atomicity: a failing import rejects and leaves existing data intact
- `NullStore` behaviour
- a new test that `clearAll` empties the store (`hasData()` is false and `getMeta()` returns defaults)

It ends with:

```ts
runStoreContract('DexieStore', async () => new DexieStore(new LeetHubDB(`test-${crypto.randomUUID()}`)))
```

`store-contract.ts` imports `describe`, `it` and `expect` from `vitest`. It is not matched by the `*.test.ts` include, so it only runs through callers.

- [ ] **Step 6: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`.
- Expected: all green.
- The unit test count rises by the mutation tests plus the subscribe test. No assertion from the moved tests is dropped: compare the moved test names with the table above.

```bash
git add -A
git commit -m "refactor: store notifications, store-agnostic useLive, shared mutations and a store contract suite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Supabase schema, security and database tests

**Files:**
- Create: `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261011000000_phase1_accounts.sql`, `supabase/tests/rls.test.sql`, `supabase/tests/functions.test.sql`
- Modify: `package.json` (dev dependency `supabase`, scripts `db:start`, `db:test`), `.github/workflows/ci.yml` (job `db`), `.gitignore` (`supabase/.temp`, `supabase/.branches`)

**Interfaces:**
- Produces:
  - tables `profiles`, `progress`, `notes`, `cards`, `review_logs`, `train_attempts` and `activity`
  - functions `apply_changes(payload jsonb)`, `replace_all(payload jsonb)` and `delete_my_account()`, whose payload keys are given in Step 2
  - a Realtime publication covering all seven tables

- [ ] **Step 1: Scaffold**

```bash
npm install -D supabase
npx supabase init --with-vscode-settings=false   # creates supabase/config.toml; answer no to IDE prompts
```

- In `supabase/config.toml`, set `project_id = "cs-atlas"`. Leave the defaults otherwise.
- Add these `package.json` scripts:
  - `"db:start": "supabase start -x studio,imgproxy,edge-runtime,logflare,vector,storage-api,mailpit,supavisor"`
  - `"db:test": "supabase test db"`
- Append `supabase/.temp` and `supabase/.branches` to `.gitignore`.

Docker must be running. Run `npm run db:start`. Expected: the local stack starts (Postgres, auth, realtime and REST).

- [ ] **Step 2: Write the migration `supabase/migrations/20261011000000_phase1_accounts.sql`**

```sql
-- Phase 1: per-user learning data. Field names mirror the v1 TypeScript storage types in snake_case.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  settings jsonb not null default '{"desiredRetention":0.9,"theme":"system"}'::jsonb,
  last_backup_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  status text not null check (status in ('unsolved', 'solved')),
  solve_rating text check (solve_rating in ('alone', 'hint', 'solution')),
  first_solved_at timestamptz,
  needs_resolve boolean not null default false,
  updated_at timestamptz not null,
  primary key (user_id, slug)
);

create table public.notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  insight text not null default '',
  approach text not null default '',
  complexity text not null default '',
  mistakes text not null default '',
  code text not null default '',
  updated_at timestamptz not null,
  primary key (user_id, slug)
);

create table public.cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  card jsonb not null,
  due timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, slug)
);
create index cards_user_due on public.cards (user_id, due);

-- Log ids come from the client (crypto.randomUUID or backup files), so they are unique per user only.
create table public.review_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  slug text not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz not null,
  kind text check (kind in ('solve', 'review')),
  primary key (user_id, id)
);
create index review_logs_user_slug on public.review_logs (user_id, slug);

create table public.train_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  problem_slug text not null,
  correct_pattern text not null,
  chosen_pattern text not null,
  correct boolean not null,
  at timestamptz not null,
  primary key (user_id, id)
);
create index train_attempts_user_at on public.train_attempts (user_id, at);

create table public.activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  reviews int not null default 0 check (reviews >= 0),
  solves int not null default 0 check (solves >= 0),
  trains int not null default 0 check (trains >= 0),
  primary key (user_id, date)
);

-- Row-level security: each user sees and writes only their own rows. anon gets nothing.
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.notes enable row level security;
alter table public.cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.train_attempts enable row level security;
alter table public.activity enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy progress_select on public.progress for select to authenticated using (user_id = (select auth.uid()));
create policy progress_insert on public.progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy progress_update on public.progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy progress_delete on public.progress for delete to authenticated using (user_id = (select auth.uid()));

create policy notes_select on public.notes for select to authenticated using (user_id = (select auth.uid()));
create policy notes_insert on public.notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy notes_update on public.notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notes_delete on public.notes for delete to authenticated using (user_id = (select auth.uid()));

create policy cards_select on public.cards for select to authenticated using (user_id = (select auth.uid()));
create policy cards_insert on public.cards for insert to authenticated with check (user_id = (select auth.uid()));
create policy cards_update on public.cards for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cards_delete on public.cards for delete to authenticated using (user_id = (select auth.uid()));

-- Logs and attempts are append-only for clients; only replace_all (security definer) and account deletion remove them.
create policy review_logs_select on public.review_logs for select to authenticated using (user_id = (select auth.uid()));
create policy review_logs_insert on public.review_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy train_attempts_select on public.train_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy train_attempts_insert on public.train_attempts for insert to authenticated with check (user_id = (select auth.uid()));

create policy activity_select on public.activity for select to authenticated using (user_id = (select auth.uid()));
create policy activity_insert on public.activity for insert to authenticated with check (user_id = (select auth.uid()));
create policy activity_update on public.activity for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy activity_delete on public.activity for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.progress, public.notes, public.cards, public.review_logs, public.train_attempts, public.activity from anon;

-- A profile row for every new user, filled from the OAuth metadata (GitHub: name/avatar_url, Google: full_name/picture).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- One user action = one transaction. Any user_id in the payload is ignored; rows always belong to the caller.
create function public.apply_changes(payload jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;

  insert into public.progress (user_id, slug, status, solve_rating, first_solved_at, needs_resolve, updated_at)
  select uid, r.slug, r.status, r.solve_rating, r.first_solved_at, coalesce(r.needs_resolve, false), r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'progress', '[]'::jsonb))
    as r (slug text, status text, solve_rating text, first_solved_at timestamptz, needs_resolve boolean, updated_at timestamptz)
  on conflict (user_id, slug) do update set
    status = excluded.status, solve_rating = excluded.solve_rating, first_solved_at = excluded.first_solved_at,
    needs_resolve = excluded.needs_resolve, updated_at = excluded.updated_at;

  insert into public.notes (user_id, slug, insight, approach, complexity, mistakes, code, updated_at)
  select uid, r.slug, coalesce(r.insight, ''), coalesce(r.approach, ''), coalesce(r.complexity, ''),
         coalesce(r.mistakes, ''), coalesce(r.code, ''), r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'notes', '[]'::jsonb))
    as r (slug text, insight text, approach text, complexity text, mistakes text, code text, updated_at timestamptz)
  on conflict (user_id, slug) do update set
    insight = excluded.insight, approach = excluded.approach, complexity = excluded.complexity,
    mistakes = excluded.mistakes, code = excluded.code, updated_at = excluded.updated_at;

  insert into public.cards (user_id, slug, card, due, updated_at)
  select uid, r.slug, r.card, r.due, r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'cards', '[]'::jsonb))
    as r (slug text, card jsonb, due timestamptz, updated_at timestamptz)
  on conflict (user_id, slug) do update set card = excluded.card, due = excluded.due, updated_at = excluded.updated_at;

  insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind)
  select uid, r.id, r.slug, r.rating, r.reviewed_at, r.kind
  from jsonb_to_recordset(coalesce(payload -> 'review_logs', '[]'::jsonb))
    as r (id text, slug text, rating text, reviewed_at timestamptz, kind text)
  on conflict (user_id, id) do nothing;

  insert into public.train_attempts (user_id, id, problem_slug, correct_pattern, chosen_pattern, correct, at)
  select uid, r.id, r.problem_slug, r.correct_pattern, r.chosen_pattern, r.correct, r.at
  from jsonb_to_recordset(coalesce(payload -> 'train_attempts', '[]'::jsonb))
    as r (id text, problem_slug text, correct_pattern text, chosen_pattern text, correct boolean, at timestamptz)
  on conflict (user_id, id) do nothing;

  insert into public.activity (user_id, date, reviews, solves, trains)
  select uid, r.date, coalesce(r.reviews, 0), coalesce(r.solves, 0), coalesce(r.trains, 0)
  from jsonb_to_recordset(coalesce(payload -> 'activity_increments', '[]'::jsonb))
    as r (date date, reviews int, solves int, trains int)
  on conflict (user_id, date) do update set
    reviews = public.activity.reviews + excluded.reviews,
    solves = public.activity.solves + excluded.solves,
    trains = public.activity.trains + excluded.trains;

  if payload ? 'profile' then
    insert into public.profiles (user_id, settings, last_backup_at)
    values (
      uid,
      coalesce(payload -> 'profile' -> 'settings', '{"desiredRetention":0.9,"theme":"system"}'::jsonb),
      (payload -> 'profile' ->> 'last_backup_at')::timestamptz
    )
    on conflict (user_id) do update set
      settings = coalesce(payload -> 'profile' -> 'settings', public.profiles.settings),
      last_backup_at = coalesce((payload -> 'profile' ->> 'last_backup_at')::timestamptz, public.profiles.last_backup_at);
  end if;
end $$;

-- Replace everything the caller owns with a full data set (backup "replace" and first sign-in upload).
-- security definer so it can clear append-only tables; every statement is scoped to auth.uid().
create function public.replace_all(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;

  delete from public.progress where user_id = uid;
  delete from public.notes where user_id = uid;
  delete from public.cards where user_id = uid;
  delete from public.review_logs where user_id = uid;
  delete from public.train_attempts where user_id = uid;
  delete from public.activity where user_id = uid;

  insert into public.progress (user_id, slug, status, solve_rating, first_solved_at, needs_resolve, updated_at)
  select uid, r.slug, r.status, r.solve_rating, r.first_solved_at, coalesce(r.needs_resolve, false), r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'progress', '[]'::jsonb))
    as r (slug text, status text, solve_rating text, first_solved_at timestamptz, needs_resolve boolean, updated_at timestamptz);

  insert into public.notes (user_id, slug, insight, approach, complexity, mistakes, code, updated_at)
  select uid, r.slug, coalesce(r.insight, ''), coalesce(r.approach, ''), coalesce(r.complexity, ''),
         coalesce(r.mistakes, ''), coalesce(r.code, ''), r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'notes', '[]'::jsonb))
    as r (slug text, insight text, approach text, complexity text, mistakes text, code text, updated_at timestamptz);

  insert into public.cards (user_id, slug, card, due, updated_at)
  select uid, r.slug, r.card, r.due, r.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'cards', '[]'::jsonb))
    as r (slug text, card jsonb, due timestamptz, updated_at timestamptz);

  insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind)
  select uid, r.id, r.slug, r.rating, r.reviewed_at, r.kind
  from jsonb_to_recordset(coalesce(payload -> 'review_logs', '[]'::jsonb))
    as r (id text, slug text, rating text, reviewed_at timestamptz, kind text)
  on conflict (user_id, id) do nothing;

  insert into public.train_attempts (user_id, id, problem_slug, correct_pattern, chosen_pattern, correct, at)
  select uid, r.id, r.problem_slug, r.correct_pattern, r.chosen_pattern, r.correct, r.at
  from jsonb_to_recordset(coalesce(payload -> 'train_attempts', '[]'::jsonb))
    as r (id text, problem_slug text, correct_pattern text, chosen_pattern text, correct boolean, at timestamptz)
  on conflict (user_id, id) do nothing;

  insert into public.activity (user_id, date, reviews, solves, trains)
  select uid, r.date, coalesce(r.reviews, 0), coalesce(r.solves, 0), coalesce(r.trains, 0)
  from jsonb_to_recordset(coalesce(payload -> 'activity', '[]'::jsonb))
    as r (date date, reviews int, solves int, trains int);

  insert into public.profiles (user_id, settings, last_backup_at)
  values (
    uid,
    coalesce(payload -> 'profile' -> 'settings', '{"desiredRetention":0.9,"theme":"system"}'::jsonb),
    (payload -> 'profile' ->> 'last_backup_at')::timestamptz
  )
  on conflict (user_id) do update set
    settings = coalesce(payload -> 'profile' -> 'settings', public.profiles.settings),
    last_backup_at = (payload -> 'profile' ->> 'last_backup_at')::timestamptz;
end $$;

-- Deleting the auth user cascades to every table above.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.apply_changes(jsonb), public.replace_all(jsonb), public.delete_my_account() from public, anon;
grant execute on function public.apply_changes(jsonb), public.replace_all(jsonb), public.delete_my_account() to authenticated;

alter publication supabase_realtime add table
  public.profiles, public.progress, public.notes, public.cards, public.review_logs, public.train_attempts, public.activity;
```

Run `npx supabase db reset`. Expected: the migration applies with no errors.

- [ ] **Step 3: Write the pgTAP tests**

`supabase/tests/rls.test.sql`:

```sql
begin;
select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ann@example.com', '{"full_name":"Ann","avatar_url":"https://a.example/ann.png"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"name":"Bob","picture":"https://a.example/bob.png"}');

-- Profiles are created by the trigger from OAuth metadata (GitHub and Google shapes).
select is((select display_name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'), 'Ann', 'trigger fills full_name');
select is((select avatar_url from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'), 'https://a.example/bob.png', 'trigger fills picture');

-- Bob owns one row in every data table.
insert into public.progress values ('22222222-2222-2222-2222-222222222222', 'two-sum', 'solved', 'alone', now(), false, now());
insert into public.notes (user_id, slug, insight, updated_at) values ('22222222-2222-2222-2222-222222222222', 'two-sum', 'bob insight', now());
insert into public.cards values ('22222222-2222-2222-2222-222222222222', 'two-sum', '{}'::jsonb, now(), now());
insert into public.review_logs values ('22222222-2222-2222-2222-222222222222', 'log-b', 'two-sum', 'good', now(), 'review');
insert into public.train_attempts values ('22222222-2222-2222-2222-222222222222', 'att-b', 'two-sum', 'tp', 'tp', true, now());
insert into public.activity values ('22222222-2222-2222-2222-222222222222', current_date, 1, 1, 1);

-- As Ann:
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*) from public.progress)::int, 0, 'ann cannot see bob progress');
select is((select count(*) from public.notes)::int, 0, 'ann cannot see bob notes');
select is((select count(*) from public.cards)::int, 0, 'ann cannot see bob cards');
select is((select count(*) from public.review_logs)::int, 0, 'ann cannot see bob logs');
select is((select count(*) from public.train_attempts)::int, 0, 'ann cannot see bob attempts');
select is((select count(*) from public.activity)::int, 0, 'ann cannot see bob activity');
select is((select count(*) from public.profiles)::int, 1, 'ann sees only her own profile');

select throws_ok(
  $$ insert into public.progress values ('22222222-2222-2222-2222-222222222222', 'x', 'solved', null, null, false, now()) $$,
  '42501', null, 'ann cannot insert rows for bob');
update public.notes set insight = 'hacked' where user_id = '22222222-2222-2222-2222-222222222222';
delete from public.cards where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
select is((select insight from public.notes where user_id = '22222222-2222-2222-2222-222222222222'), 'bob insight', 'ann update of bob note had no effect');
select is((select count(*) from public.cards where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'ann delete of bob card had no effect');

-- Ann cannot delete or update logs at all (append-only for clients).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.review_logs values ('11111111-1111-1111-1111-111111111111', 'log-a', 'two-sum', 'good', now(), 'review');
delete from public.review_logs where id = 'log-a';
select is((select count(*) from public.review_logs)::int, 1, 'clients cannot delete their own logs');

-- anon sees nothing and cannot call functions.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select count(*) from public.progress $$, '42501', null, 'anon cannot read progress');
select throws_ok($$ select public.apply_changes('{}'::jsonb) $$, '42501', null, 'anon cannot call apply_changes');
select throws_ok($$ select public.replace_all('{}'::jsonb) $$, '42501', null, 'anon cannot call replace_all');
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'anon cannot call delete_my_account');

select * from finish();
rollback;
```

`supabase/tests/functions.test.sql`:

```sql
begin;
select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ann@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');
insert into public.progress values ('22222222-2222-2222-2222-222222222222', 'two-sum', 'solved', 'alone', now(), false, now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- apply_changes writes one solve atomically and ignores a foreign user_id.
select lives_ok($$ select public.apply_changes('{
  "progress": [{"user_id":"22222222-2222-2222-2222-222222222222","slug":"two-sum","status":"solved","solve_rating":"alone","first_solved_at":"2026-10-03T02:00:00Z","needs_resolve":false,"updated_at":"2026-10-03T02:00:00Z"}],
  "notes": [{"slug":"two-sum","insight":"map value to index","updated_at":"2026-10-03T02:00:00Z"}],
  "cards": [{"slug":"two-sum","card":{"due":"2026-10-05T02:00:00Z"},"due":"2026-10-05T02:00:00Z","updated_at":"2026-10-03T02:00:00Z"}],
  "review_logs": [{"id":"log-1","slug":"two-sum","rating":"good","reviewed_at":"2026-10-03T02:00:00Z","kind":"solve"}],
  "activity_increments": [{"date":"2026-10-03","solves":1}]
}'::jsonb) $$, 'apply_changes accepts a solve');
select is((select count(*) from public.progress)::int, 1, 'ann has exactly her own progress row');
select is((select user_id from public.progress), '11111111-1111-1111-1111-111111111111'::uuid, 'payload user_id is ignored');

-- Activity increments add up across calls (two devices, same day).
select public.apply_changes('{"activity_increments":[{"date":"2026-10-03","solves":1,"reviews":2}]}'::jsonb);
select is((select solves from public.activity where date = '2026-10-03'), 2, 'solves added up');
select is((select reviews from public.activity where date = '2026-10-03'), 2, 'reviews added up');

-- Duplicate log ids are ignored.
select public.apply_changes('{"review_logs":[{"id":"log-1","slug":"two-sum","rating":"again","reviewed_at":"2026-10-04T02:00:00Z","kind":"review"}]}'::jsonb);
select is((select rating from public.review_logs where id = 'log-1'), 'good', 'duplicate log ignored');

-- Atomicity: a bad row late in the call (cards run after notes) rolls back the earlier writes too.
select throws_ok($$ select public.apply_changes('{
  "notes": [{"slug":"atomic","insight":"x","updated_at":"2026-10-03T02:00:00Z"}],
  "cards": [{"slug":"atomic","card":{},"due":null,"updated_at":"2026-10-03T02:00:00Z"}]
}'::jsonb) $$, '23502', null, 'card without due rejected');
select is((select count(*) from public.notes where slug = 'atomic')::int, 0, 'note from failed call rolled back');

-- Profile settings.
select public.apply_changes('{"profile":{"settings":{"desiredRetention":0.85,"theme":"dark"}}}'::jsonb);
select is((select settings ->> 'theme' from public.profiles), 'dark', 'settings saved');

-- replace_all replaces only the caller's rows, including append-only tables.
select public.replace_all('{
  "progress": [{"slug":"valid-anagram","status":"solved","solve_rating":"hint","needs_resolve":false,"updated_at":"2026-10-06T02:00:00Z"}],
  "activity": [{"date":"2026-10-06","reviews":0,"solves":1,"trains":0}],
  "profile": {"settings":{"desiredRetention":0.9,"theme":"light"}}
}'::jsonb);
select is((select array_agg(slug) from public.progress), array['valid-anagram'], 'ann progress replaced');
select is((select count(*) from public.review_logs)::int, 0, 'ann logs cleared by replace_all');

-- delete_my_account removes the user and every owned row; bob is untouched.
select public.delete_my_account();
reset role;
select is((select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann deleted');
select is(
  (select count(*) from public.progress where user_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.activity where user_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.progress where user_id = '22222222-2222-2222-2222-222222222222') - 1,
  0::bigint, 'ann rows gone, bob row kept');

select * from finish();
rollback;
```

Run `npm run db:test`. Expected: both files pass, with `rls.test.sql` at 17/17 and `functions.test.sql` at 13/13.

If a `throws_ok` SQLSTATE differs (for example `42501` vs `P0001`), check which error is actually raised and adjust only that expected code. The behaviour asserted must stay the same. Record the change in the report.

- [ ] **Step 4: Add the CI job**

Append to `.github/workflows/ci.yml` under `jobs:`:

```yaml
  db:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start -x studio,imgproxy,edge-runtime,logflare,vector,storage-api,mailpit,supavisor
      - run: supabase test db
```

- [ ] **Step 5: Commit**

```bash
npx supabase stop
git add -A
git commit -m "feat(db): Supabase schema, row-level security, write functions and pgTAP tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Supabase client, row mapping and `RemoteApi`

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/rows.ts`, `src/lib/supabase/rows.test.ts`, `src/lib/supabase/remote-api.ts`, `src/lib/supabase/fake-remote-api.ts`, `src/lib/supabase/fake-remote-api.test.ts`
- Modify: `package.json` (dependency `@supabase/supabase-js`)

**Interfaces:**
- Produces:

```ts
// client.ts
export function getSupabase(): SupabaseClient | null      // null when either NEXT_PUBLIC_SUPABASE_* is missing; memoised
// rows.ts
export interface Changes {
  progress?: ProblemProgress[]; notes?: Note[]; cards?: ReviewCard[]; reviewLogs?: ReviewLog[]; trainAttempts?: TrainAttempt[]
  activityIncrements?: Activity[]                         // counts to ADD per date
  profile?: { settings?: Settings; lastBackupAt?: string }
}
export function toApplyPayload(changes: Changes): Record<string, unknown>   // apply_changes payload (snake_case)
export function toReplacePayload(data: UserData): Record<string, unknown>   // replace_all payload
export function fromRows(rows: RemoteRows): UserData                         // RemoteRows = the 7 selects' results
// remote-api.ts
export interface RemoteApi {
  userId: string
  loadAll(): Promise<UserData>
  applyChanges(changes: Changes): Promise<void>
  replaceAll(data: UserData): Promise<void>
  deleteAccount(): Promise<void>
  onRemoteChange(cb: () => void): () => void
}
export function createRemoteApi(client: SupabaseClient, userId: string): RemoteApi
// fake-remote-api.ts
export class FakeRemoteApi implements RemoteApi   // in-memory, same semantics as the SQL functions
  // test helpers: failNext(error: Error), emitRemoteChange(), data (current server-side UserData)
```

- [ ] **Step 1: Install and create the client**

Run `npm install @supabase/supabase-js`. Then create `src/lib/supabase/client.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/** The browser Supabase client, or null when the site is built without Supabase config (guest-only). */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  cached = url && key
    ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : null
  return cached
}
```

`detectSessionInUrl: false` is deliberate. The `/auth/callback/` page exchanges the code itself (Task 6), so it never happens twice.

- [ ] **Step 2: Write the failing `rows.test.ts`**

It must cover:
- **Round trip:** a `UserData` fixture containing one of every record type (progress with and without the optional fields, a note, a card with a nested ts-fsrs object, a review log without `kind`, a train attempt, two activity days, and meta with settings and `lastBackupAt`). Pass it through `toReplacePayload`, then turn that payload into the row shapes `loadAll` would read back: the same snake_case keys, with `profile` mapped to a `profiles` row. Then `fromRows`. The result must `toEqual` the fixture after `sortUserData`, with `meta.schemaVersion === SCHEMA_VERSION`.
- **Key names:** `toApplyPayload({ trainAttempts: [a] }).train_attempts[0]` has keys exactly `id, problem_slug, correct_pattern, chosen_pattern, correct, at`.
- **Increments:** `toApplyPayload({ activityIncrements: [{ date, reviews: 0, solves: 1, trains: 0 }] })` produces `activity_increments`.
- **Normalised timestamps:** Postgres returns them as `2026-10-03T02:00:00+00:00`. `fromRows` must normalise every timestamp to `new Date(x).toISOString()`, because `dueCards` compares strings.

Run it. Expected: FAIL.

- [ ] **Step 3: Implement `rows.ts`**

- Write explicit mapper functions per collection. No generic camelCase conversion: the field list is short, and explicit mappers keep `card` (jsonb) untouched.
- `RemoteRows` is `{ profiles: ProfileRow[]; progress: ProgressRow[]; notes: NoteRow[]; cards: CardRow[]; review_logs: ReviewLogRow[]; train_attempts: TrainAttemptRow[]; activity: ActivityRow[] }`, with each `*Row` type mirroring the SQL columns from Task 2, without `user_id`.
- `fromRows` builds `meta` as `{ schemaVersion: SCHEMA_VERSION, settings: profile?.settings ?? DEFAULT_SETTINGS, ...(profile?.last_backup_at ? { lastBackupAt: iso(profile.last_backup_at) } : {}) }`.
- Optional TypeScript fields that are SQL `null` are omitted, not set to `undefined`, so the result `toEqual`s the v1 shapes.
- `toReplacePayload(data)` includes `profile: { settings: data.meta.settings, last_backup_at: data.meta.lastBackupAt ?? null }`.

Run the test. Expected: PASS.

- [ ] **Step 4: Implement `remote-api.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserData } from '@/lib/types'
import { fromRows, toApplyPayload, toReplacePayload, type Changes, type RemoteRows } from './rows'

export interface RemoteApi {
  userId: string
  loadAll(): Promise<UserData>
  applyChanges(changes: Changes): Promise<void>
  replaceAll(data: UserData): Promise<void>
  deleteAccount(): Promise<void>
  onRemoteChange(cb: () => void): () => void
}

const TABLES = ['profiles', 'progress', 'notes', 'cards', 'review_logs', 'train_attempts', 'activity'] as const

export function createRemoteApi(client: SupabaseClient, userId: string): RemoteApi {
  const check = (error: { message: string } | null) => { if (error) throw new Error(error.message) }
  return {
    userId,
    async loadAll() {
      const results = await Promise.all(TABLES.map((t) => client.from(t).select('*')))
      const rows = {} as Record<(typeof TABLES)[number], unknown[]>
      TABLES.forEach((t, i) => {
        check(results[i].error)
        rows[t] = results[i].data ?? []
      })
      return fromRows(rows as unknown as RemoteRows)
    },
    async applyChanges(changes) {
      check((await client.rpc('apply_changes', { payload: toApplyPayload(changes) })).error)
    },
    async replaceAll(data) {
      check((await client.rpc('replace_all', { payload: toReplacePayload(data) })).error)
    },
    async deleteAccount() {
      check((await client.rpc('delete_my_account')).error)
    },
    onRemoteChange(cb) {
      const channel = client.channel(`user-${userId}`)
      for (const table of TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => cb())
      }
      channel.subscribe()
      return () => { void client.removeChannel(channel) }
    },
  }
}
```

There are no unit tests for this file: it is a thin wrapper, and the SQL behaviour is covered by Task 2. The manual sign-off exercises it end to end. Typecheck must pass.

- [ ] **Step 5: Implement `FakeRemoteApi`, with tests that pin its parity with the SQL**

Its server-side state is a `UserData`.
- `applyChanges` **upserts** `progress`, `notes` and `cards` by slug.
- It inserts `reviewLogs` and `trainAttempts`, **ignoring duplicate ids**.
- It **adds** `activityIncrements` to the existing counts per date.
- It merges `profile.settings` and `lastBackupAt` into `meta`.
- `replaceAll` replaces everything except `meta.settings` when the data has none; it always has, in practice.
- `loadAll` returns a deep copy, sorted with `sortUserData`.
- `deleteAccount` sets an internal `deleted` flag and empties the data.
- `onRemoteChange` registers listeners.

Test helpers:
- `failNext(err)` makes the next `applyChanges`, `replaceAll` or `loadAll` reject with `err`.
- `emitRemoteChange()` calls the listeners.
- `data` is a getter for the current state.
- `seed(data)` sets it.

`fake-remote-api.test.ts` mirrors the `functions.test.sql` behaviours:
- increments add up
- duplicate log ids are ignored
- upsert replaces a record
- `replaceAll` clears logs
- `failNext` rejects once, then works
- `loadAll` returns copies: mutating the result doesn't change `data`

- [ ] **Step 6: Verify and commit**

Run `npm test && npm run typecheck && npm run lint`. Expected: green.

```bash
git add -A
git commit -m "feat: Supabase client, row mapping, RemoteApi and an in-memory fake

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `SupabaseStore`

**Files:**
- Create: `src/lib/store/supabase-store.ts`, `src/lib/store/supabase-store.test.ts`
- Modify: `src/lib/store/index.ts` (export)

**Interfaces:**
- Consumes: `RemoteApi`, `Changes` and `FakeRemoteApi` (Task 3); `mutations.ts` and `runStoreContract` (Task 1).
- Produces:

```ts
export class SupabaseStore implements Store {
  constructor(remote: RemoteApi, initial: UserData, opts?: { refreshDebounceMs?: number })
  dispose(): void                       // stops Realtime + visibility listeners
  // + every Store method
}
export const OFFLINE_MESSAGE = "You're offline — this change wasn't saved."
export const SAVE_FAILED_MESSAGE = "Couldn't save to your account. Try again."
```

- [ ] **Step 1: Write the failing tests**

`src/lib/store/supabase-store.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeRemoteApi } from '@/lib/supabase/fake-remote-api'
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type UserData } from '@/lib/types'
import { runStoreContract } from './store-contract'
import { OFFLINE_MESSAGE, SAVE_FAILED_MESSAGE, SupabaseStore } from './supabase-store'

const empty = (): UserData => ({
  progress: [], notes: [], cards: [], reviewLogs: [], trainAttempts: [], activity: [],
  meta: { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS } },
})
const day = (d: number, h = 9) => new Date(2026, 9, d, h)
const stores: SupabaseStore[] = []
const make = (remote = new FakeRemoteApi('user-1'), initial = empty()) => {
  const s = new SupabaseStore(remote, initial, { refreshDebounceMs: 0 })
  stores.push(s)
  return s
}
afterEach(() => { stores.splice(0).forEach((s) => s.dispose()); vi.unstubAllGlobals() })

runStoreContract('SupabaseStore', async () => make())

describe('SupabaseStore writes', () => {
  it('applies writes to the snapshot and to the remote', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    await store.markSolved('two-sum', 'alone', 'map value to index', day(3))
    expect((await store.getProgress('two-sum'))?.status).toBe('solved')
    expect(remote.data.progress.map((p) => p.slug)).toEqual(['two-sum'])
    expect(remote.data.activity[0].solves).toBe(1)
  })

  it('rolls back and explains when offline', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    vi.stubGlobal('navigator', { onLine: false })
    remote.failNext(new Error('fetch failed'))
    await expect(store.markSolved('two-sum', 'alone', 'map value to index', day(3))).rejects.toThrow(OFFLINE_MESSAGE)
    expect(await store.getProgress('two-sum')).toBeUndefined()
    expect(await store.listActivity()).toEqual([])
  })

  it('rolls back with a generic message when online', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    vi.stubGlobal('navigator', { onLine: true })
    remote.failNext(new Error('500'))
    await expect(store.saveSettings({ desiredRetention: 0.8, theme: 'dark' })).rejects.toThrow(SAVE_FAILED_MESSAGE)
    expect((await store.getMeta()).settings.theme).toBe('system')
  })

  it('increments activity on the remote instead of overwriting it', async () => {
    const remote = new FakeRemoteApi('user-1')
    remote.seed({ ...empty(), activity: [{ date: '2026-10-03', reviews: 0, solves: 2, trains: 0 }] })
    const store = make(remote, await remote.loadAll())
    await store.markSolved('a', 'alone', 'insight a', day(3))
    expect(remote.data.activity.find((a) => a.date === '2026-10-03')?.solves).toBe(3)
  })
})

describe('SupabaseStore remote changes', () => {
  it('refreshes from the remote on a change event, notifies, and starts a new import generation', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    const before = (await store.getMasteryInputs()).importId
    let calls = 0
    store.subscribe(() => { calls++ })
    remote.seed({ ...empty(), progress: [{ slug: 'x', status: 'solved', solveRating: 'alone', firstSolvedAt: day(3).toISOString(), needsResolve: false, updatedAt: day(3).toISOString() }] })
    remote.emitRemoteChange()
    await vi.waitFor(async () => expect((await store.listProgress()).map((p) => p.slug)).toEqual(['x']))
    expect(calls).toBeGreaterThan(0)
    expect((await store.getMasteryInputs()).importId).not.toBe(before)
  })

  it('stops listening after dispose', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    store.dispose()
    remote.seed({ ...empty(), progress: [{ slug: 'x', status: 'unsolved', needsResolve: false, updatedAt: day(3).toISOString() }] })
    remote.emitRemoteChange()
    await new Promise((r) => setTimeout(r, 20))
    expect(await store.listProgress()).toEqual([])
  })
})

describe('SupabaseStore imports and account', () => {
  it('merge-import uploads the merged data with replaceAll', async () => {
    const remote = new FakeRemoteApi('user-1')
    const store = make(remote)
    await store.markSolved('a', 'alone', 'insight a', day(3))
    const file = await store.exportAll(day(4))
    const other = make(new FakeRemoteApi('user-2'))
    await other.importAll(file, 'merge')
    expect((await other.listProgress()).map((p) => p.slug)).toEqual(['a'])
  })

  it('getUserData reflects the snapshot and hasData counts progress or attempts', async () => {
    const store = make()
    expect(await store.hasData()).toBe(false)
    await store.recordTrainAttempt({ problemSlug: 'a', correctPattern: 'tp', chosenPattern: 'sw', correct: false, at: day(3).toISOString() })
    expect(await store.hasData()).toBe(true)
    expect((await store.getUserData()).trainAttempts).toHaveLength(1)
  })
})
```

Run `npx vitest run src/lib/store/supabase-store.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 2: Implement `SupabaseStore`**

**State.**
- `private data: UserData`, a sorted copy of `initial`, with `meta.importId = crypto.randomUUID()`.
- `private listeners = new Set<() => void>()`.

**Reads** come from `this.data`, with the same semantics as `DexieStore`:
- `dueCards(now)` filters by `due <= now.toISOString()` and sorts by `due`.
- `listReviewLogs(slug)` filters by slug and sorts by `reviewedAt`.
- `getMeta()` returns `this.data.meta`.
- `getMasteryInputs()` returns `{ progress, cards, attempts: trainAttempts, importId: meta.importId }`.
- `getUserData()` returns `sortUserData(copy)` without `importId` in meta.
- `exportAll` uses `buildExport`.
- `hasData` checks `progress.length + trainAttempts.length > 0`.

Return copies (`structuredClone`) from every list or get method, so callers can't mutate the snapshot.

**Writes** go through one private helper:

```ts
private async commit(writes: WriteSet | null, changes: Changes, patch?: (d: UserData) => void): Promise<void> {
  const before = this.data
  const next = structuredClone(before)
  if (writes) applyWriteSet(next, writes)        // upserts progress/note/card, appends log/attempt, applyBump on activity
  patch?.(next)
  this.data = next
  this.emit()
  try {
    await this.remote.applyChanges(changes)
  } catch {
    this.data = before
    this.emit()
    this.scheduleRefresh()                        // other in-flight writes may have landed; resync
    throw new Error(typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE_MESSAGE : SAVE_FAILED_MESSAGE)
  }
}
```

- `changesFromWriteSet(w)` maps a `WriteSet` to `Changes`, with `bump` becoming `activityIncrements: [{ date, reviews/solves/trains: 1 for the bumped field, 0 otherwise }]`.
- `markSolved`, `recordReview`, `saveNote` and `recordTrainAttempt` read `prev` from `this.data`, call the `mutations.ts` functions, and then call `commit`. Validation errors, such as an invalid insight or a missing card, throw before `commit`, so nothing changes.
- `saveSettings(settings)` calls `commit(null, { profile: { settings } }, (d) => { d.meta.settings = settings })`.
- `markBackedUp(now)` does the same with `lastBackupAt`.

**Imports.**
- `importAll(file, mode)`: `const data = mode === 'replace' ? file.data : mergeUserData(this.getUserDataSync(), file.data)`, then `await this.remote.replaceAll(data)`.
- On success, `this.data = sorted copy of data` with `meta.schemaVersion = SCHEMA_VERSION` and a new `importId`, then `emit()`.
- On failure, throw `SAVE_FAILED_MESSAGE` or `OFFLINE_MESSAGE` as in `commit`; the snapshot is unchanged.

**Refresh.**
- `scheduleRefresh()` debounces by `opts.refreshDebounceMs ?? 300`.
- It then runs `this.remote.loadAll()` and, if not disposed, sets `this.data = { ...loaded, meta: { ...loaded.meta, importId: crypto.randomUUID() } }` and emits.
- A failed refresh is ignored (`console.warn`). The next event retries.

**Lifecycle.**
- The constructor calls `this.offRemote = remote.onRemoteChange(() => this.scheduleRefresh())`.
- In a browser (`typeof document !== 'undefined'`), it adds a `visibilitychange` listener that calls `scheduleRefresh()` when `document.visibilityState === 'visible'`.
- `dispose()` removes both listeners, clears the timer and sets `disposed = true`.

**Subscriptions.** `subscribe(cb)` adds to `listeners` and returns a delete function. `emit()` calls every listener.

Export `SupabaseStore`, `OFFLINE_MESSAGE` and `SAVE_FAILED_MESSAGE` from `src/lib/store/index.ts`.

- [ ] **Step 3: Verify and commit**

Run `npm test && npm run typecheck && npm run lint`.
- Expected: green.
- The contract suite now runs twice: once for `DexieStore` and once for `SupabaseStore`.

```bash
git add -A
git commit -m "feat: SupabaseStore — in-memory snapshot, optimistic writes, realtime refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Auth state, first sync and store switching

**Files:**
- Create: `src/lib/auth/auth-state.ts`, `src/lib/auth/auth-state.test.ts`, `src/lib/auth/context.tsx`, `src/lib/store/first-sync.ts`, `src/lib/store/first-sync.test.ts`
- Modify: `src/lib/store/context.tsx` (`StoreProvider`), `src/components/providers.tsx`, `src/components/status-banners.tsx`

**Interfaces:**
- Consumes: `getSupabase` and `createRemoteApi` (Task 3); `SupabaseStore` (Task 4); `DexieStore.clearAll` (Task 1).
- Produces:

```ts
// auth-state.ts
export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in'
export interface AuthUser { id: string; name: string; avatarUrl: string | null; provider: 'github' | 'google' | string }
export function userFromSession(session: Session | null): AuthUser | null
export function initialStatus(hasClient: boolean): AuthStatus           // 'disabled' | 'loading'
export function safeNextPath(next: string | null): string               // same-origin path or '/'
// context.tsx
export function AuthProvider(props: { children: ReactNode }): JSX.Element
export function useAuth(): { status: AuthStatus; user: AuthUser | null; signIn(provider: 'github' | 'google'): Promise<void>; signOut(): Promise<void>; deleteAccount(): Promise<void> }
// first-sync.ts
export const MOVE_FAILED_MESSAGE = "Couldn't move this device's progress — it's still saved here. Try signing in again."
export async function moveGuestData(local: { getUserData(): Promise<UserData>; clearAll(): Promise<void> }, remote: RemoteApi): Promise<{ data: UserData; moved: number }>
```

- [ ] **Step 1: Write the failing tests for `auth-state.ts` and `first-sync.ts`**

`auth-state.test.ts`:
- `initialStatus(false)` is `'disabled'`; `initialStatus(true)` is `'loading'`.
- `userFromSession(null)` is `null`.
- **A GitHub session** has `user.user_metadata = { name: 'Ann', avatar_url: 'https://a/x.png' }` and `user.app_metadata.provider = 'github'`. It maps to `{ id, name: 'Ann', avatarUrl: 'https://a/x.png', provider: 'github' }`.
- **A Google session** uses `full_name` and `picture`.
- **Name fallback:** when there is no name, use the email's local part; when there is no email either, use `'Learner'`.
- `safeNextPath`:
  - `'/algorithms/'` → itself
  - `null` → `'/'`
  - `'https://evil.example'` → `'/'`
  - `'//evil.example'` → `'/'`
  - `'/\\evil'` → `'/'`

`first-sync.test.ts`. Use a `DexieStore` on a fresh fake-indexeddb database as `local`, and `FakeRemoteApi` as `remote`.

| Case | Setup | Expected |
|---|---|---|
| Empty guest | (none) | Returns the remote data and `moved: 0`; `replaceAll` is not called, so `remote.data` is unchanged |
| Guest progress, empty account | Guest has 2 solved exercises | `moved === 2`; `remote.data.progress` has 2 slugs; afterwards `local.hasData()` is false |
| Merge, newest wins | Guest has `a` updated on day 5; account has `a` updated on day 3 and `b` | Result has `a` from day 5 and `b`; review logs are the union |
| Settings, account set | Account settings are not the default (theme `dark`) and the guest has `light` | Result keeps `dark` |
| Settings, account default | Account settings are the default and the guest has `light` | Result uses `light` |
| Failure | `remote.failNext(new Error('network'))` before the upload | Rejects with `MOVE_FAILED_MESSAGE`; `local.hasData()` is still true |
| Load failure | `failNext` before `loadAll` | Rejects with `MOVE_FAILED_MESSAGE`; local is untouched |

Run them. Expected: FAIL.

- [ ] **Step 2: Implement `auth-state.ts` and `first-sync.ts`**

`first-sync.ts`:

```ts
import { mergeUserData } from '@/lib/logic/transfer'
import type { RemoteApi } from '@/lib/supabase/remote-api'
import { DEFAULT_SETTINGS, type UserData } from '@/lib/types'

export const MOVE_FAILED_MESSAGE = "Couldn't move this device's progress — it's still saved here. Try signing in again."

const isEmpty = (d: UserData) =>
  d.progress.length + d.notes.length + d.cards.length + d.reviewLogs.length + d.trainAttempts.length + d.activity.length === 0
const isDefault = (s: UserData['meta']['settings']) =>
  s.desiredRetention === DEFAULT_SETTINGS.desiredRetention && s.theme === DEFAULT_SETTINGS.theme

/** Moves guest progress on this device into the signed-in account. Local data is cleared only after the upload succeeds. */
export async function moveGuestData(
  local: { getUserData(): Promise<UserData>; clearAll(): Promise<void> },
  remote: RemoteApi,
): Promise<{ data: UserData; moved: number }> {
  try {
    const guest = await local.getUserData()
    const account = await remote.loadAll()
    if (isEmpty(guest)) return { data: account, moved: 0 }
    const merged = mergeUserData(account, guest)
    merged.meta = {
      ...merged.meta,
      settings: isDefault(account.meta.settings) ? guest.meta.settings : account.meta.settings,
    }
    await remote.replaceAll(merged)
    await local.clearAll()
    return { data: merged, moved: guest.progress.filter((p) => p.status === 'solved').length }
  } catch {
    throw new Error(MOVE_FAILED_MESSAGE)
  }
}
```

Run the tests. Expected: PASS.

- [ ] **Step 3: `AuthProvider`**

`src/lib/auth/context.tsx` is a client component.
- `const client = getSupabase()`.
- State starts with `status = initialStatus(!!client)` and `user = null`.
- **Effect (when `client` exists):**
  1. `client.auth.getSession()` sets the user and status: `'signed-in'` if there is a session, otherwise `'signed-out'`.
  2. `client.auth.onAuthStateChange((_e, session) => …)` updates both.
  3. The effect unsubscribes on cleanup.
- **`signIn(provider)`:**

  ```ts
  client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/auth/callback/?next=${encodeURIComponent(location.pathname)}`,
    },
  })
  ```
- **`signOut()`** calls `client.auth.signOut()`.
- **`deleteAccount()`** calls `createRemoteApi(client, user.id).deleteAccount()` and then `signOut()`. It keeps the Supabase calls out of UI components.
- **`useAuth()`** throws outside the provider.

- [ ] **Step 4: `StoreProvider` switches stores by auth status**

Rewrite `StoreProvider` in `src/lib/store/context.tsx`, keeping `StoreState` and the `useStore`/`useStoreStatus` exports:

```tsx
export function StoreProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const [state, setState] = useState<StoreState>(initialState)

  useEffect(() => {
    if (status === 'loading') { setState(initialState); return }
    let cancelled = false
    let dispose: (() => void) | undefined
    const db = new LeetHubDB()
    const useGuest = () => db.open()
      .then(() => { if (!cancelled) setState({ store: new DexieStore(db), ready: true, available: true }) })
      .catch(() => { if (!cancelled) setState({ store: new NullStore(), ready: true, available: false }) })

    if (status !== 'signed-in' || !user) {
      void useGuest()
    } else {
      const remote = createRemoteApi(getSupabase()!, user.id)
      db.open()
        .then(() => moveGuestData(new DexieStore(db), remote))
        .catch(async (err) => {
          // IndexedDB unavailable: nothing local to move, start from the account.
          if (!(err instanceof Error) || err.message !== MOVE_FAILED_MESSAGE) return { data: await remote.loadAll(), moved: 0 }
          throw err
        })
        .then(({ data, moved }) => {
          if (cancelled) return
          const store = new SupabaseStore(remote, data)
          dispose = () => store.dispose()
          setState({ store, ready: true, available: true })
          if (moved > 0) toast.success(`Moved ${moved} exercise${moved === 1 ? '' : 's'} from this device to your account`)
        })
        .catch((err) => {
          if (cancelled) return
          toast.error(err instanceof Error ? err.message : String(err))
          void useGuest()
        })
    }
    return () => { cancelled = true; dispose?.(); db.close() }
  }, [status, user?.id])

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>
}
```

If `remote.loadAll()` in the IndexedDB-unavailable branch rejects, the outer `catch` shows its message, and the user stays on guest or `NullStore`.

In `src/components/providers.tsx`, wrap `StoreProvider` in `AuthProvider`, inside `CatalogProvider`.

In `src/components/status-banners.tsx`, show the backup banner only when `useAuth().status !== 'signed-in'`. When signed in, the progress is not "only in this browser".

- [ ] **Step 5: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`.
- Expected: all green.
- e2e still has no Supabase env, so status is `disabled` and the guest flows are unchanged.

```bash
git add -A
git commit -m "feat: auth state, first-sync of guest progress, and store switching by sign-in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sign-in UI, auth callback and the Account section

**Files:**
- Create: `src/components/auth/sign-in-dialog.tsx`, `src/components/auth/user-menu.tsx`, `src/components/auth/auth-button.tsx`, `src/app/auth/callback/page.tsx`, `src/components/auth/auth-callback.tsx`, `src/components/settings/account-section.tsx`, `e2e/auth.spec.ts`
- Add: shadcn `dropdown-menu` and `avatar` (`npx shadcn@latest add dropdown-menu avatar`)
- Modify: `src/components/app-shell.tsx`, `src/components/settings/settings-view.tsx`, `playwright.config.ts`

**Interfaces:**
- Consumes: `useAuth()` (including `deleteAccount`) and `safeNextPath` (Task 5); `getSupabase()` (Task 3, used only by the callback page); `useStore()`.
- Produces: the route `/auth/callback/`. In the UI:
  - **Sign in** button: `aria-label="Sign in"`.
  - Dialog buttons: **Continue with GitHub** and **Continue with Google**.
  - Avatar menu trigger: `aria-label="Account menu"`.
  - Settings heading: **Account**.

- [ ] **Step 1: Configure e2e to build with dummy Supabase env, and write the failing e2e test**

In `playwright.config.ts`, add `env` to `webServer`:

```ts
env: {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-dummy-anon-key',
},
```

With no stored session, the client makes no network calls and status becomes `signed-out`, so every guest flow stays as it is.

The case where the env vars are missing (`disabled`) is covered by `auth-state.test.ts` plus `AuthButton` rendering nothing when `status === 'disabled'`.

Create `e2e/auth.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('signed out: Sign in opens the provider dialog', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', /\/privacy\/$/)
  expect(errors.map((e) => e.message)).toEqual([])
})

test('Sign in is reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible()
})

test('auth callback without a code shows an error and a way home', async ({ page }) => {
  await page.goto('/auth/callback/')
  await expect(page.getByRole('heading', { name: "Couldn't sign you in" })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()
})

test('settings has no Account section when signed out', async ({ page }) => {
  await page.goto('/settings/')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account' })).toHaveCount(0)
})
```

Add `'/auth/callback/'` to `PAGES` in `e2e/layout.spec.ts`.

Run `npx playwright test e2e/auth.spec.ts`. Expected: FAIL.

- [ ] **Step 2: Build the components**

**`auth-button.tsx` (`AuthButton`)** reads `useAuth()`:
- `disabled` → `null`
- `loading` → a 32px placeholder
- `signed-out` → a ghost button with the `LogIn` icon, `aria-label="Sign in"` and visible text **Sign in** when `variant="sidebar"`, that opens `SignInDialog`
- `signed-in` → `UserMenu`

It takes `variant: 'sidebar' | 'header'`.

**`sign-in-dialog.tsx`** uses the shadcn `Dialog`:
- Title: **Sign in to CS Atlas**.
- Text: "Your progress syncs across devices. We store only your learning data — see <Link href="/privacy/">Privacy</Link>."
- Two full-width buttons, **Continue with GitHub** and **Continue with Google**, each calling `signIn(provider)`. While the redirect starts, the button disables and shows **Redirecting…**.
- Errors show as `toast.error`.

**`user-menu.tsx`** uses `DropdownMenu`:
- The trigger is an `Avatar` showing the image or initials, with `aria-label="Account menu"`.
- Items:
  - the name (as a label)
  - **Settings**, a link to `/settings/`
  - **Sign out**, which calls `signOut()` and then `toast.success('Signed out')`

**`app-shell.tsx`:**
- Sidebar: put `<AuthButton variant="sidebar" />` in the bottom block, above the Settings link.
- Mobile header: put `<AuthButton variant="header" />` before the Search button.

**`src/app/auth/callback/page.tsx`** is a server page with `metadata = { title: 'Signing in · CS Atlas' }`. It renders `<Suspense><AuthCallback /></Suspense>`.

**`auth-callback.tsx`** is a client component.
- It reads `code`, `next` and `error_description` from `useSearchParams()`.
- When the client is missing, or there is no code, or there is an `error_description`, it shows:
  - h1 **Couldn't sign you in**
  - the message (`error_description`, or "The sign-in link is missing or expired.")
  - a link **Back to Today** to `/`
- Otherwise it shows h1 **Signing you in…**, awaits `getSupabase()!.auth.exchangeCodeForSession(code)` and then `router.replace(safeNextPath(next))`. On error, it shows the error state with the error message.
- It uses a ref so the exchange runs once in React strict mode.

**`account-section.tsx`** renders only when `status === 'signed-in'`.
- `<section>` with h2 **Account**:
  - the avatar, name and "Signed in with GitHub" (or Google), via a provider label map
  - a **Sign out** button
  - a **Delete account** button (destructive variant)
  - a line linking to `/privacy/`
- **Delete account** opens a `Dialog`:
  - Title: **Delete your account?**
  - Text: "This permanently deletes your account and all its progress, notes and reviews. Export a backup first if you want to keep a copy."
  - An input labelled "Type DELETE to confirm".
  - A destructive **Delete account** button, enabled only when the input equals `DELETE`. It calls `useAuth().deleteAccount()`, then `toast.success('Your account and data were deleted')`.
  - On error, it shows `toast.error(message)` and stays open.

**`settings-view.tsx`:**
- Render `<AccountSection />` first, above the existing sections.
- Change the Replace-import confirm text when signed in to: "Replace ALL progress in your account with this backup? This cannot be undone. Tip: cancel and use “Export current data first” if you want a copy of what you have now."

- [ ] **Step 3: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green, including `auth.spec.ts` and the 375px layout check for `/auth/callback/`.

```bash
git add -A
git commit -m "feat: sign-in dialog, account menu, auth callback page and account deletion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Privacy page, setup docs and roadmap update

**Files:**
- Create: `src/app/privacy/page.tsx`, `.env.example`, `e2e/privacy.spec.ts`
- Modify: `CONTRIBUTING.md`, `README.md`, `docs/roadmap.md`, `e2e/layout.spec.ts`

- [ ] **Step 1: Write the failing e2e test**

Create `e2e/privacy.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('privacy page explains storage, region and controls', async ({ page }) => {
  await page.goto('/privacy/')
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible()
  await expect(page.getByText('Singapore (ap-southeast-1)')).toBeVisible()
  await expect(page.getByRole('link', { name: 'thongdo.swe@gmail.com' })).toHaveAttribute('href', 'mailto:thongdo.swe@gmail.com')
  await expect(page.getByRole('link', { name: 'Settings' }).last()).toBeVisible()
})
```

Add `'/privacy/'` to the `layout.spec.ts` `PAGES` list.

- [ ] **Step 2: Build `src/app/privacy/page.tsx`**

It's a static server page with `metadata = { title: 'Privacy · CS Atlas' }`, h1 **Privacy**, and these sections, rendered as headings and paragraphs or lists:

1. **Without an account.** Everything stays in this browser (IndexedDB). Nothing is sent anywhere. Export a backup from Settings.
2. **With an account.** We store your learning data: exercise progress, notes, review history and schedule, training attempts, daily activity counts, and settings. We also store your display name and avatar URL from GitHub or Google. Supabase Auth keeps your email address and sign-in provider.
3. **Where.** Supabase (Postgres) in **Singapore (ap-southeast-1)**. Data is encrypted in transit, and row-level security lets only you read or change your rows.
4. **What we don't do.** No ads, no third-party analytics or trackers, no selling or sharing your data.
5. **Your controls.**
   - **Export** everything as JSON from <Link href="/settings/">Settings</Link>.
   - **Delete your account** in Settings → Account. This removes every row immediately.
   - **Questions:** <a href="mailto:thongdo.swe@gmail.com">thongdo.swe@gmail.com</a>.
6. *Last updated: 11 October 2026.*

Also link `/privacy/` from:
- the Settings page footer, if it isn't already linked from the Account section (guests see Settings too)
- the README

- [ ] **Step 3: Docs**

**`.env.example`:**

```
# Optional: enables sign-in and sync. Without these the site runs guest-only.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**`CONTRIBUTING.md`:** add a section **Running with accounts (optional)**. It covers:
- copying `.env.example` to `.env.local`
- running `npm run db:start` (requires Docker), which prints a local API URL and anon key to put in `.env.local`
- the sign-in needs: GitHub and Google OAuth apps pointing at `http://127.0.0.1:54321/auth/v1/callback`, configured in `supabase/config.toml` under `[auth.external.github]` and `[auth.external.google]`; or contributors can work guest-only
- `npm run db:test` runs the database tests

**`README.md`:** add to *What's inside*: "**Accounts (optional)**: sign in with GitHub or Google to sync progress across devices — see [Privacy](https://cs-atlas-hub.vercel.app/privacy/)".

**`docs/roadmap.md`, Phase 1:**
- Change epic 1 to: Supabase as the backend; **the site stays a static export**, with all Supabase calls made from the browser and protected by row-level security (decided 2026-10-11).
- Change epic 3: `SupabaseStore` keeps an in-memory snapshot, writes through Postgres functions, and refreshes over Realtime. On first sign-in, guest progress is merged into the account and the local copy is cleared.
- Change epic 4: private profile (avatar and name, Account settings). Public profiles move to Phase 4.
- Change epic 2: GitHub and Google (no email).

- [ ] **Step 4: Verify and commit**

Run `npm test && npm run typecheck && npm run lint && npm run e2e`. Expected: all green.

```bash
git add -A
git commit -m "docs: privacy page, Supabase setup guide and roadmap update for Phase 1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After all tasks (controller and owner, not a subagent task)

1. **Controller:** push `feat/phase-1` and open the PR. Wait for both CI jobs (`check` and `db`) and the Vercel preview.
2. **Owner:** complete spec §8:
   1. Create the Supabase project in **Singapore**.
   2. Run `npx supabase link` and `npx supabase db push`.
   3. Set up the GitHub and Google OAuth apps.
   4. Configure the redirect URLs.
   5. Set the Vercel environment variables, then redeploy the preview.
3. **Manual sign-off on the preview** (spec §9), with results recorded in the PR:
   1. Two different users, kept separate.
   2. The same user on two browsers, with a review syncing within a few seconds.
   3. A guest with progress signs in, and the progress moves to the account.
   4. Delete the account, then confirm in the dashboard that no rows remain.
4. **After merge:**
   - Run `npm run check:deploy -- https://cs-atlas-hub.vercel.app`.
   - Sign in on production as a smoke test.
   - Add `db` as a required check in the `main` ruleset.
