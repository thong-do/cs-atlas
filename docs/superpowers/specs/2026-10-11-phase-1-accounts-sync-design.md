# Phase 1 — Accounts & Sync: Design Spec

*Date: 2026-10-11 · Status: approved in brainstorming, awaiting written review*
*Roadmap: `docs/roadmap.md` §5, Phase 1*

## 1. Goal and success criteria

Learners can sign in with GitHub or Google, and their progress follows them across devices. Learning still works fully without an account.

**Done when:**

1. **Sign-in works.** A learner can sign in with GitHub or Google and sign out again from production.
2. **Progress syncs.** Progress made on one device (solve, note, review, training) appears on a second signed-in device within a few seconds, without a reload.
3. **Guest progress moves into the account.** On the first sign-in on a device, its guest progress is merged into the account and the local copy is cleared.
4. **Guest mode is unchanged.** When signed out, the site behaves exactly as Phase 0: IndexedDB, offline, export and import.
5. **Each user sees only their own data.** Row-level security tests prove that no user can read or write another user's rows.
6. **Account deletion is complete.** Deleting an account removes every row belonging to the user, verified by database tests and by a manual check in the dashboard.
7. **Privacy page.** A `/privacy` page explains what is stored and how to export or delete it.
8. **No configuration, no breakage.** With no Supabase configuration (CI, forks, local development without `.env.local`), the site runs guest-only and every existing test passes.

### Non-goals

- **Email or magic-link sign-in.** Excluded in brainstorming.
- **Public profiles or usernames.** These arrive with the community features in Phase 4.
- **Offline writes while signed in.** These fail with a clear message instead. This is the accepted cost of approach B.
- **Roles and contribution features.** Those come in Phase 3.

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Sign-in methods | GitHub and Google OAuth via Supabase Auth |
| Profile | Private: avatar and name in the header, plus an Account section in Settings. No public pages. |
| First sync | Automatic merge with the existing backup merge rules (`mergeUserData`), then clear local data, with a toast summary |
| Architecture | **B.** When signed in, Supabase is the source of truth through a `SupabaseStore`; when signed out, `DexieStore` as today |
| Guest mode | Kept |
| Hosting | **Stays a static export** (amends the roadmap, which assumed a hybrid build). All Supabase calls run in the browser, and row-level security protects the data. |
| Sign-out | Switches to an empty `DexieStore`. Nothing of the account is left on the device. |
| Replace import while signed in | Replaces the account's data as well (`replace_all`) |
| Activity counters | Incremented server-side, so solves, reviews and trainings from two devices on the same day add up |

## 3. Architecture

```
            ┌──────────────── browser ────────────────┐
 signed out │  UI ──useStore/useLive──▶ DexieStore ──▶ IndexedDB
 signed in  │  UI ──useStore/useLive──▶ SupabaseStore
            │                             │ snapshot (memory)
            │                             ▼
            │                        RemoteApi ──supabase-js──▶ Supabase
            └─────────────────────────────────────────┘          (Auth, Postgres + RLS, Realtime)
```

- **Supabase client.** `src/lib/supabase/client.ts` creates one browser client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - It uses the PKCE flow and persists the session in localStorage.
  - It is `null` when either variable is missing. The UI then hides **Sign in**, and the app runs guest-only.
- **`AuthProvider`.** It exposes `{ status: 'disabled' | 'loading' | 'signed-out' | 'signed-in', user, signIn(provider), signOut() }` and subscribes to `onAuthStateChange`.
- **`StoreProvider`.**
  - It chooses the store from the auth status: `DexieStore` (or `NullStore` if IndexedDB is unavailable) when signed out, and `SupabaseStore` when signed in.
  - It keeps today's `{ store, ready, available }` contract.
  - While auth is loading it serves `NullStore` with `ready: false`, so pages show their existing loading state.
- **`useStore()` and `useLive(query, deps)`** keep their signatures. No page code changes because of the store swap.

## 4. Store contract changes

`Store` (in `src/lib/store/types.ts`) gains one method:

```ts
/** Calls `onChange` after any change visible to this store (own writes, other tabs, other devices). Returns an unsubscribe function. */
subscribe(onChange: () => void): () => void
```

**Implementations:**
- `DexieStore` uses Dexie's `storagemutated` event, which fires for writes from this tab and from other tabs.
- `SupabaseStore` emits after its own writes are applied to its snapshot, and after Realtime or focus refreshes.
- `NullStore` never emits.

