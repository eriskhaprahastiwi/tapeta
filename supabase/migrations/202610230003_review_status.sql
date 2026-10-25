-- Izinkan admin mengembalikan destinasi ke antrean verifikasi.
create or replace function public.admin_verify_destination(
  p_destination_id uuid,
  p_action text
) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare d public.destinations;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
  if p_action not in ('verify','publish','unpublish','archive','restore','needs_review') then raise exception 'Aksi tidak valid'; end if;

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
  elsif p_action = 'needs_review' then
    update public.destinations set publication_status='draft', updated_at=now() where id=p_destination_id;
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
revoke execute on function public.admin_verify_destination(uuid,text) from public, anon;
grant execute on function public.admin_verify_destination(uuid,text) to authenticated;
