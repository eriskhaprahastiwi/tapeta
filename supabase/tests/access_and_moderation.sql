-- Run only on a disposable development project after both migrations.
-- All fixtures and changes are rolled back, including auth users.
begin;
do $$ begin
  if has_column_privilege('authenticated','public.profiles','role','UPDATE') then raise exception 'Role column is writable'; end if;
  if has_table_privilege('authenticated','public.submissions','UPDATE') then raise exception 'Direct moderation is allowed'; end if;
  if has_table_privilege('authenticated','public.submissions','INSERT') then raise exception 'RPC submission validation can be bypassed'; end if;
  if has_column_privilege('authenticated','public.notifications','body','UPDATE') then raise exception 'Notification body is writable'; end if;
end $$;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('10000000-0000-4000-8000-000000000001','authenticated','authenticated','contributor-a@example.invalid','',now(),'{}','{"display_name":"Contributor A","role":"admin"}',now(),now()),
('10000000-0000-4000-8000-000000000002','authenticated','authenticated','contributor-b@example.invalid','',now(),'{}','{"display_name":"Contributor B"}',now(),now()),
('10000000-0000-4000-8000-000000000003','authenticated','authenticated','moderator@example.invalid','',now(),'{}','{"display_name":"Moderator"}',now(),now());
update public.profiles set role='moderator' where id='10000000-0000-4000-8000-000000000003';
do $$ begin
  if (select role from public.profiles where id='10000000-0000-4000-8000-000000000001') <> 'contributor' then raise exception 'Metadata escalated role'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.submit_destination('osm:relation:16563796','QA fixture only','budaya','Alamat uji saja',null,'Fixture transaksi',0.53,101.44,null,null,'Fixture pengujian');
do $$ declare original_id uuid; retry_result jsonb; begin
  select id into original_id from public.submissions where name='QA fixture only';
  retry_result := public.submit_destination('osm:relation:16563796','qa fixture only','budaya','Alamat uji saja',null,'Fixture transaksi',0.53,101.44,null,null,'Fixture pengujian');
  if retry_result->>'id' <> original_id::text then raise exception 'Submission retry made a duplicate'; end if;
end $$;
do $$ declare denied boolean := false; begin
  if (select count(*) from public.submissions) <> 1 then raise exception 'Owner cannot read submission'; end if;
  if exists(select 1 from public.destinations where name='QA fixture only') then raise exception 'Pending is public'; end if;
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'Escalation unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.moderate_submission((select id from public.submissions limit 1),'published',null);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception using errcode='ZX001',message='Contributor moderated'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.submissions) then raise exception 'Cross-account leak'; end if;
  if exists(select 1 from public.notifications) then raise exception 'Cross-account notification leak'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select public.moderate_submission((select id from public.submissions where name='QA fixture only'),'needs_revision','Tambahkan sumber');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
  if not exists(select 1 from public.list_my_submissions() item where item->>'moderator_note'='Tambahkan sumber') then raise exception 'Contributor cannot read moderator reason'; end if;
end $$;
select public.revise_submission((select id from public.submissions where name='QA fixture only'),'QA fixture only','Alamat uji lengkap','Fixture revisi','Sumber fixture lengkap');
do $$ begin
  if not exists(select 1 from public.list_my_submissions() item where item->>'status'='pending' and item->>'revision'='2') then raise exception 'Revision was not resubmitted'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select public.moderate_submission((select id from public.submissions where name='QA fixture only'),'published',null);
select public.moderate_submission((select id from public.submissions where name='QA fixture only'),'published',null);
do $$ begin
  if (select count(*) from public.destinations where name='QA fixture only') <> 1 then raise exception 'Duplicate publication'; end if;
  if (select count(*) from public.moderation_events where submission_id=(select id from public.submissions where name='QA fixture only')) <> 2 then raise exception 'Decision audit mismatch'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.notifications) then raise exception 'Cross-account notification leak after moderation'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.submit_destination('osm:relation:16563796','QA rejection fixture','budaya','Alamat uji kedua',null,'Fixture penolakan',0.531,101.441,null,null,'Sumber uji kedua');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ declare rejected_without_note boolean := false; begin
  begin
    perform public.moderate_submission((select id from public.submissions where name='QA rejection fixture'),'rejected',null);
  exception when raise_exception then rejected_without_note := true; end;
  if not rejected_without_note then raise exception using errcode='ZX002',message='Rejection without reason was allowed'; end if;
end $$;
select public.moderate_submission((select id from public.submissions where name='QA rejection fixture'),'rejected','Sumber belum dapat diverifikasi');
do $$ begin
  if not exists(select 1 from public.submissions where name='QA rejection fixture' and status='rejected' and moderator_note='Sumber belum dapat diverifikasi') then raise exception 'Rejection reason not stored'; end if;
  if exists(select 1 from public.destinations where name='QA rejection fixture') then raise exception 'Rejected submission became public'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.notifications) <> 3 then raise exception 'Notification transaction mismatch'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform * from public.submissions;
    raise exception 'Anon read private submissions';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
