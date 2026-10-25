-- Bulk import destinasi + stiker landmark Pekanbaru.
-- Aditif: kolom opsional, fungsi baru, tanpa mengubah data lama.
-- Alur: importer -> destinasi status 'draft' + stiker belum terbit
--       -> admin verifikasi -> admin publikasikan -> tampil di Explore.
set search_path = public, extensions;

-- 1. Referensi stiker unik per destinasi (slug berkas di public/assets/stickers/).
alter table public.destinations add column if not exists sticker_slug text;
create unique index if not exists destinations_sticker_slug_uidx
  on public.destinations(sticker_slug) where sticker_slug is not null;

-- 2. Status publikasi eksplisit. Baris lama tetap 'published' seperti sebelumnya.
alter table public.destinations add column if not exists publication_status text not null default 'published';
alter table public.destinations drop constraint if exists destinations_publication_status_check;
alter table public.destinations add constraint destinations_publication_status_check
  check (publication_status in ('draft','verified','published','archived'));
create index if not exists destinations_publication_idx on public.destinations(city_id, publication_status);

-- 3. Asal dan keyakinan koordinat, agar hasil OSM tidak diklaim sebagai survei lapangan.
alter table public.destinations add column if not exists coordinate_source text;
alter table public.destinations add column if not exists coordinate_confidence text;
alter table public.destinations add column if not exists osm_type text;
alter table public.destinations add column if not exists osm_id bigint;
alter table public.destinations add column if not exists import_batch text;
create index if not exists destinations_osm_idx on public.destinations(osm_type, osm_id);
create index if not exists destinations_import_batch_idx on public.destinations(import_batch) where import_batch is not null;

-- Draft belum diverifikasi: verified_at harus boleh kosong.
alter table public.destinations alter column verified_at drop not null;
alter table public.destinations alter column verified_at drop default;

-- 4. Stiker: slug stabil + status terbit terpisah dari destinasi.
alter table public.destination_stickers add column if not exists slug text;
create unique index if not exists destination_stickers_slug_uidx
  on public.destination_stickers(slug) where slug is not null;

-- 5. Explore hanya membaca destinasi terbit DAN stiker yang ikut terbit.
create or replace function public.public_destinations(p_city_id text)
returns setof jsonb language sql stable security invoker set search_path=public,extensions,pg_temp as $$
  select jsonb_build_object('id',d.id,'name',d.name,'category_id',d.category_id,'address',d.address,
    'description',d.description,'region_code',d.region_code,'lat',ST_Y(d.location::geometry),'lon',ST_X(d.location::geometry),
    'source_label',d.source_label,'source_url',d.source_url,'updated_at',d.updated_at,'hours',d.hours,
    'sticker_path',s.asset_path,'sticker_alt',s.alt_text,'sticker_slug',d.sticker_slug,
    'pub_status',d.publication_status,'coordinate_source',d.coordinate_source,
    'verified_at',d.verified_at,'verified_by',d.verified_by)
  from public.destinations d
  left join public.destination_stickers s on s.destination_id=d.id and s.published
  where d.city_id=p_city_id and d.publication_status='published'
  order by d.name;
$$;

-- 6. Ringkasan dashboard: import yang belum terbit dihitung terpisah.
create or replace function public.admin_summary()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  return jsonb_build_object(
    'pending', (select count(*) from public.submissions where status='pending'),
    'needs_revision', (select count(*) from public.submissions where status='needs_revision'),
    'published_submissions', (select count(*) from public.submissions where status='published'),
    'published_destinations', (select count(*) from public.destinations where publication_status='published'),
    'published_destinations_all', (select count(*) from public.destinations),
    'import_drafts', (select count(*) from public.destinations where publication_status='draft'),
    'sticker_destinations', (select count(*) from public.destinations where sticker_slug is not null),
    'distinct_regions', (select count(distinct region_code) from public.destinations where publication_status='published'),
    'active_contributors_30d', (select count(distinct contributor_id) from public.submissions where created_at >= now() - interval '30 days'),
    'new_contributors_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days')
  );
end;
$$;

