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
