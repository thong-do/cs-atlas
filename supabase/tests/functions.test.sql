begin;
select plan(29);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ann@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');
insert into public.progress values ('22222222-2222-2222-2222-222222222222', 'two-sum', 'solved', 'alone', now(), false, now());
insert into public.notes (user_id, slug, insight, updated_at) values ('22222222-2222-2222-2222-222222222222', 'two-sum', 'bob insight', now());
insert into public.cards values ('22222222-2222-2222-2222-222222222222', 'two-sum', '{}'::jsonb, now(), now());
insert into public.review_logs values ('22222222-2222-2222-2222-222222222222', 'log-b', 'two-sum', 'good', now(), 'review');
insert into public.train_attempts values ('22222222-2222-2222-2222-222222222222', 'att-b', 'two-sum', 'tp', 'tp', true, now());
insert into public.activity values ('22222222-2222-2222-2222-222222222222', '2026-10-03', 5, 5, 5);

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
select public.apply_changes('{"activity_increments":[{"date":"2026-10-03","solves":-5,"reviews":-5,"trains":-5}]}'::jsonb);
select is((select solves from public.activity where date = '2026-10-03'), 2, 'negative increment does not lower solves');
select is((select reviews from public.activity where date = '2026-10-03'), 2, 'negative increment does not lower reviews');

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
  "progress": [{"user_id":"22222222-2222-2222-2222-222222222222","slug":"valid-anagram","status":"solved","solve_rating":"hint","needs_resolve":false,"updated_at":"2026-10-06T02:00:00Z"}],
  "activity": [{"date":"2026-10-06","reviews":0,"solves":1,"trains":0}],
  "profile": {"settings":{"desiredRetention":0.9,"theme":"light"}}
}'::jsonb);
select is((select array_agg(slug) from public.progress), array['valid-anagram'], 'ann progress replaced');
select is((select count(*) from public.review_logs)::int, 0, 'ann logs cleared by replace_all');

reset role;
select is((select count(*) from public.progress where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob progress alone');
select is((select count(*) from public.notes where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob notes alone');
select is((select count(*) from public.cards where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob cards alone');
select is((select count(*) from public.review_logs where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob logs alone');
select is((select count(*) from public.train_attempts where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob attempts alone');
select is((select count(*) from public.activity where user_id = '22222222-2222-2222-2222-222222222222')::int, 1, 'replace_all left bob activity alone');
select is((select user_id from public.progress where slug = 'valid-anagram'), '11111111-1111-1111-1111-111111111111'::uuid, 'replaced row belongs to ann despite payload user_id');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- delete_my_account removes the user and every owned row; bob is untouched.
select public.delete_my_account();
reset role;
select is((select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann deleted');
select is((select count(*) from public.profiles where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann profiles gone');
select is((select count(*) from public.progress where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann progress gone');
select is((select count(*) from public.notes where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann notes gone');
select is((select count(*) from public.cards where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann cards gone');
select is((select count(*) from public.review_logs where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann logs gone');
select is((select count(*) from public.train_attempts where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann attempts gone');
select is((select count(*) from public.activity where user_id = '11111111-1111-1111-1111-111111111111')::int, 0, 'ann activity gone');
select is(
  (select count(*) from public.profiles where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.progress where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.notes where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.cards where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.review_logs where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.train_attempts where user_id = '22222222-2222-2222-2222-222222222222')::int
  + (select count(*) from public.activity where user_id = '22222222-2222-2222-2222-222222222222')::int,
  7, 'bob rows intact');

select * from finish();
rollback;