**`useLive` is rewritten** in `src/lib/store/context.tsx` without `dexie-react-hooks`:
1. It runs `query(store)`.
2. It reruns the query on every `store.subscribe` notification, and when the store or `deps` change.
3. It ignores results from stale runs.

It returns `undefined` until the first result, as today. The `dexie-react-hooks` dependency is removed.

## 5. Database (`supabase/migrations/`)

### 5.1 Tables

All tables are in the `public` schema. Every table has `user_id uuid not null references auth.users(id) on delete cascade`.

| Table | Primary key | Columns (besides `user_id`) |
|---|---|---|
| `profiles` | `user_id` | `display_name text`, `avatar_url text`, `settings jsonb not null default '{"desiredRetention":0.9,"theme":"system"}'`, `last_backup_at timestamptz`, `created_at timestamptz default now()` |
| `progress` | `(user_id, slug)` | `status text check in ('unsolved','solved')`, `solve_rating text check in ('alone','hint','solution')`, `first_solved_at timestamptz`, `needs_resolve boolean not null default false`, `updated_at timestamptz not null` |
| `notes` | `(user_id, slug)` | `insight`, `approach`, `complexity`, `mistakes` and `code` (all `text not null default ''`), plus `updated_at timestamptz not null` |
| `cards` | `(user_id, slug)` | `card jsonb not null`, `due timestamptz not null`, `updated_at timestamptz not null` |
| `review_logs` | `id uuid` | `slug text not null`, `rating text check in ('again','hard','good','easy')`, `reviewed_at timestamptz not null`, `kind text check in ('solve','review')` (nullable for legacy) |
| `train_attempts` | `id uuid` | `problem_slug`, `correct_pattern`, `chosen_pattern` (text), `correct boolean`, `at timestamptz` |
| `activity` | `(user_id, date)` | `date date`, `reviews`, `solves`, `trains` (all `int not null default 0 check >= 0`) |

- **Indexes:** `cards (user_id, due)`, `review_logs (user_id, slug)`, `train_attempts (user_id, at)`.
- **Mapping.** Field names map one-to-one to the v1 storage types: camelCase in TypeScript, snake_case in SQL. A single mapping module (`src/lib/supabase/rows.ts`) converts in both directions, and its tests round-trip every type.
- **Profile rows.** An `on auth.users insert` trigger creates the `profiles` row, filling `display_name` and `avatar_url` from the OAuth metadata (`full_name`/`name`, `avatar_url`/`picture`).

### 5.2 Row-level security

- RLS is enabled on every table.
- Each table has exactly one policy per command (select, insert, update, delete): `using (user_id = auth.uid())`, plus `with check (user_id = auth.uid())` for writes.
- `anon` gets no access.
- `review_logs` and `train_attempts` get no `update` or `delete` policy. They are append-only and change only through `replace_all` or account deletion.

### 5.3 Functions (all `security invoker` unless noted)

**`apply_changes(payload jsonb) returns void`**
- Applies one write in a single transaction.
- Payload keys are optional: `progress[]`, `notes[]`, `cards[]` (upsert by key), `review_logs[]` and `train_attempts[]` (insert, ignore duplicates by `id`), `activity_increments[]` (`{date, reviews, solves, trains}` added to the existing counts), `profile` (`settings` and/or `last_backup_at`).
- Every row gets `user_id = auth.uid()`; any `user_id` in the payload is ignored.

**`replace_all(payload jsonb) returns void`**
- Deletes all of the caller's rows in the data tables, then inserts the payload, which is a full `UserData` in snake_case, in one transaction.
- It is used by Replace import and by the first-sync upload.

**`delete_my_account() returns void`**
- `security definer`, with `set search_path = ''`.
- Deletes `auth.users where id = auth.uid()`; the cascades remove every row.
- `execute` is granted to `authenticated` only.

### 5.4 Realtime

- The `supabase_realtime` publication includes `progress`, `notes`, `cards`, `review_logs`, `train_attempts`, `activity` and `profiles`.
- Postgres changes respect RLS, so each subscriber only receives its own rows.

## 6. `SupabaseStore`

Files: `src/lib/store/supabase-store.ts`, plus `src/lib/supabase/remote-api.ts`.

**`RemoteApi`** is a thin interface over supabase-js and the only code that talks to the network:

```ts
interface RemoteApi {
  loadAll(): Promise<UserData>                       // one select per table, mapped to v1 types
  applyChanges(changes: Changes): Promise<void>      // rpc('apply_changes')
  replaceAll(data: UserData): Promise<void>          // rpc('replace_all')
  deleteAccount(): Promise<void>                     // rpc('delete_my_account')
  onRemoteChange(cb: () => void): () => void         // Realtime channel filtered by user_id
}
```