-- 7. Import massal. Idempoten per sticker_slug.
--    Baris tanpa koordinat TIDAK dibuatkan titik karangan: dikembalikan di
--    unresolved agar admin melengkapinya lewat alur kontribusi.
create or replace function public.admin_import_destinations(p_rows jsonb, p_batch text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare
  row jsonb;
  inserted int := 0;
  skipped int := 0;
  unresolved jsonb := '[]'::jsonb;
  new_id uuid;
  has_coords boolean;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'Payload import harus berupa array'; end if;

  for row in select * from jsonb_array_elements(p_rows) loop
    if coalesce(row->>'sticker_slug','') = '' or coalesce(row->>'name','') = '' then
      unresolved := unresolved || jsonb_build_array(jsonb_build_object('sticker_slug', row->>'sticker_slug', 'reason', 'slug atau nama kosong'));
      continue;
    end if;

    if exists(select 1 from public.destinations where sticker_slug = row->>'sticker_slug') then
      skipped := skipped + 1;
      continue;
    end if;

    has_coords := (row ? 'lat') and (row ? 'lon') and jsonb_typeof(row->'lat') = 'number' and jsonb_typeof(row->'lon') = 'number';
    if not has_coords then
      unresolved := unresolved || jsonb_build_array(jsonb_build_object(
        'sticker_slug', row->>'sticker_slug', 'name', row->>'name',
        'reason', coalesce(row->>'unresolved_reason','koordinat OSM belum ditemukan')));
      continue;
    end if;

    if (row->>'lat')::double precision not between -90 and 90
       or (row->>'lon')::double precision not between -180 and 180 then
      unresolved := unresolved || jsonb_build_array(jsonb_build_object(
        'sticker_slug', row->>'sticker_slug', 'name', row->>'name', 'reason', 'koordinat tidak valid'));
      continue;
    end if;

    begin
      insert into public.destinations(
        city_id, name, category_id, address, hours, description, location, region_code,
        source_url, source_label, sticker_slug, publication_status,
        coordinate_source, coordinate_confidence, osm_type, osm_id, import_batch, verified_at, verified_by)
      values(
        coalesce(row->>'city_id','osm:relation:16563796'), trim(row->>'name'),
        coalesce(row->>'category_id','lainnya'), coalesce(row->>'address',''),
        nullif(row->>'hours',''), nullif(row->>'description',''),
        ST_SetSRID(ST_MakePoint((row->>'lon')::double precision,(row->>'lat')::double precision),4326)::geography,
        nullif(row->>'region_code',''), nullif(row->>'source_url',''), nullif(row->>'source_label',''),
        row->>'sticker_slug', 'draft',
        coalesce(row->>'coordinate_source','osm'), coalesce(row->>'coordinate_confidence','exact'),
        nullif(row->>'osm_type',''), nullif(row->>'osm_id','')::bigint, p_batch, null, null)
      returning id into new_id;

      insert into public.destination_stickers(destination_id, asset_path, alt_text, slug, published)
      values(new_id, '/assets/stickers/'||(row->>'sticker_slug')||'.png', trim(row->>'name'), row->>'sticker_slug', false)
      on conflict (destination_id) do update set asset_path=excluded.asset_path, alt_text=excluded.alt_text, slug=excluded.slug;

      inserted := inserted + 1;
    exception when others then
      unresolved := unresolved || jsonb_build_array(jsonb_build_object(
        'sticker_slug', row->>'sticker_slug', 'name', row->>'name', 'reason', SQLERRM));
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'skipped', skipped,
    'unresolved', unresolved, 'batch', p_batch);
end;
$$;

