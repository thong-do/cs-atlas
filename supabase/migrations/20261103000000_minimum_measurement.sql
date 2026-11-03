-- Phase Q item 7: minimum measurement. Weekly active learners, and review completion from the due date each
-- review log now carries. Both reports follow retention_w4: report schema, counts only, service_role only.

-- The card's due date when the review happened. Null for first solves and for logs written before this column.
alter table public.review_logs add column due_at timestamptz;

-- apply_changes and replace_all are unchanged except that review_logs rows carry due_at.
-- create or replace keeps the existing owner and grants.
create or replace function public.apply_changes(payload jsonb) returns void
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

  insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at)
  select uid, r.id, r.slug, r.rating, r.reviewed_at, r.kind, r.due_at
  from jsonb_to_recordset(coalesce(payload -> 'review_logs', '[]'::jsonb))
    as r (id text, slug text, rating text, reviewed_at timestamptz, kind text, due_at timestamptz)
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
create or replace function public.replace_all(payload jsonb) returns void
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

  insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at)
  select uid, r.id, r.slug, r.rating, r.reviewed_at, r.kind, r.due_at
  from jsonb_to_recordset(coalesce(payload -> 'review_logs', '[]'::jsonb))
    as r (id text, slug text, rating text, reviewed_at timestamptz, kind text, due_at timestamptz)
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

-- Learners with any solve, review or training in each of the last `weeks` weeks (Monday start) up to and
-- including the week of as_of. Empty weeks show 0. activity.date is the learner's local date.
create or replace function report.weekly_active(weeks int default 12, as_of date default current_date)
returns table (week date, learners int)
language sql
stable
set search_path = ''
as $$
  with span as (
    select date_trunc('week', as_of::timestamp)::date - 7 * n as week
    from generate_series(0, weeks - 1) n
  )
  select s.week, count(distinct a.user_id)::int as learners
  from span s
  left join public.activity a
    on a.date >= s.week and a.date < s.week + 7 and a.reviews + a.solves + a.trains > 0
  group by s.week
  order by s.week
$$;

revoke all on function report.weekly_active(int, date) from public, anon, authenticated;
grant execute on function report.weekly_active(int, date) to service_role;

-- How often due reviews get done on time. A due item is either a review log whose due_at fell in the window
-- (on time when reviewed no later than 48 hours after it was due; early counts as on time), or a card whose
-- current due is in the window: reviewing a card moves its due, so it has not been reviewed since and is late.
-- The window is [as_of - 30 days, as_of - 2 days) in UTC, so every item in it has had its full 48 hours.
-- Rows are weeks (Monday, UTC) of the due date; weeks under 5 learners merge into 'other'; 'all' gives totals.
-- Logs written before due_at existed are not counted.
create or replace function report.review_completion(as_of date default current_date)
returns table (week text, due int, on_time int, pct numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (as_of - 30)::timestamp at time zone 'UTC' as lo, (as_of - 2)::timestamp at time zone 'UTC' as hi
  ),
  items as (
    select l.user_id, l.due_at as due_at, l.reviewed_at <= l.due_at + interval '48 hours' as done
    from public.review_logs l, bounds b
    where l.due_at >= b.lo and l.due_at < b.hi
    union all
    select c.user_id, c.due, false
    from public.cards c, bounds b
    where c.due >= b.lo and c.due < b.hi
  ),
  weeks as (
    select date_trunc('week', i.due_at at time zone 'UTC')::date as week,
           count(distinct i.user_id)::int as learners,
           count(*)::int as due, count(*) filter (where i.done)::int as on_time
    from items i
    group by 1
  ),
  shown as (
    select case when learners >= 5 then to_char(week, 'YYYY-MM-DD') else 'other' end as label,
           case when learners >= 5 then week end as sort_week,
           due, on_time
    from weeks
  ),
  merged as (
    select label, min(sort_week) as sort_week, sum(due)::int as due, sum(on_time)::int as on_time
    from shown
    group by label
    union all
    select 'all', null, coalesce(sum(due), 0)::int, coalesce(sum(on_time), 0)::int from weeks
  )
  select label as week, due, on_time,
         case when due > 0 then round(100.0 * on_time / due, 1) end as pct
  from merged
  where due > 0 or label = 'all'
  order by (label = 'all'), (label = 'other'), sort_week
$$;

revoke all on function report.review_completion(date) from public, anon, authenticated;
grant execute on function report.review_completion(date) to service_role;
