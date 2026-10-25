set search_path = public, extensions;

create or replace function public.community_contributor_profile(p_profile_key text)
returns jsonb
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'profile_key', md5(profile.id::text || ':tapeta-community-profile-v1'),
    'display_name', profile.display_name,
    'public_profile', profile.public_profile,
    'published_count', coalesce((
      select count(distinct destination.id)
      from public.submissions submission
      join public.destinations destination on destination.submission_id = submission.id
      where submission.contributor_id = profile.id
        and submission.status = 'published'::public.submission_status
        and destination.publication_status = 'published'
    ), 0),
    'latest_published_at', (
      select max(destination.updated_at)
      from public.submissions submission
      join public.destinations destination on destination.submission_id = submission.id
      where submission.contributor_id = profile.id
        and submission.status = 'published'::public.submission_status
        and destination.publication_status = 'published'
    ),
    'visited_count', coalesce((
      select count(*)
      from public.personal_places place
      join public.destinations destination on destination.id = place.destination_id
        and destination.publication_status = 'published'
      where place.user_id = profile.id and place.visited_on is not null
    ), 0),
    'visited_places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'destination_id', destination.id,
        'place_name', destination.name,
        'description', destination.description,
        'category_id', destination.category_id,
        'address', destination.address,
        'city_id', destination.city_id,
        'city_name', coalesce(city.name, destination.city_id),
        'region_code', destination.region_code,
        'region_name', coalesce(region.name, destination.region_code, ''),
        'visited_on', place.visited_on,
        'sticker_path', case when sticker.published then sticker.asset_path else null end,
        'sticker_alt', case when sticker.published then sticker.alt_text else null end
      ) order by place.visited_on desc, destination.name asc)
      from public.personal_places place
      join public.destinations destination on destination.id = place.destination_id
        and destination.publication_status = 'published'
      left join public.cities city on city.id = destination.city_id
      left join public.city_regions region on region.city_id = destination.city_id and region.code = destination.region_code
      left join public.destination_stickers sticker on sticker.destination_id = destination.id and sticker.published
      where place.user_id = profile.id and place.visited_on is not null
    ), '[]'::jsonb),
    'contributions', coalesce((
      select jsonb_agg(item order by item->>'published_at' desc nulls last, item->>'place_name' asc)
      from (
        select jsonb_build_object(
          'destination_id', destination.id,
          'place_name', destination.name,
          'description', coalesce(nullif(trim(destination.description), ''), nullif(trim(submission.description), '')),
          'category_id', destination.category_id,
          'address', destination.address,
          'region_code', destination.region_code,
          'region_name', coalesce(region.name, destination.region_code, ''),
          'city_id', destination.city_id,
          'city_name', coalesce(city.name, destination.city_id),
          'reviewed_at', destination.verified_at,
          'published_at', coalesce(destination.updated_at, submission.decided_at),
          'sticker_path', case when sticker.published then sticker.asset_path else null end,
          'sticker_alt', case when sticker.published then sticker.alt_text else null end
        ) as item
        from public.submissions submission
        join public.destinations destination on destination.submission_id = submission.id
        left join public.cities city on city.id = destination.city_id
        left join public.city_regions region on region.city_id = destination.city_id and region.code = destination.region_code
        left join public.destination_stickers sticker on sticker.destination_id = destination.id and sticker.published
        where submission.contributor_id = profile.id
          and submission.status = 'published'::public.submission_status
          and destination.publication_status = 'published'
      ) contribution_rows
    ), '[]'::jsonb)
  )
  from public.profiles profile
  where profile.public_profile = true
    and md5(profile.id::text || ':tapeta-community-profile-v1') = p_profile_key;
$$;

revoke execute on function public.community_contributor_profile(text) from public, anon, authenticated;
grant execute on function public.community_contributor_profile(text) to anon, authenticated;
notify pgrst, 'reload schema';
