set search_path=public,extensions,pg_temp;

create table public.personal_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_key text not null,
  destination_id uuid references public.destinations(id) on delete set null,
  osm_type text check(osm_type in ('node','way','relation')),
  osm_id bigint check(osm_id > 0),
  name text not null,
  address text not null default '',
  category_id text,
  city_id text not null,
  city_name text not null,
  province text not null default '',
  relation_id bigint not null,
  lat double precision not null check(lat between -90 and 90),
  lon double precision not null check(lon between -180 and 180),
  source_url text,
  saved boolean not null default true,
  visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,place_key)
);
create table public.personal_place_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid references public.personal_places(id) on delete set null,
  place_name text not null,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index personal_events_owner_date on public.personal_place_events(user_id,created_at desc);
create table public.visit_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.personal_places(id),
  body text not null check(char_length(trim(body)) between 20 and 5000),
  revision integer not null default 1,
  status public.submission_status not null default 'pending',
  moderator_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,place_id)
);
alter table public.personal_places enable row level security;
alter table public.personal_place_events enable row level security;
alter table public.visit_stories enable row level security;
revoke all on public.personal_places,public.personal_place_events,public.visit_stories from anon,authenticated;
grant select on public.personal_places,public.personal_place_events,public.visit_stories to authenticated;
create policy personal_places_owner on public.personal_places for select to authenticated using(user_id=auth.uid());
create policy personal_events_owner on public.personal_place_events for select to authenticated using(user_id=auth.uid());
create policy visit_stories_owner on public.visit_stories for select to authenticated using(user_id=auth.uid());