`Changes` is the TypeScript mirror of the `apply_changes` payload.

**Loading.**
- `SupabaseStore.load()` calls `loadAll()` once and keeps the result as an in-memory `UserData` snapshot.
- Every read method answers from the snapshot, using the same filtering and sorting `DexieStore` uses (for example `dueCards` sorted by due).

**Writes.** Every write method:
1. Computes the new rows exactly as `DexieStore` does, using the shared helpers for insight validation, FSRS scheduling and activity bumps.
2. Applies them to the snapshot and emits a change.
3. Calls `applyChanges`.
4. On failure, restores the previous snapshot, emits again and throws an error. The message says "You're offline — this change wasn't saved." when `navigator.onLine` is false, and otherwise "Couldn't save to your account. Try again."

The existing UI already turns thrown errors into toasts.

**Refresh.** `onRemoteChange`, and the `visibilitychange` event when the page becomes visible, trigger a debounced (300 ms) `loadAll()`. The result replaces the snapshot and the store emits a change.

**Imports.**
- `importAll(file, 'merge')` merges the file into the snapshot with `mergeUserData`, then calls `replaceAll(merged)`.
- `importAll(file, 'replace')` calls `replaceAll(file.data)`.
- Both refresh the snapshot afterwards.

**Shared logic.** The write-path computations that `DexieStore` does inline today (building the solve rows, the review card update and the activity bump) move into pure functions in `src/lib/store/mutations.ts`. Both stores call them, so they cannot drift apart.

## 7. Sign-in, first sync and account UI

### 7.1 Sign-in

- **Header.**
  - When signed out, a **Sign in** button sits in the sidebar footer above Settings, and in the mobile header.
  - When signed in, the avatar sits in the same places, with a menu showing the name, **Settings** and **Sign out**.
  - Nothing is shown when auth is disabled.
- **Dialog.**
  - Buttons: **Continue with GitHub** and **Continue with Google**.
  - Text: "Your progress syncs across devices. We store only your learning data — see Privacy."
  - Sign-in uses `signInWithOAuth({ provider, options: { redirectTo: <origin>/auth/callback/?next=<current path> } })`.
- **`/auth/callback/`** is a static client page. It:
  1. Calls `exchangeCodeForSession(code)`.
  2. Shows "Signing you in…".
  3. Redirects to `next`, which must be a same-origin path; anything else goes to `/`.
  4. On error, shows the message with a link back home.

### 7.2 First sync (guest progress → account)

This runs once per sign-in, before `SupabaseStore` is handed to the UI:

1. Read local guest data with `DexieStore.getUserData()`. If it holds no progress, notes, cards, logs, attempts or activity, skip to step 5.
2. `remote = RemoteApi.loadAll()`.
3. `merged = mergeUserData(remote, local)`, so local records win only when they are newer.
   - Settings follow the account when the account already has a profile row with non-default settings; otherwise they come from the device.
   - Activity for each date is the larger of the two counts.
4. `replaceAll(merged)`, then clear every IndexedDB table.
   - Toast: "Moved {n} exercises from this device to your account", where n is the number of local solved exercises.
5. Hand over `SupabaseStore` initialised with the merged data, or with the remote data when step 1 was skipped.

**Failure handling.** If any step fails, local data is **not** cleared. The user stays signed in and sees the error toast "Couldn't move this device's progress — it's still saved here. Try signing in again." The app then falls back to `DexieStore` until the next sign-in attempt. Nothing is lost.

### 7.3 Settings → Account (signed in only)

- **Shows** the avatar, display name and provider ("Signed in with GitHub").
- **Sign out** button.
- **Delete account:**
  - A dialog explains that this permanently deletes the account and all its progress, and suggests exporting a backup first.
  - Confirming requires typing `DELETE`.
  - It then calls `deleteAccount()`, signs out, and shows the toast "Your account and data were deleted".

### 7.4 Backup and settings while signed in

- **Export** uses `getUserData()`, which works for both stores.
- **The backup banner and `lastBackupAt`** keep their meaning per store. For an account, `last_backup_at` lives in `profiles`.
- **Theme and retention settings** are saved through `saveSettings`, into `profiles.settings` when signed in.

### 7.5 `/privacy`

A static page that covers:
- **What is stored:** learning progress, notes, reviews, training attempts, daily activity, display name, avatar URL, and the email the provider shares (held by Supabase Auth).
- **Where:** the Supabase project region (named in the page).
- **Sharing:** none. There are no ads and no third-party analytics.
- **Guest mode:** data stays in the browser.
- **Your controls:** how to export, how to delete the account, and the contact address `thongdo.swe@gmail.com`.

