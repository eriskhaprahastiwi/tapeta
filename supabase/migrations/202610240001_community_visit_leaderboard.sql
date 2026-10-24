set search_path = public, extensions;

create or replace function public.community_visit_leaderboard(p_city_id text default null) returns setof jsonb language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with ranked_visits as (
    select place.user_id, count(*) as visited_count, max(place.visited_on) as latest_visited_at
    from public.personal_places place join public.destinations destination on destination.id = place.destination_id and destination.publication_status = 'published'
    where place.visited_on is not null and (p_city_id is null or place.city_id = p_city_id) group by place.user_id
  )
  select jsonb_build_object('profile_key', case when profile.public_profile then md5(profile.id::text || ':tapeta-community-profile-v1') else null end, 'display_label', case when profile.public_profile then profile.display_name else 'Kontributor' end, 'public_profile', profile.public_profile, 'visited_count', visits.visited_count, 'latest_visited_at', visits.latest_visited_at)
  from ranked_visits visits join public.profiles profile on profile.id = visits.user_id order by visits.visited_count desc, visits.latest_visited_at desc, profile.created_at asc;
$$;
revoke execute on function public.community_visit_leaderboard(text) from public, anon, authenticated;
grant execute on function public.community_visit_leaderboard(text) to anon, authenticated;
notify pgrst, 'reload schema';