create function public.save_personal_place(p_destination_id uuid default null,p_osm jsonb default null,p_city jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare uid uuid:=auth.uid(); d public.destinations; p public.personal_places; k text; ot text; oi bigint;
  nm text; addr text; cat text; cid text; cn text; prov text; rid bigint; la double precision; lo double precision; src text;
begin
  if uid is null then raise exception 'Masuk diperlukan'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  if p_destination_id is not null then
    select * into d from public.destinations where id=p_destination_id and publication_status='published';
    if not found then raise exception 'Tempat belum atau tidak lagi diterbitkan'; end if;
  else
    if coalesce(p_osm->>'id','') !~ '^(node|way|relation):[1-9][0-9]{0,14}$' then raise exception 'Identitas OSM tidak valid'; end if;
    ot:=split_part(p_osm->>'id',':',1); oi:=split_part(p_osm->>'id',':',2)::bigint;
    src:='https://www.openstreetmap.org/'||ot||'/'||oi;
    select * into d from public.destinations where publication_status='published' and regexp_replace(regexp_replace(source_url,'^https://openstreetmap.org/','https://www.openstreetmap.org/'),'[?#].*$','')=src order by id limit 1;
  end if;
  if d.id is not null then
    nm:=d.name; addr:=d.address; cat:=d.category_id; cid:=d.city_id;
    select name,province,osm_relation_id into cn,prov,rid from public.cities where id=cid;
    rid:=coalesce(rid,substring(cid from 'osm:relation:([0-9]+)')::bigint);
    cn:=coalesce(cn,cid); prov:=coalesce(prov,''); la:=ST_Y(d.location::geometry); lo:=ST_X(d.location::geometry); src:=d.source_url;
    if coalesce(src,'') ~ '^https://(www\.)?openstreetmap.org/(node|way|relation)/[1-9][0-9]*([?#].*)?$' then
      ot:=substring(src from 'openstreetmap.org/(node|way|relation)/'); oi:=substring(src from '/(?:node|way|relation)/([0-9]+)')::bigint;
    end if;
    k:='destination:'||d.id;
  else
    k:='osm:'||ot||':'||oi; nm:=trim(p_osm->>'name'); addr:=coalesce(p_osm->>'address','');
    cid:=p_city->>'id'; cn:=trim(p_city->>'name'); prov:=coalesce(p_city->>'province',''); rid:=(p_city->>'relationId')::bigint;
    la:=(p_osm->>'lat')::double precision; lo:=(p_osm->>'lon')::double precision;
    if coalesce(cid,'') !~ '^osm:relation:[1-9][0-9]+$' or cid<>'osm:relation:'||rid then raise exception 'Kota tidak valid'; end if;
    if coalesce(char_length(nm),0) not between 1 and 160 or coalesce(char_length(cn),0) not between 1 and 160 or char_length(addr)>2000 or char_length(prov)>160 then raise exception 'Informasi tempat tidak valid'; end if;
    if la is null or lo is null or not(la between -90 and 90 and lo between -180 and 180) then raise exception 'Koordinat tidak valid'; end if;
  end if;
  select * into p from public.personal_places where user_id=uid and (place_key=k or (ot is not null and osm_type=ot and osm_id=oi)) order by created_at limit 1 for update;
  if found then
    if not p.saved then
      update public.personal_places set saved=true,updated_at=now() where id=p.id returning * into p;
      insert into public.personal_place_events(user_id,place_id,place_name,kind) values(uid,p.id,p.name,'saved');
    end if;
    if d.id is not null and p.destination_id is null then
      update public.personal_places set destination_id=d.id,place_key=k,name=nm,address=addr,category_id=cat,city_id=cid,city_name=cn,province=prov,relation_id=rid,lat=la,lon=lo,source_url=src,osm_type=ot,osm_id=oi,updated_at=now() where id=p.id returning * into p;
    end if;
  else
    insert into public.personal_places(user_id,place_key,destination_id,osm_type,osm_id,name,address,category_id,city_id,city_name,province,relation_id,lat,lon,source_url)
    values(uid,k,d.id,ot,oi,nm,addr,cat,cid,cn,prov,rid,la,lo,src) returning * into p;
    insert into public.personal_place_events(user_id,place_id,place_name,kind) values(uid,p.id,p.name,'saved');
  end if;
  return to_jsonb(p)-'user_id';
end $$;

create function public.list_personal_places() returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  return coalesce((select jsonb_agg((to_jsonb(p)-'user_id')||jsonb_build_object('publication_status',case when p.place_key like 'destination:%' then coalesce(d.publication_status,'archived') else null end,
    'story',(select to_jsonb(s)-'user_id' from public.visit_stories s where s.place_id=p.id and s.user_id=auth.uid())) order by p.updated_at desc)
    from public.personal_places p left join public.destinations d on d.id=p.destination_id where p.user_id=auth.uid()),'[]'::jsonb);
end $$;

create function public.update_personal_place(p_id uuid,p_action text,p_date date default null,p_timezone text default 'Asia/Jakarta') returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare p public.personal_places; event text; info text; today date;
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  select * into p from public.personal_places where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'Tempat pribadi tidak ditemukan'; end if;
  if p_action='unsave' then
    if p.saved then update public.personal_places set saved=false,updated_at=now() where id=p.id returning * into p; event:='unsaved'; end if;
  elsif p_action='visit' then
    if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Zona waktu tidak valid'; end if;
    today:=(now() at time zone p_timezone)::date;
    if p_date is null or p_date>today or p_date<date '1900-01-01' then raise exception 'Tanggal kunjungan tidak valid'; end if;
    if p.visited_on is distinct from p_date then
      event:=case when p.visited_on is null then 'visited' else 'visit_date_changed' end; info:=p_date::text;
      update public.personal_places set visited_on=p_date,updated_at=now() where id=p.id returning * into p;
    end if;
  elsif p_action='unvisit' then
    if p.visited_on is not null then update public.personal_places set visited_on=null,updated_at=now() where id=p.id returning * into p; event:='visit_cancelled'; end if;
  else raise exception 'Aksi tidak valid'; end if;
  if event is not null then insert into public.personal_place_events(user_id,place_id,place_name,kind,detail) values(auth.uid(),p.id,p.name,event,info); end if;
  return to_jsonb(p)-'user_id';
end $$;

create function public.personal_timeline(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  if p_offset<0 or p_offset>100000 then raise exception 'Halaman tidak valid'; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id) from (
    select * from (
      select e.id::text,e.place_id,e.place_name,e.kind,e.detail,e.created_at from public.personal_place_events e where e.user_id=auth.uid()
      union all select s.id::text,null::uuid,s.name,'submission_sent',null::text,s.created_at from public.submissions s where s.contributor_id=auth.uid()
      union all select m.id::text,null::uuid,s.name,'submission_'||m.action,m.note,m.created_at from public.moderation_events m join public.submissions s on s.id=m.submission_id where s.contributor_id=auth.uid()
    ) all_events order by created_at desc,id limit 50 offset p_offset
  ) t),'[]'::jsonb);
end $$;

