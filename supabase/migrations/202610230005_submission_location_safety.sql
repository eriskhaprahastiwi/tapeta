-- Apply the same city/district boundary rule to every server write path.
create or replace function public.resolve_city_region(
  p_city_id text,
  p_location geography,
  p_region_code text default null
) returns text
language plpgsql stable security definer
set search_path=public,extensions,pg_temp as $$
declare resolved_code text;
begin
  if p_location is null then raise exception 'Koordinat tidak valid'; end if;
  if not exists (
    select 1 from public.city_regions
    where city_id=p_city_id and boundary is not null
  ) then
    raise exception 'Batas wilayah kota belum tersedia';
  end if;

  select r.code into resolved_code
  from public.city_regions r
  where r.city_id=p_city_id
    and r.boundary is not null
    and ST_Covers(r.boundary,p_location::geometry)
    and (p_region_code is null or p_region_code='' or r.code=p_region_code)
  order by r.code
  limit 1;

  if resolved_code is null then
    if coalesce(p_region_code,'')='' then
      raise exception 'Titik di luar batas kota';
    end if;
    raise exception 'Titik tidak berada di kecamatan yang dipilih';
  end if;
  return resolved_code;
end $$;
revoke execute on function public.resolve_city_region(text,geography,text) from public,anon,authenticated;

create or replace function public.validate_submission()
returns trigger language plpgsql
set search_path=public,extensions,pg_temp as $$
begin
  if new.city_id !~ '^osm:relation:[0-9]+$' then raise exception 'Identitas kota OSM wajib diisi'; end if;
  if new.category_id not in ('kafe','kuliner','alam','budaya','rekreasi','lainnya') then raise exception 'Kategori tidak valid'; end if;
  if char_length(trim(coalesce(new.name,''))) not between 2 and 160
     or char_length(trim(coalesce(new.address,''))) not between 4 and 1000 then
    raise exception 'Nama atau alamat tidak valid';
  end if;
  if char_length(trim(coalesce(nullif(new.source_label,''),new.source_url,''))) not between 4 and 2000 then
    raise exception 'Sumber wajib diisi (4 sampai 2000 karakter)';
  end if;
  if new.source_url is not null and new.source_url !~* '^https?://' then raise exception 'URL sumber tidak valid'; end if;
  if char_length(coalesce(new.description,'')) > 5000 then raise exception 'Deskripsi terlalu panjang'; end if;

  new.region_code := public.resolve_city_region(new.city_id,new.location,new.region_code);
  return new;
end $$;

create or replace function public.validate_destination_location()
returns trigger language plpgsql
set search_path=public,extensions,pg_temp as $$
begin
  if TG_OP='UPDATE'
     and new.city_id is not distinct from old.city_id
     and new.location is not distinct from old.location
     and new.region_code is not distinct from old.region_code
     and new.publication_status is distinct from 'published' then
    return new;
  end if;
  new.region_code := public.resolve_city_region(new.city_id,new.location,new.region_code);
  return new;
end $$;
revoke execute on function public.validate_destination_location() from public,anon,authenticated;
drop trigger if exists validate_destination_location on public.destinations;
create trigger validate_destination_location
before insert or update of city_id,location,region_code,publication_status on public.destinations
for each row execute function public.validate_destination_location();

-- Existing Pekanbaru catalog rows have valid points but no stored district code.
-- Backfill only against a matching polygon; rows without city boundaries are untouched.
update public.destinations d
set region_code=public.resolve_city_region(d.city_id,d.location,null)
where exists (
  select 1 from public.city_regions r
  where r.city_id=d.city_id and r.boundary is not null
)
and d.region_code is distinct from public.resolve_city_region(d.city_id,d.location,null);

create or replace function public.admin_update_destination(
  p_destination_id uuid,
  p_name text,
  p_category_id text,
  p_address text,
  p_hours text,
  p_description text,
  p_lat double precision,
  p_lon double precision,
  p_region_code text,
  p_sticker_slug text default null
) returns jsonb
language plpgsql security definer
set search_path=public,extensions,pg_temp as $$
declare
  d public.destinations;
  target_slug text;
  resolved_region_code text;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then
    raise exception 'Koordinat tidak valid';
  end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'Nama minimal 2 karakter'; end if;
  select * into d from public.destinations where id=p_destination_id for update;
  if not found then raise exception 'Destinasi tidak ditemukan'; end if;

  resolved_region_code := public.resolve_city_region(
    d.city_id,
    ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,
    null
  );
  target_slug := coalesce(nullif(trim(p_sticker_slug),''),d.sticker_slug);
  if target_slug is distinct from d.sticker_slug and exists(
    select 1 from public.destinations where sticker_slug=target_slug and id<>p_destination_id
  ) then raise exception 'Stiker % sudah dipakai destinasi lain',target_slug; end if;

  update public.destinations set
    name=trim(p_name),
    category_id=coalesce(nullif(p_category_id,''),category_id),
    address=trim(coalesce(p_address,'')),
    hours=coalesce(nullif(trim(p_hours),''),hours),
    description=coalesce(nullif(trim(p_description),''),description),
    location=ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,
    region_code=resolved_region_code,
    sticker_slug=target_slug,
    updated_at=now()
  where id=p_destination_id;

  if target_slug is not null then
    insert into public.destination_stickers(destination_id,asset_path,alt_text,slug,published)
    values(p_destination_id,'/assets/stickers/'||target_slug||'.png',trim(p_name),target_slug,
      (select publication_status='published' from public.destinations where id=p_destination_id))
    on conflict(destination_id) do update
      set asset_path=excluded.asset_path,alt_text=excluded.alt_text,slug=excluded.slug;
  end if;

  return jsonb_build_object('id',p_destination_id,'sticker_slug',target_slug,'updated_at',now());
end $$;
revoke execute on function public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text) from public,anon;
grant execute on function public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text) to authenticated;

create or replace function public.admin_verify_destination(
  p_destination_id uuid,
  p_action text
) returns jsonb
language plpgsql security definer
set search_path=public,extensions,pg_temp as $$
declare d public.destinations;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_action not in ('verify','publish','unpublish','archive','restore') then raise exception 'Aksi tidak valid'; end if;
  select * into d from public.destinations where id=p_destination_id for update;
  if not found then raise exception 'Destinasi tidak ditemukan'; end if;
  if p_action='publish' and d.publication_status <> 'verified' then
    raise exception 'Verifikasi destinasi sebelum menerbitkannya';
  end if;

  if p_action='verify' then
    update public.destinations set publication_status='verified',verified_at=now(),verified_by=auth.uid(),updated_at=now()
    where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  elsif p_action='publish' then
    update public.destinations set publication_status='published',verified_at=coalesce(verified_at,now()),
      verified_by=coalesce(verified_by,auth.uid()),updated_at=now()
    where id=p_destination_id;
    update public.destination_stickers set published=true where destination_id=p_destination_id;
  elsif p_action='unpublish' then
    update public.destinations set publication_status='verified',updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  elsif p_action='archive' then
    update public.destinations set publication_status='archived',updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  else
    update public.destinations set publication_status='verified',updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  end if;

  return jsonb_build_object('id',p_destination_id,
    'status',(select publication_status from public.destinations where id=p_destination_id),
    'sticker_published',(select coalesce(bool_or(published),false) from public.destination_stickers where destination_id=p_destination_id));
end $$;
revoke execute on function public.admin_verify_destination(uuid,text) from public,anon;
grant execute on function public.admin_verify_destination(uuid,text) to authenticated;
