create extension if not exists pgcrypto;
create extension if not exists postgis;
set search_path = public, extensions;

create type public.tapeta_role as enum ('contributor', 'moderator', 'admin');
create type public.submission_status as enum ('pending', 'needs_revision', 'published', 'rejected');

create table public.cities (
  id text primary key,
  name text not null,
  province text not null,
  osm_relation_id bigint,
  illustration_status text not null default 'not_available' check (illustration_status in ('not_available','draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.city_regions (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id) on delete cascade,
  code text not null,
  name text not null,
  boundary geometry(multipolygon,4326),
  unique(city_id,code)
);
create index city_regions_boundary_gix on public.city_regions using gist(boundary);

create table public.city_illustration_packs (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id) on delete cascade,
  asset_path text not null,
  source_url text,
  license text,
  bounds jsonb not null,
  boundary_version text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_by uuid,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.tapeta_role not null default 'contributor',
  public_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.city_illustration_packs add constraint city_illustration_packs_publisher_fk foreign key (published_by) references public.profiles(id);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  city_id text not null,
  name text not null check (char_length(name) between 2 and 160),
  category_id text not null,
  address text not null default '',
  hours text,
  description text,
  location geography(point, 4326) not null,
  region_code text,
  source_url text,
  source_label text,
  image_url text,
  image_license text,
  verified_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index destinations_city_idx on public.destinations(city_id);
create index destinations_location_gix on public.destinations using gist(location);

create table public.destination_stickers (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null unique references public.destinations(id) on delete cascade,
  asset_path text not null,
  alt_text text not null,
  source_url text,
  license text,
  version integer not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(id) on delete restrict,
  city_id text not null,
  name text not null check (char_length(name) between 2 and 160),
  category_id text not null,
  address text not null,
  hours text,
  description text,
  location geography(point, 4326) not null,
  region_code text,
  source_url text,
  source_label text,
  status public.submission_status not null default 'pending',
  moderator_note text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_status_created_idx on public.submissions(status, created_at desc);
create index submissions_owner_idx on public.submissions(contributor_id, created_at desc);
create index submissions_location_gix on public.submissions using gist(location);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('published', 'needs_revision', 'rejected')),
  note text,
  created_at timestamptz not null default now()
);

create function public.is_moderator()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator','admin')) $$;

create function public.submit_destination(
  p_city_id text, p_name text, p_category_id text, p_address text,
  p_hours text, p_description text, p_lat double precision, p_lon double precision,
  p_region_code text, p_source_url text, p_source_label text
) returns jsonb language plpgsql security invoker set search_path = public
as $$
declare result public.submissions;
begin
  if auth.uid() is null then raise exception 'Login diperlukan untuk mengirim usulan'; end if;
  if p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception 'Koordinat tidak valid'; end if;
  insert into public.submissions(contributor_id,city_id,name,category_id,address,hours,description,location,region_code,source_url,source_label)
  values(auth.uid(),p_city_id,trim(p_name),p_category_id,trim(p_address),nullif(trim(p_hours),''),nullif(trim(p_description),''),ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,p_region_code,nullif(trim(p_source_url),''),nullif(trim(p_source_label),''))
  returning * into result;
  return jsonb_build_object('id',result.id,'name',result.name,'category_id',result.category_id,'address',result.address,'hours',result.hours,'description',result.description,'status',result.status,'region_code',result.region_code,'created_at',result.created_at,'lat',p_lat,'lon',p_lon);
end;
$$;

create function public.list_my_submissions()
returns setof jsonb language sql stable security invoker set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object('id',s.id,'name',s.name,'category_id',s.category_id,'address',s.address,'hours',s.hours,'description',s.description,'status',s.status,'moderator_note',s.moderator_note,'region_code',s.region_code,'created_at',s.created_at,'lat',ST_Y(s.location::geometry),'lon',ST_X(s.location::geometry),'display_name',p.display_name)
  from public.submissions s join public.profiles p on p.id=s.contributor_id
  where s.contributor_id=auth.uid() order by s.created_at desc;
$$;

create function public.public_destinations(p_city_id text)
returns setof jsonb language sql stable security invoker set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object('id',d.id,'name',d.name,'category_id',d.category_id,'address',d.address,'description',d.description,'region_code',d.region_code,'lat',ST_Y(d.location::geometry),'lon',ST_X(d.location::geometry),'source_label',d.source_label,'source_url',d.source_url,'updated_at',d.updated_at,'hours',d.hours)
  from public.destinations d where d.city_id=p_city_id order by d.name;
$$;

create function public.list_admin_submissions()
returns setof jsonb language sql stable security invoker set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object('id',s.id,'name',s.name,'category_id',s.category_id,'address',s.address,'hours',s.hours,'description',s.description,'status',s.status,'moderator_note',s.moderator_note,'region_code',s.region_code,'created_at',s.created_at,'lat',ST_Y(s.location::geometry),'lon',ST_X(s.location::geometry),'display_name',p.display_name,'source_url',s.source_url,'source_label',s.source_label)
  from public.submissions s join public.profiles p on p.id=s.contributor_id
  where public.is_moderator() order by s.created_at desc;
$$;

create function public.admin_summary()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  return jsonb_build_object(
    'pending', (select count(*) from public.submissions where status='pending'),
    'needs_revision', (select count(*) from public.submissions where status='needs_revision'),
    'published_submissions', (select count(*) from public.submissions where status='published'),
    'published_destinations', (select count(*) from public.destinations),
    'active_contributors_30d', (select count(distinct contributor_id) from public.submissions where created_at >= now() - interval '30 days'),
    'new_contributors_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days')
  );
