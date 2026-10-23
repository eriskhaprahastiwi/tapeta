-- Jangan hapus jam/deskripsi lama saat admin hanya mengubah nama, koordinat,
-- atau stiker dari Dashboard Admin.
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

  update public.destinations set
    name=trim(p_name),
    category_id=coalesce(nullif(p_category_id,''),category_id),
    address=trim(coalesce(p_address,'')),
    hours=coalesce(nullif(trim(p_hours),''),hours),
    description=coalesce(nullif(trim(p_description),''),description),
    location=ST_SetSRID(ST_MakePoint(p_lon,p_lat),4326)::geography,
    region_code=coalesce(nullif(p_region_code,''),region_code),
    sticker_slug=target_slug,
    updated_at=now()
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
revoke execute on function public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text) from public, anon;
grant execute on function public.admin_update_destination(uuid,text,text,text,text,text,double precision,double precision,text,text) to authenticated;
