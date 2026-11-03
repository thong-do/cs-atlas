begin;
select plan(21);

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'u' || n || '@example.com' from generate_series(1, 7) n;

-- weekly_active ------------------------------------------------------------------------------------------------

insert into public.activity (user_id, date, reviews, solves, trains) values
  ('00000000-0000-0000-0000-000000000001', '2026-10-13', 1, 0, 0),
  ('00000000-0000-0000-0000-000000000001', '2026-10-26', 0, 1, 0), -- Monday
  ('00000000-0000-0000-0000-000000000001', '2026-10-28', 2, 0, 0), -- same learner, same week: counted once
  ('00000000-0000-0000-0000-000000000002', '2026-11-01', 0, 0, 1), -- Sunday, still week of 2026-10-26
  ('00000000-0000-0000-0000-000000000003', '2026-10-20', 0, 0, 0), -- a zero row is not activity
  ('00000000-0000-0000-0000-000000000004', '2026-10-11', 1, 0, 0), -- before the span
  ('00000000-0000-0000-0000-000000000004', '2026-11-02', 1, 0, 0); -- after the week of as_of

select results_eq(
  $$ select week, learners from report.weekly_active(3, '2026-10-28') $$,
  $$ values ('2026-10-12'::date, 1), ('2026-10-19'::date, 0), ('2026-10-26'::date, 2) $$,
  'distinct learners per Monday week, zero rows ignored, empty weeks included'
);
select is((select count(*)::int from report.weekly_active(as_of => '2026-10-28')), 12, 'defaults to 12 weeks');
select is(
  (select max(week) from report.weekly_active(as_of => '2026-10-26')), '2026-10-26'::date,
  'the week of as_of is included when as_of is a Monday'
);

-- review_completion --------------------------------------------------------------------------------------------
-- as_of 2026-11-03: the window is [2026-10-04, 2026-11-01) UTC.

delete from public.activity;
insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at) values
  -- Week of 2026-10-05, five learners.
  ('00000000-0000-0000-0000-000000000001', 'a', 's', 'good', '2026-10-06T10:00:00Z', 'review', '2026-10-06T00:00:00Z'), -- on time
  ('00000000-0000-0000-0000-000000000002', 'b', 's', 'good', '2026-10-08T00:00:00Z', 'review', '2026-10-06T00:00:00Z'), -- exactly 48h: on time
  ('00000000-0000-0000-0000-000000000003', 'c', 's', 'good', '2026-10-08T00:00:01Z', 'review', '2026-10-06T00:00:00Z'), -- late
  ('00000000-0000-0000-0000-000000000004', 'd', 's', 'good', '2026-10-01T00:00:00Z', 'review', '2026-10-07T00:00:00Z'), -- early: on time
  -- One learner across two weeks, merged into 'other'.
  ('00000000-0000-0000-0000-000000000006', 'e', 's', 'good', '2026-10-04T00:00:00Z', 'review', '2026-10-04T00:00:00Z'), -- window start: in
  ('00000000-0000-0000-0000-000000000006', 'f', 's', 'good', '2026-11-02T00:00:00Z', 'review', '2026-10-31T23:59:00Z'), -- on time
  -- Outside the window or not measurable.
  ('00000000-0000-0000-0000-000000000006', 'g', 's', 'good', '2026-10-04T00:00:00Z', 'review', '2026-10-03T23:59:59Z'),
  ('00000000-0000-0000-0000-000000000006', 'h', 's', 'good', '2026-11-01T00:00:00Z', 'review', '2026-11-01T00:00:00Z'), -- window end: out
  ('00000000-0000-0000-0000-000000000006', 'i', 's', 'good', '2026-10-10T00:00:00Z', 'review', null),                   -- legacy log
  ('00000000-0000-0000-0000-000000000006', 'j', 's', 'good', '2026-10-10T00:00:00Z', 'solve', null);                    -- first solve
-- A card whose current due is in the window was never reviewed since: late.
insert into public.cards (user_id, slug, card, due, updated_at) values
  ('00000000-0000-0000-0000-000000000005', 's', '{}', '2026-10-09T12:00:00Z', '2026-10-01T00:00:00Z'), -- week of 2026-10-05
  ('00000000-0000-0000-0000-000000000007', 's', '{}', '2026-10-20T00:00:00Z', '2026-10-01T00:00:00Z'), -- 'other'
  ('00000000-0000-0000-0000-000000000006', 's', '{}', '2026-11-01T00:00:00Z', '2026-10-01T00:00:00Z'); -- window end: out

select results_eq(
  $$ select week, due, on_time, pct from report.review_completion('2026-11-03') $$,
  $$ values ('2026-10-05', 5, 3, 60.0::numeric), ('other', 3, 2, 66.7::numeric), ('all', 8, 5, 62.5::numeric) $$,
  'on time within 48h (early counts), late, never-reviewed cards, window edges, small weeks merged, totals'
);
-- Earlier as_of values: the window moves and an item only counts once two full days have passed since it was due.
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-10-12') $$,
  $$ values ('2026-10-05', 5, 3), ('other', 2, 2), ('all', 7, 5) $$,
  'the card due 2026-10-09T12:00Z counts once as_of is 2026-10-12'
);
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-10-11') $$,
  $$ values ('other', 6, 5), ('all', 6, 5) $$,
  'on 2026-10-11 the card is not yet late, so the week has four learners and merges into other'
);
select results_eq(
  $$ select week, due, on_time, pct from report.review_completion('2020-01-01') $$,
  $$ values ('all', 0, 0, null::numeric) $$,
  'nothing due gives an empty total'
);

