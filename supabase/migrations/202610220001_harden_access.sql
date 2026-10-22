-- Supabase may grant table privileges through default ACLs. Reset explicitly
-- before granting profile/notification columns; RLS alone does not protect role.
revoke all on public.profiles, public.notifications, public.submissions,
  public.moderation_events, public.destinations from anon, authenticated;
grant select on public.profiles, public.notifications, public.submissions, public.moderation_events to authenticated;
grant update(display_name, public_profile) on public.profiles to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select on public.destinations to anon, authenticated;
drop policy if exists "moderators update submissions" on public.submissions;
drop policy if exists "moderators create audit history" on public.moderation_events;

alter table public.submissions add column revision integer not null default 1;
alter table public.destinations add column submission_id uuid unique references public.submissions(id);
alter table public.destinations add column catalog_source_id text unique;

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_id uuid not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
create policy "moderators read role audit" on public.audit_events for select to authenticated using(public.is_moderator());
create function public.audit_role_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.role is distinct from new.role then
    insert into public.audit_events(actor_id,action,resource_id,details)
    values(auth.uid(),'role_changed',new.id,jsonb_build_object('previous_role',old.role,'new_role',new.role,'database_session',session_user));
  end if;
  return new;
end $$;
create trigger audit_role_change after update of role on public.profiles for each row execute function public.audit_role_change();
revoke execute on function public.audit_role_change() from public, anon, authenticated;

create table public.submission_revisions (
  submission_id uuid not null references public.submissions(id),
  revision integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key(submission_id, revision)
);
alter table public.submission_revisions enable row level security;
create policy "owner and moderators read revisions" on public.submission_revisions for select to authenticated
using (exists(select 1 from public.submissions s where s.id=submission_id and (s.contributor_id=auth.uid() or public.is_moderator())));
revoke all on public.submission_revisions from anon, authenticated;
grant select on public.submission_revisions to authenticated;

create function public.validate_submission() returns trigger language plpgsql set search_path=public,extensions,pg_temp as $$
begin
  if new.city_id !~ '^osm:relation:[0-9]+$' then raise exception 'Identitas kota OSM wajib diisi'; end if;
  if new.category_id not in ('kafe','kuliner','alam','budaya','rekreasi','lainnya') then raise exception 'Kategori tidak valid'; end if;
  if char_length(trim(coalesce(new.name,''))) not between 2 and 160 or char_length(trim(coalesce(new.address,''))) not between 4 and 1000 then raise exception 'Nama atau alamat tidak valid'; end if;
  if char_length(trim(coalesce(nullif(new.source_label,''),new.source_url,''))) not between 4 and 2000 then raise exception 'Sumber wajib diisi (4 sampai 2000 karakter)'; end if;
  if new.source_url is not null and new.source_url !~* '^https?://' then raise exception 'URL sumber tidak valid'; end if;
  if char_length(coalesce(new.description,'')) > 5000 then raise exception 'Deskripsi terlalu panjang'; end if;
  if new.region_code is not null and exists(select 1 from public.city_regions where city_id=new.city_id)
    and not exists(select 1 from public.city_regions where city_id=new.city_id and code=new.region_code)
    then raise exception 'Kode kecamatan tidak terdaftar untuk kota'; end if;
  if exists(select 1 from public.city_regions where city_id=new.city_id and boundary is not null)
    and not exists(select 1 from public.city_regions where city_id=new.city_id and ST_DWithin(boundary::geography,new.location,100))
    then raise exception 'Titik di luar batas kota'; end if;
  return new;
end $$;
create trigger validate_submission before insert or update on public.submissions for each row execute function public.validate_submission();

insert into public.submission_revisions(submission_id,revision,payload)
select s.id,s.revision,to_jsonb(s)-'location'
from public.submissions s
on conflict (submission_id,revision) do nothing;