end;
$$;

create function public.admin_contributors()
returns setof jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('id',p.id,'display_name',p.display_name,'public_profile',p.public_profile,'total_submissions',count(s.id),'published_submissions',count(s.id) filter (where s.status='published'),'last_contributed_at',max(s.created_at))
  from public.profiles p left join public.submissions s on s.contributor_id=p.id
  where public.is_moderator() group by p.id,p.display_name,p.public_profile order by max(s.created_at) desc nulls last;
$$;

create function public.admin_moderation_history()
returns setof jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('id',e.id,'submission_id',e.submission_id,'place_name',s.name,'actor_name',p.display_name,'action',e.action,'note',e.note,'created_at',e.created_at)
  from public.moderation_events e join public.profiles p on p.id=e.actor_id left join public.submissions s on s.id=e.submission_id
  where public.is_moderator() order by e.created_at desc limit 200;
$$;

create function public.moderate_submission(p_submission_id uuid, p_action public.submission_status, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare s public.submissions; actor uuid := auth.uid(); destination_id uuid;
begin
  if actor is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_action not in ('published','needs_revision','rejected') then raise exception 'Keputusan tidak valid'; end if;
  if p_action in ('needs_revision','rejected') and nullif(trim(p_note),'') is null then raise exception 'Alasan wajib diisi'; end if;
  select * into s from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'Usulan tidak ditemukan'; end if;
  if s.status in ('published','rejected') then raise exception 'Usulan sudah diputuskan'; end if;
  update public.submissions set status=p_action,moderator_note=nullif(trim(p_note),''),decided_by=actor,decided_at=now(),updated_at=now() where id=p_submission_id returning * into s;
  insert into public.moderation_events(submission_id,actor_id,action,note) values(s.id,actor,p_action::text,nullif(trim(p_note),''));
  if p_action='published' then
    insert into public.destinations(city_id,name,category_id,address,hours,description,location,region_code,source_url,source_label,verified_by)
    values(s.city_id,s.name,s.category_id,s.address,s.hours,s.description,s.location,s.region_code,s.source_url,s.source_label,actor)
    returning id into destination_id;
  end if;
  insert into public.notifications(user_id,title,body)
  values(s.contributor_id,case p_action when 'published' then 'Tempatmu sudah terverifikasi' when 'needs_revision' then 'Usulan perlu diperbaiki' else 'Pembaruan usulan' end,coalesce(nullif(trim(p_note),''),case p_action when 'published' then s.name||' kini tampil di peta TAPETA.' else 'Status usulan “'||s.name||'” telah diperbarui.' end));
  return jsonb_build_object('id',s.id,'status',s.status,'moderator_note',s.moderator_note,'destination_id',destination_id,'created_at',s.created_at);
end;
$$;

create function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.submissions enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_events enable row level security;
alter table public.cities enable row level security;
alter table public.city_regions enable row level security;
alter table public.city_illustration_packs enable row level security;
alter table public.destination_stickers enable row level security;

create policy "published destinations are public" on public.destinations for select using (true);
create policy "users read own profile and public profiles" on public.profiles for select
  using (id = auth.uid() or public_profile or public.is_moderator());
create policy "users update own display profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "contributors read own submissions" on public.submissions for select
  using (contributor_id = auth.uid() or public.is_moderator());
create policy "contributors submit places" on public.submissions for insert
  with check (contributor_id = auth.uid() and status = 'pending');
create policy "moderators update submissions" on public.submissions for update
  using (public.is_moderator()) with check (public.is_moderator());
create policy "users read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users mark own notifications read" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "moderators read audit history" on public.moderation_events for select using (public.is_moderator());
create policy "moderators create audit history" on public.moderation_events for insert with check (public.is_moderator() and actor_id = auth.uid());
create policy "public reads cities" on public.cities for select using (true);
create policy "public reads boundaries" on public.city_regions for select using (true);
create policy "public reads published illustration packs" on public.city_illustration_packs for select using (status='published');
create policy "moderators manage illustration packs" on public.city_illustration_packs for all using (public.is_moderator()) with check (public.is_moderator());
create policy "public reads published stickers" on public.destination_stickers for select using (published);
create policy "moderators manage stickers" on public.destination_stickers for all using (public.is_moderator()) with check (public.is_moderator());

grant usage on schema public to anon, authenticated;
grant select on public.destinations to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, public_profile) on public.profiles to authenticated;
grant select, insert, update on public.submissions to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.moderation_events to authenticated;
grant select on public.cities, public.city_regions, public.city_illustration_packs, public.destination_stickers to anon, authenticated;
grant insert, update, delete on public.city_illustration_packs, public.destination_stickers to authenticated;
grant execute on function public.submit_destination(text,text,text,text,text,text,double precision,double precision,text,text,text) to authenticated;
grant execute on function public.list_my_submissions() to authenticated;
grant execute on function public.public_destinations(text) to anon, authenticated;
grant execute on function public.list_admin_submissions() to authenticated;
grant execute on function public.admin_summary() to authenticated;
grant execute on function public.admin_contributors() to authenticated;
grant execute on function public.admin_moderation_history() to authenticated;
grant execute on function public.moderate_submission(uuid,public.submission_status,text) to authenticated;

-- Admin pertama harus dipromosikan secara manual oleh pemilik project melalui SQL Editor.
-- Jangan memberi role admin lewat metadata atau UI browser.
