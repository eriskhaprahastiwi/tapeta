-- Run only on a disposable development project after both migrations.
-- All fixtures and changes are rolled back, including auth users.
begin;
insert into public.cities(id,name,province,osm_relation_id)
values('osm:relation:999999999999999','QA Boundary City','QA',999999999999999);
insert into public.city_regions(city_id,code,name,boundary)
values(
  'osm:relation:999999999999999','QA.01','QA Boundary Region',
  ST_Multi(ST_MakeEnvelope(101.40,0.50,101.50,0.60,4326))::geometry(MULTIPOLYGON,4326)
);
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
select public.submit_destination('osm:relation:999999999999999','QA fixture only','budaya','Alamat uji saja',null,'Fixture transaksi',0.53,101.44,'QA.01',null,'Fixture pengujian');
do $$ declare original_id uuid; retry_result jsonb; begin
  select id into original_id from public.submissions where name='QA fixture only';
  retry_result := public.submit_destination('osm:relation:999999999999999','qa fixture only','budaya','Alamat uji saja',null,'Fixture transaksi',0.53,101.44,'QA.01',null,'Fixture pengujian');
  if retry_result->>'id' <> original_id::text then raise exception 'Submission retry made a duplicate'; end if;
end $$;
do $$ declare outside_rejected boolean := false; begin
  begin
    perform public.submit_destination('osm:relation:999999999999999','QA near-boundary outside','budaya','Alamat uji saja',null,'Titik 50 meter di luar batas',0.53,101.39955,'QA.01',null,'Sumber uji');
  exception when raise_exception then outside_rejected := true; end;
  if not outside_rejected then raise exception using errcode='ZX003',message='Submission 50 m outside city boundary was accepted'; end if;
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
do $$ declare result jsonb; begin
  result := public.admin_import_destinations(
    jsonb_build_array(jsonb_build_object(
      'city_id','osm:relation:999999999999999','sticker_slug','qa-boundary-approximate',
      'name','QA imported approximate','category_id','kafe','address','Alamat uji',
      'lat',0.53,'lon',101.44,'region_code','QA.01','source_url','https://example.invalid',
      'source_label','Sumber uji','coordinate_source','test','coordinate_confidence','approximate'
    )),
    'qa-location-safety'
  );
  if result->>'inserted' <> '1' then raise exception 'In-city draft import failed: %',result; end if;
end $$;
do $$ declare item public.destinations; denied boolean := false; begin
  select * into item from public.destinations where sticker_slug='qa-boundary-approximate';
  begin
    perform public.admin_update_destination(item.id,item.name,item.category_id,item.address,item.hours,item.description,0,0,item.region_code,item.sticker_slug);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception using errcode='ZX004',message='Admin destination edit accepted coordinates outside city'; end if;
  perform public.admin_update_destination(item.id,item.name,item.category_id,item.address,item.hours,item.description,0.54,101.45,null,item.sticker_slug);
  if (select region_code from public.destinations where id=item.id) is null then raise exception 'Admin edit did not derive district code'; end if;
  denied := false;
  begin
    perform public.admin_verify_destination(item.id,'publish');
  exception when raise_exception then denied := true; end;
  if not denied then raise exception using errcode='ZX005',message='Unverified draft was published'; end if;
end $$;
select public.admin_verify_destination((select id from public.destinations where sticker_slug='qa-boundary-approximate'),'verify');
select public.admin_verify_destination((select id from public.destinations where sticker_slug='qa-boundary-approximate'),'publish');
do $$ begin
  if (select publication_status from public.destinations where sticker_slug='qa-boundary-approximate') <> 'published' then raise exception 'Verified draft did not publish'; end if;
end $$;
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
select public.submit_destination('osm:relation:999999999999999','QA rejection fixture','budaya','Alamat uji kedua',null,'Fixture penolakan',0.531,101.441,'QA.01',null,'Sumber uji kedua');
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

set local role service_role;
do $$ declare outside_rejected boolean := false; begin
  begin
    insert into public.destinations(city_id,name,category_id,address,location,source_label,publication_status)
    values('osm:relation:999999999999999','QA service role outside','kafe','Alamat uji',
      ST_SetSRID(ST_MakePoint(0,0),4326)::geography,'Sumber uji','draft');
  exception when raise_exception then outside_rejected := true; end;
  if not outside_rejected then raise exception 'Service role inserted an out-of-city destination'; end if;
  insert into public.destinations(city_id,name,category_id,address,location,source_label,publication_status)
  values('osm:relation:999999999999999','QA service role inside','kafe','Alamat uji',
    ST_SetSRID(ST_MakePoint(101.44,0.53),4326)::geography,'Sumber uji','draft');
  if not exists(select 1 from public.destinations where name='QA service role inside' and region_code='QA.01') then
    raise exception 'Service role in-city write did not derive district code';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform * from public.submissions;
    raise exception 'Anon read private submissions';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