create or replace function public.submit_destination(
  p_city_id text,p_name text,p_category_id text,p_address text,p_hours text,p_description text,
  p_lat double precision,p_lon double precision,p_region_code text,p_source_url text,p_source_label text
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare s public.submissions;
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  if p_lat is null or p_lon is null or not (p_lat between -90 and 90 and p_lon between -180 and 180) then raise exception 'Koordinat tidak valid'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into s from public.submissions where contributor_id=auth.uid() and city_id=p_city_id and lower(name)=lower(trim(p_name))
    and status='pending' and ST_DWithin(location,ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,1)
  order by created_at desc limit 1;
  if not found then
    if (select count(*) from public.submissions where contributor_id=auth.uid() and created_at > now()-interval '1 hour') >= 10 then raise exception 'Batas 10 usulan per jam tercapai'; end if;
    insert into public.submissions(contributor_id,city_id,name,category_id,address,hours,description,location,region_code,source_url,source_label)
    values(auth.uid(),p_city_id,trim(p_name),p_category_id,trim(p_address),nullif(trim(p_hours),''),nullif(trim(p_description),''),ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,p_region_code,nullif(trim(p_source_url),''),nullif(trim(p_source_label),'')) returning * into s;
    insert into public.submission_revisions(submission_id,revision,payload) values(s.id,s.revision,to_jsonb(s)-'location');
  end if;
  return jsonb_build_object('id',s.id,'name',s.name,'category_id',s.category_id,'address',s.address,
    'hours',s.hours,'description',s.description,'region_code',s.region_code,'status',s.status,
    'moderator_note',s.moderator_note,'created_at',s.created_at,'lat',ST_Y(s.location::geometry),
    'lon',ST_X(s.location::geometry),'display_name',(select display_name from public.profiles where id=s.contributor_id));
end $$;

create or replace function public.revise_submission(p_id uuid,p_name text,p_address text,p_description text,p_source text)
returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare s public.submissions;
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  select * into s from public.submissions where id=p_id and contributor_id=auth.uid() for update;
  if not found or s.status <> 'needs_revision' then raise exception 'Usulan tidak dapat direvisi'; end if;
  update public.submissions set name=trim(p_name),address=trim(p_address),description=trim(p_description),source_label=trim(p_source),
    status='pending',revision=revision+1,updated_at=now() where id=p_id returning * into s;
  insert into public.submission_revisions(submission_id,revision,payload) values(s.id,s.revision,to_jsonb(s)-'location');
end $$;

create or replace function public.moderate_submission(p_submission_id uuid,p_action public.submission_status,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare s public.submissions; destination_id uuid;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_action is null or p_action not in ('published','needs_revision','rejected') then raise exception 'Keputusan tidak valid'; end if;
  if p_action in ('needs_revision','rejected') and char_length(trim(coalesce(p_note,''))) < 4 then raise exception 'Alasan minimal 4 karakter'; end if;
  select * into s from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'Usulan tidak ditemukan'; end if;
  if s.status='published' and p_action='published' then
    select id into destination_id from public.destinations where submission_id=s.id;
    return jsonb_build_object('id',s.id,'destination_id',destination_id,'status',s.status);
  end if;
  if s.status <> 'pending' then raise exception 'Hanya usulan pending yang dapat diputuskan'; end if;
  if p_action='published' then
    perform pg_advisory_xact_lock(hashtext(s.city_id));
    if exists(select 1 from public.destinations where city_id=s.city_id and lower(name)=lower(s.name) and ST_DWithin(location,s.location,30)) then
      raise exception 'Kemungkinan duplikat dalam 30 meter. Minta perbaikan dan periksa identitas sumber.';
    end if;
    insert into public.destinations(city_id,name,category_id,address,hours,description,location,region_code,source_url,source_label,verified_by,submission_id)
    values(s.city_id,s.name,s.category_id,s.address,s.hours,s.description,s.location,s.region_code,s.source_url,s.source_label,auth.uid(),s.id) returning id into destination_id;
  end if;
  update public.submissions set status=p_action,moderator_note=nullif(trim(p_note),''),decided_by=auth.uid(),decided_at=now(),updated_at=now() where id=s.id;
  insert into public.moderation_events(submission_id,actor_id,action,note) values(s.id,auth.uid(),p_action::text,nullif(trim(p_note),''));
  insert into public.notifications(user_id,title,body) values(s.contributor_id,
    case p_action when 'published' then 'Usulan diterbitkan' when 'needs_revision' then 'Usulan perlu diperbaiki' else 'Usulan ditolak' end,
    s.name || ': ' || coalesce(nullif(trim(p_note),''),'Kini tersedia di peta TAPETA.'));
  return jsonb_build_object('id',s.id,'status',p_action,'destination_id',destination_id);
end $$;

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path=public as $$
declare display text := left(trim(coalesce(new.raw_user_meta_data->>'display_name','')),80);
begin
  if char_length(display)<2 then display := 'Kontributor'; end if;
  insert into public.profiles(id,display_name,role) values(new.id,display,'contributor');
  return new;
end $$;

-- Functions are executable by PUBLIC unless explicitly revoked.
create or replace function public.public_destinations(p_city_id text)
returns setof jsonb language sql stable security invoker set search_path=public,extensions,pg_temp as $$
  select jsonb_build_object('id',d.id,'name',d.name,'category_id',d.category_id,'address',d.address,
    'description',d.description,'region_code',d.region_code,'lat',ST_Y(d.location::geometry),'lon',ST_X(d.location::geometry),
    'source_label',d.source_label,'source_url',d.source_url,'updated_at',d.updated_at,'hours',d.hours,
    'sticker_path',s.asset_path,'sticker_alt',s.alt_text)
  from public.destinations d left join public.destination_stickers s on s.destination_id=d.id and s.published
  where d.city_id=p_city_id order by d.name;
$$;

create or replace function public.list_my_submissions()
returns setof jsonb language sql stable security invoker set search_path=public,extensions,pg_temp as $$
  select (to_jsonb(s)-'location') || jsonb_build_object('lat',ST_Y(s.location::geometry),'lon',ST_X(s.location::geometry),'display_name',p.display_name)
  from public.submissions s join public.profiles p on p.id=s.contributor_id
  where s.contributor_id=auth.uid() order by s.created_at desc;
$$;

create or replace function public.admin_moderation_history()
returns setof jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select item from (
    select jsonb_build_object('id',e.id,'submission_id',e.submission_id,'place_name',s.name,
      'actor_name',p.display_name,'action',e.action,'note',e.note,'created_at',e.created_at) as item
    from public.moderation_events e join public.profiles p on p.id=e.actor_id
    left join public.submissions s on s.id=e.submission_id
    where public.is_moderator()
    union all
    select jsonb_build_object('id',a.id,'submission_id',null,'place_name',coalesce(target.display_name,'Profil'),
      'actor_name',coalesce(actor.display_name,'Pemilik project'),'action',a.action,
      'note',a.details::text,'created_at',a.created_at)
    from public.audit_events a left join public.profiles target on target.id=a.resource_id
    left join public.profiles actor on actor.id=a.actor_id
    where public.is_moderator()
  ) events
  order by (item->>'created_at')::timestamptz desc limit 200;
$$;

revoke execute on function public.is_moderator(), public.public_destinations(text),
  public.submit_destination(text,text,text,text,text,text,double precision,double precision,text,text,text),
  public.revise_submission(uuid,text,text,text,text), public.list_my_submissions(), public.list_admin_submissions(),
  public.admin_summary(), public.admin_contributors(), public.admin_moderation_history(),
  public.moderate_submission(uuid,public.submission_status,text), public.create_profile_for_user(), public.validate_submission()
  from public, anon, authenticated;
grant execute on function public.is_moderator() to anon, authenticated;
alter function public.is_moderator() set search_path=public,pg_temp;
alter function public.list_admin_submissions() set search_path=public,extensions,pg_temp;
grant execute on function public.public_destinations(text) to anon, authenticated;
grant execute on function public.submit_destination(text,text,text,text,text,text,double precision,double precision,text,text,text),
  public.revise_submission(uuid,text,text,text,text), public.list_my_submissions(), public.list_admin_submissions(),
  public.admin_summary(), public.admin_contributors(), public.admin_moderation_history(),
  public.moderate_submission(uuid,public.submission_status,text) to authenticated;
