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
-- RLS does not govern TRUNCATE (or the other table-level privileges below), so remove them from signed-in clients.
revoke truncate, references, trigger on public.profiles, public.progress, public.notes, public.cards, public.review_logs, public.train_attempts, public.activity from authenticated;

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
revoke execute on function public.handle_new_user() from public, anon, authenticated;

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
  select uid, r.date, greatest(coalesce(r.reviews, 0), 0), greatest(coalesce(r.solves, 0), 0), greatest(coalesce(r.trains, 0), 0)
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

-- Realtime Postgres Changes does not apply RLS to DELETE events and DELETEs cannot be filtered, so publishing them
-- would leak other users' primary keys (user_id + slug/id/date) to every subscriber. Publish inserts and updates only;
-- replace_all always upserts the caller's profile row, so other devices still get an event and refresh.
alter publication supabase_realtime set (publish = 'insert, update');