-- 8. Verifikasi, publikasi, nonaktifkan, arsipkan.
create or replace function public.admin_verify_destination(
  p_destination_id uuid,
  p_action text
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare d public.destinations;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_action not in ('verify','publish','unpublish','archive','restore') then raise exception 'Aksi tidak valid'; end if;

  select * into d from public.destinations where id = p_destination_id for update;
  if not found then raise exception 'Destinasi tidak ditemukan'; end if;

  if p_action = 'verify' then
    update public.destinations set publication_status='verified', verified_at=now(), verified_by=auth.uid(), updated_at=now()
    where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  elsif p_action = 'publish' then
    update public.destinations set publication_status='published', verified_at=coalesce(verified_at,now()),
      verified_by=coalesce(verified_by,auth.uid()), updated_at=now()
    where id=p_destination_id;
    update public.destination_stickers set published=true where destination_id=p_destination_id;
  elsif p_action = 'unpublish' then
    update public.destinations set publication_status='verified', updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  elsif p_action = 'archive' then
    update public.destinations set publication_status='archived', updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  else
    update public.destinations set publication_status='verified', updated_at=now() where id=p_destination_id;
    update public.destination_stickers set published=false where destination_id=p_destination_id;
  end if;

  return jsonb_build_object('id',p_destination_id,
    'status',(select publication_status from public.destinations where id=p_destination_id),
    'sticker_published',(select coalesce(bool_or(published),false) from public.destination_stickers where destination_id=p_destination_id));
end;
$$;

-- 9. Edit destinasi dari Dashboard Admin.
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
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare d public.destinations; target_slug text;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception 'Koordinat tidak valid'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'Nama minimal 2 karakter'; end if;
  select * into d from public.destinations where id=p_destination_id for update;
  if not found then raise exception 'Destinasi tidak ditemukan'; end if;

  target_slug := coalesce(nullif(trim(p_sticker_slug),''), d.sticker_slug);
  if target_slug is distinct from d.sticker_slug and exists(
    select 1 from public.destinations where sticker_slug=target_slug and id<>p_destination_id
  ) then raise exception 'Stiker % sudah dipakai destinasi lain', target_slug; end if;

  update public.destinations set name=trim(p_name), category_id=coalesce(nullif(p_category_id,''),category_id),
    address=trim(coalesce(p_address,'')), hours=nullif(trim(p_hours),''), description=nullif(trim(p_description),''),
    location=ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,
    region_code=nullif(p_region_code,''), sticker_slug=target_slug, updated_at=now()
  where id=p_destination_id;

  if target_slug is not null then
    insert into public.destination_stickers(destination_id, asset_path, alt_text, slug, published)
    values(p_destination_id, '/assets/stickers/'||target_slug||'.png', trim(p_name), target_slug,
      (select publication_status='published' from public.destinations where id=p_destination_id))
    on conflict (destination_id) do update set asset_path=excluded.asset_path, alt_text=excluded.alt_text, slug=excluded.slug;
  end if;

  return jsonb_build_object('id',p_destination_id,'sticker_slug',target_slug,'updated_at',now());
end;
$$;

-- 10. Daftar destinasi untuk Dashboard Admin (termasuk draft dan arsip).
create or replace function public.admin_destinations()
returns setof jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
  select jsonb_build_object('id',d.id,'name',d.name,'category_id',d.category_id,'address',d.address,
    'hours',d.hours,'description',d.description,'region_code',d.region_code,
    'lat',ST_Y(d.location::geometry),'lon',ST_X(d.location::geometry),
    'source_label',d.source_label,'source_url',d.source_url,'sticker_slug',d.sticker_slug,
    'sticker_path',s.asset_path,'sticker_published',coalesce(s.published,false),
    'publication_status',d.publication_status,'coordinate_source',d.coordinate_source,
    'coordinate_confidence',d.coordinate_confidence,'osm_type',d.osm_type,'osm_id',d.osm_id,
    'verified_at',d.verified_at,'verified_by',d.verified_by,'updated_at',d.updated_at,
    'import_batch',d.import_batch)
  from public.destinations d
  left join public.destination_stickers s on s.destination_id=d.id
  where public.is_moderator()
  order by d.name;
$$;

-- 11. Hak akses: fungsi admin hanya untuk pengguna login, dan tetap dijaga is_moderator().
revoke execute on function public.admin_import_destinations(jsonb,text),
  public.admin_verify_destination(uuid,text),
  public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text),
  public.admin_destinations() from public, anon;
grant execute on function public.admin_import_destinations(jsonb,text),
  public.admin_verify_destination(uuid,text),
  public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text),
  public.admin_destinations() to authenticated;