-- A card and its log for the same (user, slug). as_of 2026-11-03 again; every learner here is in 'other'.
delete from public.review_logs;
delete from public.cards;
-- Reviewed late on 2026-10-15; the new due is outside the window: one late item.
insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at) values
  ('00000000-0000-0000-0000-000000000001', 'x1', 'x', 'good', '2026-10-15T00:00:00Z', 'review', '2026-10-10T00:00:00Z');
insert into public.cards (user_id, slug, card, due, updated_at) values
  ('00000000-0000-0000-0000-000000000001', 'x', '{}', '2026-11-20T00:00:00Z', '2026-10-15T00:00:00Z');
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-11-03') $$,
  $$ values ('other', 1, 0), ('all', 1, 0) $$,
  'a late review whose new due is outside the window is one late item'
);
-- Same, but the new due is inside the window and still unreviewed: two late items.
insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at) values
  ('00000000-0000-0000-0000-000000000002', 'y1', 'y', 'again', '2026-10-15T00:00:00Z', 'review', '2026-10-10T00:00:00Z');
insert into public.cards (user_id, slug, card, due, updated_at) values
  ('00000000-0000-0000-0000-000000000002', 'y', '{}', '2026-10-20T00:00:00Z', '2026-10-15T00:00:00Z');
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-11-03') $$,
  $$ values ('other', 3, 0), ('all', 3, 0) $$,
  'a late review whose new due is inside the window and unreviewed adds two late items'
);
-- Two devices reviewed the same due: one item, judged by the earliest review (on time).
insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at) values
  ('00000000-0000-0000-0000-000000000003', 'z1', 'z', 'good', '2026-10-20T00:00:00Z', 'review', '2026-10-12T00:00:00Z'),
  ('00000000-0000-0000-0000-000000000003', 'z2', 'z', 'good', '2026-10-13T00:00:00Z', 'review', '2026-10-12T00:00:00Z');
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-11-03') $$,
  $$ values ('other', 4, 1), ('all', 4, 1) $$,
  'duplicate logs for one due count once, by the earliest review'
);
-- With an explicit as_of the window is UTC whatever the session timezone: 2026-10-03T20:00Z is
-- 2026-10-04 03:00 in Ho Chi Minh City but still before the UTC window start.
insert into public.review_logs (user_id, id, slug, rating, reviewed_at, kind, due_at) values
  ('00000000-0000-0000-0000-000000000004', 'w1', 'w', 'good', '2026-10-04T00:00:00Z', 'review', '2026-10-03T20:00:00Z');
set local timezone = 'Asia/Ho_Chi_Minh';
select results_eq(
  $$ select week, due, on_time from report.review_completion('2026-11-03') $$,
  $$ values ('other', 4, 1), ('all', 4, 1) $$,
  'the window and weeks do not depend on the session timezone'
);
reset timezone;

-- Counts only, and only service_role may run either report.
select is(
  (select array_agg(parameter_name::text order by ordinal_position) from information_schema.parameters p
   join information_schema.routines r using (specific_schema, specific_name)
   where r.routine_schema = 'report' and r.routine_name = 'weekly_active' and p.parameter_mode = 'OUT'),
  array['week', 'learners'],
  'weekly_active returns only week and learners'
);
select is(
  (select array_agg(parameter_name::text order by ordinal_position) from information_schema.parameters p
   join information_schema.routines r using (specific_schema, specific_name)
   where r.routine_schema = 'report' and r.routine_name = 'review_completion' and p.parameter_mode = 'OUT'),
  array['week', 'due', 'on_time', 'pct'],
  'review_completion returns only week, due, on_time and pct'
);
select ok(has_function_privilege('service_role', 'report.weekly_active(int, date)', 'execute'), 'service_role can run weekly_active');
select ok(not has_function_privilege('authenticated', 'report.weekly_active(int, date)', 'execute'), 'authenticated cannot run weekly_active');
select ok(not has_function_privilege('anon', 'report.weekly_active(int, date)', 'execute'), 'anon cannot run weekly_active');
select ok(not has_function_privilege('public', 'report.weekly_active(int, date)', 'execute'), 'public cannot run weekly_active');
select ok(has_function_privilege('service_role', 'report.review_completion(date)', 'execute'), 'service_role can run review_completion');
select ok(not has_function_privilege('authenticated', 'report.review_completion(date)', 'execute'), 'authenticated cannot run review_completion');
select ok(not has_function_privilege('anon', 'report.review_completion(date)', 'execute'), 'anon cannot run review_completion');
select ok(not has_function_privilege('public', 'report.review_completion(date)', 'execute'), 'public cannot run review_completion');

select * from finish();
rollback;
