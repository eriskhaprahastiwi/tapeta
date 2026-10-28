-- Run on a disposable Supabase database AFTER all migrations. All fixtures roll back.
begin;
set search_path=public,extensions,pg_temp;
insert into public.cities(id,name,province,osm_relation_id) values('osm:relation:999999999999998','QA Community City','QA',999999999999998);
insert into public.city_regions(city_id,code,name,boundary) values('osm:relation:999999999999998','QA.02','QA District',ST_Multi(ST_MakeEnvelope(101.40,0.50,101.50,0.60,4326))::geometry(MULTIPOLYGON,4326));
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','community-qa-'||n||'@example.invalid','',now(),'{}','{"display_name":"QA Community"}',now(),now() from generate_series(1,5) n;
update public.profiles set role='moderator' where id='20000000-0000-4000-8000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
select set_config('tapeta.qa_submission',(public.submit_destination('osm:relation:999999999999998','QA Community Destination','budaya','Alamat QA komunitas',null,'Sumber pengamatan kunjungan',0.53,101.44,'QA.02',null,'Pengamatan langsung')->>'id'),true);
-- Self voting and forbidden text must fail, not merely be hidden by the UI.
do $$ declare denied boolean:=false; begin
 begin perform public.vote_submission(current_setting('tapeta.qa_submission')::uuid,'valid',''); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'Self vote was accepted'; end if;
 denied:=false;
 begin perform public.create_community_post('osm:relation:999999999999998','qna',null,'download video porno','QA content should be blocked','{}'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'Blocked keyword was published'; end if;
end $$;
select set_config('tapeta.qa_post',(public.create_community_post('osm:relation:999999999999998','qna',null,'Transportasi ke pusat kota','Adakah angkutan umum yang melewati pusat kota pada pagi hari?','{}')->>'id'),true);
do $$ begin
 if (select status from public.community_posts where id=current_setting('tapeta.qa_post')::uuid)<>'published' then raise exception 'Clean text did not auto-publish'; end if;
 if has_table_privilege('authenticated','public.community_posts','INSERT') then raise exception 'Direct post writes bypass RPC'; end if;
 if has_table_privilege('authenticated','public.submission_votes','INSERT') then raise exception 'Direct votes bypass RPC'; end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select public.vote_submission(current_setting('tapeta.qa_submission')::uuid,'valid','');
select public.vote_submission(current_setting('tapeta.qa_submission')::uuid,'valid','');
do $$ begin
 if (select count(*) from public.submission_votes where user_id=auth.uid())<>1 then raise exception 'Duplicate vote counted twice'; end if;
end $$;
select public.community_action(current_setting('tapeta.qa_post')::uuid,'comment','Ada angkutan umum melalui jalan utama.',1::smallint);
select public.community_action(current_setting('tapeta.qa_post')::uuid,'report','QA laporan pertama untuk pemeriksaan.',1::smallint);
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
select public.vote_submission(current_setting('tapeta.qa_submission')::uuid,'valid','');
select public.community_action(current_setting('tapeta.qa_post')::uuid,'report','QA laporan kedua untuk pemeriksaan.',1::smallint);
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',true);
select public.vote_submission(current_setting('tapeta.qa_submission')::uuid,'doubt','QA informasi lokasi perlu diperiksa.');
select public.community_action(current_setting('tapeta.qa_post')::uuid,'report','QA laporan ketiga untuk pemeriksaan.',1::smallint);
do $$ declare denied boolean:=false; begin
 begin perform public.review_community_content(current_setting('tapeta.qa_post')::uuid,'post','published','QA reviewed'); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'Contributor gained moderation access'; end if;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000005',true);
do $$ begin
 if not exists(select 1 from public.notifications where submission_id=current_setting('tapeta.qa_submission')::uuid and user_id=auth.uid()) then raise exception 'Real proposal notification missing'; end if;
 if (select status from public.community_posts where id=current_setting('tapeta.qa_post')::uuid)<>'review' then raise exception 'Three reports did not hide post'; end if;
end $$;
-- 2 out of 3 votes satisfies two-thirds; approved destinations remain transactional.
select public.moderate_submission(current_setting('tapeta.qa_submission')::uuid,'published',null);
select public.review_community_content(current_setting('tapeta.qa_post')::uuid,'post','published','QA reports reviewed with context');
reset role;
do $$ begin
 if (select count(*) from public.destinations where submission_id=current_setting('tapeta.qa_submission')::uuid)<>1 then raise exception 'Publication failed or duplicated'; end if;
end $$;
rollback;