create function public.submit_visit_story(p_place_id uuid,p_body text) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare p public.personal_places; s public.visit_stories;
begin
  if auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  select * into p from public.personal_places where id=p_place_id and user_id=auth.uid() for update;
  if not found or p.visited_on is null then raise exception 'Tandai tempat sudah dikunjungi sebelum menulis cerita'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 20 and 5000 then raise exception 'Cerita harus 20 sampai 5000 karakter'; end if;
  select * into s from public.visit_stories where place_id=p.id and user_id=auth.uid() for update;
  if s.status='published' then raise exception 'Cerita ini sudah diterbitkan'; end if;
  if s.id is not null and s.status='pending' and s.body=trim(p_body) then return to_jsonb(s)-'user_id'; end if;
  insert into public.visit_stories(user_id,place_id,body) values(auth.uid(),p.id,trim(p_body))
  on conflict(user_id,place_id) do update set body=excluded.body,revision=visit_stories.revision+1,status='pending',moderator_note=null,reviewed_at=null,reviewed_by=null,updated_at=now() returning * into s;
  insert into public.personal_place_events(user_id,place_id,place_name,kind) values(auth.uid(),p.id,p.name,'story_submitted');
  return to_jsonb(s)-'user_id';
end $$;

create function public.list_visit_stories(p_scope text,p_city_id text default null,p_status text default null,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
begin
  if p_scope is null or p_scope not in ('mine','admin','public') then raise exception 'Lingkup tidak valid'; end if;
  if p_scope='mine' and auth.uid() is null then raise exception 'Masuk diperlukan'; end if;
  if p_scope='admin' and not public.is_moderator() then raise exception 'Akses admin diperlukan'; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Halaman tidak valid'; end if;
  if p_status is not null and p_status not in ('pending','published','rejected','needs_revision') then raise exception 'Status tidak valid'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.updated_at desc) from (
    select s.id,s.place_id,s.body,s.revision,s.status,s.created_at,s.updated_at,s.reviewed_at,
      case when p_scope<>'public' then s.moderator_note else null end as moderator_note,
      p.name,p.address,p.category_id,p.city_id,p.city_name,p.province,p.relation_id,p.lat,p.lon,p.source_url,p.osm_type,p.osm_id,p.destination_id,
      case when pr.public_profile then pr.display_name else 'Kontributor' end as author_label,
      case when p.place_key like 'destination:%' then coalesce(d.publication_status,'archived') else null end as publication_status
    from public.visit_stories s join public.personal_places p on p.id=s.place_id join public.profiles pr on pr.id=s.user_id left join public.destinations d on d.id=p.destination_id
    where (p_city_id is null or p.city_id=p_city_id) and (p_status is null or s.status::text=p_status) and (case p_scope when 'public' then s.status='published' when 'mine' then s.user_id=auth.uid() else true end)
    order by s.updated_at desc,s.id limit 100 offset p_offset
  ) r),'[]'::jsonb);
end $$;

create function public.moderate_visit_story(p_id uuid,p_action text,p_note text default null,p_revision integer default null) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare s public.visit_stories; p public.personal_places;
begin
  if not public.is_moderator() then raise exception 'Akses admin diperlukan'; end if;
  if p_action not in ('published','rejected','needs_revision') then raise exception 'Keputusan tidak valid'; end if;
  if p_action in ('rejected','needs_revision') and char_length(trim(coalesce(p_note,'')))<4 then raise exception 'Tulis alasan minimal 4 karakter'; end if;
  select * into s from public.visit_stories where id=p_id for update;
  if not found then raise exception 'Cerita tidak ditemukan'; end if;
  if p_revision is null or p_revision<>s.revision then raise exception 'Cerita berubah sejak dibuka. Muat ulang sebelum memberi keputusan.'; end if;
  if s.status::text=p_action then return; end if;
  if s.status<>'pending' then raise exception 'Cerita tidak sedang menunggu tinjauan'; end if;
  update public.visit_stories set status=p_action::public.submission_status,moderator_note=nullif(trim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=s.id;
  select * into p from public.personal_places where id=s.place_id;
  insert into public.personal_place_events(user_id,place_id,place_name,kind,detail) values(s.user_id,p.id,p.name,'story_'||p_action,nullif(trim(p_note),''));
end $$;

revoke execute on function public.save_personal_place(uuid,jsonb,jsonb),public.list_personal_places(),public.update_personal_place(uuid,text,date,text),public.personal_timeline(integer),public.submit_visit_story(uuid,text),public.list_visit_stories(text,text,text,integer),public.moderate_visit_story(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.save_personal_place(uuid,jsonb,jsonb),public.list_personal_places(),public.update_personal_place(uuid,text,date,text),public.personal_timeline(integer),public.submit_visit_story(uuid,text),public.moderate_visit_story(uuid,text,text,integer) to authenticated;
grant execute on function public.list_visit_stories(text,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
