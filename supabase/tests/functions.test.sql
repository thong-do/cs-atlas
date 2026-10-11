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
