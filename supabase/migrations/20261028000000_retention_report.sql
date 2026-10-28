-- Phase 2 retention baseline: anonymous, aggregate 4-week retention from synced activity.
-- Lives in its own schema, which the Data API does not expose, and only service_role may run it.

create schema if not exists report;
revoke all on schema report from public, anon, authenticated;
grant usage on schema report to service_role;

-- A learner's cohort is the week (Monday) of their first activity day. They are retained when they
-- have any activity on days 22–28 counting that first day as day 1. Only cohorts whose day 28 has
-- passed for every member are reported, cohorts under 5 learners are merged into 'other' so no row
-- describes one or two people, and a final 'all' row gives the totals. No user ids leave the function.
create or replace function report.retention_w4(as_of date default current_date)
returns table (cohort text, users int, retained int, pct numeric)
language sql
stable
set search_path = ''
as $$
  with firsts as (
    select a.user_id, min(a.date) as first_day
    from public.activity a
    group by a.user_id
  ),
  learners as (
    select f.user_id,
           date_trunc('week', f.first_day)::date as week,
           exists (
             select 1 from public.activity a
             where a.user_id = f.user_id
               and a.date between f.first_day + 21 and f.first_day + 27
           ) as kept
    from firsts f
  ),
  complete as (
    -- the latest member of a cohort starts on day 6 of the week; their day 28 is week + 33
    select * from learners where week + 33 < as_of
  ),
  weeks as (
    select week, count(*)::int as users, count(*) filter (where kept)::int as retained
    from complete
    group by week
  ),
  shown as (
    select case when users >= 5 then to_char(week, 'YYYY-MM-DD') else 'other' end as cohort,
           case when users >= 5 then week end as sort_week,
           users, retained
    from weeks
  ),
  merged as (
    select cohort, min(sort_week) as sort_week, sum(users)::int as users, sum(retained)::int as retained
    from shown
    group by cohort
    union all
    select 'all', null, coalesce(sum(users), 0)::int, coalesce(sum(retained), 0)::int from weeks
  )
  select cohort, users, retained,
         case when users > 0 then round(100.0 * retained / users, 1) end as pct
  from merged
  where users > 0 or cohort = 'all'
  order by (cohort = 'all'), (cohort = 'other'), sort_week
$$;

revoke all on function report.retention_w4(date) from public, anon, authenticated;
grant execute on function report.retention_w4(date) to service_role;
