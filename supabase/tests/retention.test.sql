begin;
select plan(9);

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'u' || n || '@example.com' from generate_series(1, 8) n;

-- Cohort week of Monday 2026-10-05: five learners. Day 1 is the first activity day; retained = any activity on days 22–28.
insert into public.activity (user_id, date, solves) values
  ('00000000-0000-0000-0000-000000000001', '2026-10-05', 1), ('00000000-0000-0000-0000-000000000001', '2026-10-26', 1), -- day 22: kept
  ('00000000-0000-0000-0000-000000000002', '2026-10-05', 1), ('00000000-0000-0000-0000-000000000002', '2026-11-01', 1), -- day 28: kept
  ('00000000-0000-0000-0000-000000000003', '2026-10-06', 1), ('00000000-0000-0000-0000-000000000003', '2026-11-03', 1), -- day 29: lost
  ('00000000-0000-0000-0000-000000000004', '2026-10-07', 1), ('00000000-0000-0000-0000-000000000004', '2026-10-27', 1), -- day 21: lost
  ('00000000-0000-0000-0000-000000000005', '2026-10-11', 1),                                                            -- Sunday, never back
  -- Two one-learner cohorts, merged into 'other'.
  ('00000000-0000-0000-0000-000000000006', '2026-10-12', 1), ('00000000-0000-0000-0000-000000000006', '2026-11-05', 1), -- day 25: kept
  ('00000000-0000-0000-0000-000000000007', '2026-10-20', 1),
  -- A cohort whose day 28 has not passed yet: left out.
  ('00000000-0000-0000-0000-000000000008', '2026-12-07', 1);

select results_eq(
  $$ select cohort, users, retained, pct from report.retention_w4('2026-12-31') $$,
  $$ values ('2026-10-05', 5, 2, 40.0::numeric), ('other', 2, 1, 50.0::numeric), ('all', 7, 3, 42.9::numeric) $$,
  'cohorts by first-activity week, days 22–28 window, small cohorts merged, incomplete cohort left out'
);

-- A cohort appears only once day 28 has passed for its latest possible member (week start + 33 days).
select results_eq(
  $$ select cohort from report.retention_w4('2026-11-07') $$,
  $$ values ('all') $$,
  'the 2026-10-05 cohort is not complete on 2026-11-07'
);
select results_eq(
  $$ select cohort, users from report.retention_w4('2026-11-08') $$,
  $$ values ('2026-10-05', 5), ('all', 5) $$,
  'the 2026-10-05 cohort is complete on 2026-11-08'
);

-- With no activity at all, the report is a single empty total.
select results_eq(
  $$ select cohort, users, retained, pct from report.retention_w4('2020-01-01') $$,
  $$ values ('all', 0, 0, null::numeric) $$,
  'no complete cohorts gives an empty total'
);

-- The output carries no user ids.
select is(
  (select array_agg(parameter_name::text order by ordinal_position) from information_schema.parameters
   where specific_schema = 'report' and parameter_mode = 'OUT'),
  array['cohort', 'users', 'retained', 'pct'],
  'returns only cohort, users, retained and pct'
);

-- Only service_role may run it.
select ok(has_function_privilege('service_role', 'report.retention_w4(date)', 'execute'), 'service_role can execute');
select ok(not has_function_privilege('authenticated', 'report.retention_w4(date)', 'execute'), 'authenticated cannot execute');
select ok(not has_function_privilege('anon', 'report.retention_w4(date)', 'execute'), 'anon cannot execute');
select ok(not has_schema_privilege('authenticated', 'report', 'usage'), 'authenticated cannot use the report schema');

select * from finish();
rollback;
