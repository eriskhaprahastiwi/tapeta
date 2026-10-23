-- Public Community reads are limited to aggregate contributor data and
-- published, contribution-backed destinations. Pending/rejected submissions,
-- emails, and moderator notes remain private.
set search_path = public, extensions;

create or replace function public.community_leaderboard()
returns setof jsonb
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  with contributor_counts as (
    select
      s.contributor_id,
      count(s.id) as submission_count,
      count(d.id) filter (
        where s.status = 'published'::public.submission_status
          and d.publication_status = 'published'
      ) as published_count,
      max(d.updated_at) filter (
        where s.status = 'published'::public.submission_status
          and d.publication_status = 'published'
      ) as latest_published_at
    from public.submissions s
    left join public.destinations d on d.submission_id = s.id
    group by s.contributor_id
    having count(s.id) > 0
  )
  select jsonb_build_object(
    'profile_key', case when p.public_profile
      then md5(p.id::text || ':tapeta-community-profile-v1')
      else null end,
    'display_label', case when p.public_profile then p.display_name else 'Kontributor' end,
    'public_profile', p.public_profile,
    'published_count', cc.published_count,
    'latest_published_at', cc.latest_published_at
  )
  from contributor_counts cc
  join public.profiles p on p.id = cc.contributor_id
  order by cc.published_count desc, cc.latest_published_at desc nulls last, p.created_at asc;
$$;

create or replace function public.community_stories(p_city_id text)
returns setof jsonb
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'destination_id', d.id,
    'place_name', d.name,
    'description', coalesce(nullif(trim(d.description), ''), nullif(trim(s.description), '')),
    'category_id', d.category_id,
    'address', d.address,
    'region_code', d.region_code,
    'region_name', coalesce(r.name, d.region_code, ''),
    'city_id', d.city_id,
    'city_name', coalesce(c.name, d.city_id),
    'author_label', case when p.public_profile then p.display_name else 'Kontributor' end,
    'profile_key', case when p.public_profile then md5(p.id::text || ':tapeta-community-profile-v1') else null end,
    'public_profile', p.public_profile,
    'submission_status', s.status::text,
    'publication_status', d.publication_status,
    'reviewed_at', d.verified_at,
    'published_at', coalesce(d.updated_at, s.decided_at),
    'sticker_path', case when ds.published then ds.asset_path else null end,
    'sticker_alt', case when ds.published then ds.alt_text else null end
  )
  from public.destinations d
  join public.submissions s on s.id = d.submission_id
  join public.profiles p on p.id = s.contributor_id
  left join public.cities c on c.id = d.city_id
  left join public.city_regions r on r.city_id = d.city_id and r.code = d.region_code
  left join public.destination_stickers ds on ds.destination_id = d.id and ds.published
  where d.city_id = p_city_id
    and d.publication_status = 'published'
    and s.status = 'published'::public.submission_status
  order by coalesce(d.updated_at, s.decided_at) desc, d.name asc;
$$;

create or replace function public.community_contributor_profile(p_profile_key text)
returns jsonb
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'profile_key', md5(p.id::text || ':tapeta-community-profile-v1'),
    'display_name', p.display_name,
    'public_profile', p.public_profile,
    'published_count', count(d.id),
    'latest_published_at', max(d.updated_at),
    'contributions', coalesce((
      select jsonb_agg(item order by item->>'published_at' desc nulls last, item->>'place_name' asc)
      from (
        select jsonb_build_object(
          'destination_id', d2.id,
          'place_name', d2.name,
          'description', coalesce(nullif(trim(d2.description), ''), nullif(trim(s2.description), '')),
          'category_id', d2.category_id,
          'address', d2.address,
          'region_code', d2.region_code,
          'region_name', coalesce(r2.name, d2.region_code, ''),
          'city_id', d2.city_id,
          'city_name', coalesce(c2.name, d2.city_id),
          'submission_status', s2.status::text,
          'publication_status', d2.publication_status,
          'reviewed_at', d2.verified_at,
          'published_at', coalesce(d2.updated_at, s2.decided_at),
          'sticker_path', case when ds2.published then ds2.asset_path else null end,
          'sticker_alt', case when ds2.published then ds2.alt_text else null end
        ) as item
        from public.submissions s2
        join public.destinations d2 on d2.submission_id = s2.id
        left join public.cities c2 on c2.id = d2.city_id
        left join public.city_regions r2 on r2.city_id = d2.city_id and r2.code = d2.region_code
        left join public.destination_stickers ds2 on ds2.destination_id = d2.id and ds2.published
        where s2.contributor_id = p.id
          and s2.status = 'published'::public.submission_status
          and d2.publication_status = 'published'
      ) contribution_rows
    ), '[]'::jsonb)
  )
  from public.profiles p
  left join public.submissions s on s.contributor_id = p.id
  left join public.destinations d on d.submission_id = s.id
    and s.status = 'published'::public.submission_status
    and d.publication_status = 'published'
  where p.public_profile = true
    and md5(p.id::text || ':tapeta-community-profile-v1') = p_profile_key
  group by p.id, p.display_name, p.public_profile;
$$;

revoke execute on function public.community_leaderboard(),
  public.community_stories(text),
  public.community_contributor_profile(text)
  from public, anon, authenticated;
grant execute on function public.community_leaderboard(),
  public.community_stories(text),
  public.community_contributor_profile(text)
  to anon, authenticated;