It is linked from the sign-in dialog, the Settings Account section and the README.

## 8. Configuration and owner setup

**Environment variables.** `.env.example` documents both `NEXT_PUBLIC_SUPABASE_*` variables. CI does not set them, so e2e runs guest-only. A separate CI job tests the database (§9).

**Owner checklist** (also added to `CONTRIBUTING.md` under "Running with accounts"):

1. Create a Supabase project (free tier) in region **Singapore (ap-southeast-1)** and note its URL and anon key.
2. Apply the migrations: `npx supabase link` then `npx supabase db push`, or paste them into the SQL editor in order.
3. **GitHub:** create an OAuth app with callback `https://<project-ref>.supabase.co/auth/v1/callback`, then enter its client ID and secret in Supabase → Auth → Providers → GitHub.
4. **Google:** create an OAuth client in Google Cloud (web application) with the same callback URL and a consent screen, then enter it in Supabase → Auth → Providers → Google.
5. **Redirect URLs.** In Supabase → Auth → URL configuration:
   - Site URL: `https://cs-atlas-hub.vercel.app`
   - Additional redirect URLs: `http://localhost:3000/**`, `https://cs-atlas-hub.vercel.app/**` and `https://*-thong-dos-projects.vercel.app/**` (previews)
6. **Vercel.** Set both variables for Production and Preview, then redeploy.

## 9. Testing

**Store contract suite.**
- `src/lib/store/store-contract.ts` defines the behavioural tests once:
  - solve flow
  - notes
  - due cards ordering
  - reviews
  - training attempts
  - activity bumps
  - settings
  - export/import merge and replace
  - `subscribe` notifications
- It runs against `DexieStore` (fake-indexeddb) and against `SupabaseStore` backed by `FakeRemoteApi`, an in-memory implementation with the same semantics as the SQL functions, including activity increments and `replace_all`.

**`SupabaseStore`-specific unit tests:**
- optimistic rollback on write failure, including the offline error message
- the debounced refresh on remote change
- first-sync (§7.2): merge, clear, toast count, and keeping local data on failure
- the `rows.ts` round-trips

**Database tests (pgTAP, `supabase/tests/*.sql`):**
- A user cannot select, insert, update or delete another user's rows, in every table.
- `anon` can do nothing.
- `apply_changes` is atomic: one bad row rolls back the whole call.
- `apply_changes` ignores `user_id` in the payload.
- Activity increments add up.
- `review_logs` duplicates are ignored.
- `replace_all` replaces only the caller's rows.
- `delete_my_account` removes the user and every owned row.
- The profile trigger fills the name and avatar.

**CI:** a new `db` job in `ci.yml` runs `supabase start` (Docker), `supabase db reset` (applies the migrations) and `supabase test db`. It becomes a required check alongside `check` once green.

**E2E (guest-only, as in CI):**
- All existing specs pass unchanged.
- *Amended while planning:* the e2e build always uses dummy Supabase env vars, so it runs signed out with Sign in visible. The "no config → no Sign in" case is covered by unit tests (`auth-state.test.ts`) plus `AuthButton` rendering nothing when auth is `disabled`. This avoids a second production build in CI.
- New: `/privacy` renders.
- New: `/auth/callback/` with no code shows the error state and a link home.
- To exercise the Sign in button and dialog without OAuth, the build is run with dummy Supabase environment variables and the test only asserts the dialog and its two buttons. It does not follow the redirect.

**Manual sign-off before merge,** recorded in the PR:
1. Sign in with GitHub on browser A and Google on browser B, as different users. Confirm their data is separate.
2. Sign in as the same user on A and B. A review on A appears on B within a few seconds.
3. A guest with progress signs in: the toast appears, the progress shows in the account, and IndexedDB is empty.
4. Delete the account: the Supabase dashboard shows no rows for that user.

## 10. Rollout

1. **One PR** on `feat/phase-1`. Migrations and database tests are green in CI; the guest-only site is unchanged.
2. **Before merge,** the owner completes the §8 checklist and runs the manual sign-off on the Vercel preview. The preview URL pattern is allowed in redirect URLs, and preview access is through Vercel login.
3. **Merge.** Production deploys, then `npm run check:deploy -- https://cs-atlas-hub.vercel.app` runs. A smoke test confirms sign-in on production.
4. **Update `docs/roadmap.md` Phase 1** to record the static-export decision.
