-- Transaction-scoped fixture for Community RPC privacy and relation checks.
-- The nested exception block rolls back every inserted/updated test row.
do $$
declare
  test_user uuid;
  test_submission uuid;
  test_destination uuid;
  public_key text;
  stories jsonb;
  profile_data jsonb;
  leaderboard jsonb;
begin
  begin
    select id into test_user from public.profiles where role = 'admin' order by created_at limit 1;
    if test_user is null then raise exception 'No admin profile available for disposable fixture'; end if;

    update public.profiles set public_profile = true where id = test_user;

    insert into public.submissions(
      contributor_id, city_id, name, category_id, address, description, location,
      source_url, source_label, status, decided_at
    ) values (
      test_user, 'osm:relation:16563796', 'Community Fixture Place', 'budaya',
      'Jalan Fixture 1', 'Cerita fixture untuk memeriksa alur publik Community.',
      ST_SetSRID(ST_MakePoint(101.44744, 0.51766), 4326)::geography,
      'https://www.openstreetmap.org/node/3221127383', 'OpenStreetMap', 'published', now()
    ) returning id into test_submission;

    insert into public.destinations(
      city_id, name, category_id, address, description, location, source_url,
      source_label, verified_by, verified_at, publication_status, submission_id
    ) values (
      'osm:relation:16563796', 'Community Fixture Place', 'budaya',
      'Jalan Fixture 1', 'Cerita fixture untuk memeriksa alur publik Community.',
      ST_SetSRID(ST_MakePoint(101.44744, 0.51766), 4326)::geography,
      'https://www.openstreetmap.org/node/3221127383', 'OpenStreetMap', test_user,
      now(), 'published', test_submission
    ) returning id into test_destination;

    select coalesce(jsonb_agg(item), '[]'::jsonb) into stories
    from public.community_stories('osm:relation:16563796') item
    where item->>'destination_id' = test_destination::text;
    if jsonb_array_length(stories) <> 1 then raise exception 'Published contribution not returned as a city story'; end if;
    if stories->0->>'author_label' = 'Kontributor' then raise exception 'Public profile name was unexpectedly hidden'; end if;
    if stories->0 ? 'moderator_note' then raise exception 'Story leaked moderator note'; end if;
    if stories->0->>'publication_status' <> 'published' then raise exception 'Story publication status is incorrect'; end if;

    select item->>'profile_key' into public_key
    from public.community_leaderboard() item
    where item->>'display_label' = (select display_name from public.profiles where id=test_user)
    limit 1;
    if public_key is null then raise exception 'Public contributor missing from leaderboard'; end if;

    select public.community_contributor_profile(public_key) into profile_data;
    if profile_data->>'display_name' <> (select display_name from public.profiles where id=test_user)
      then raise exception 'Public contributor profile name mismatch'; end if;
    if jsonb_array_length(profile_data->'contributions') <> 1 then raise exception 'Public profile contribution list mismatch'; end if;

    update public.profiles set public_profile = false where id = test_user;
    select item into leaderboard from public.community_leaderboard() item
      where item->>'profile_key' is null and item->>'display_label'='Kontributor' limit 1;
    if leaderboard is null then raise exception 'Private contributor missing from anonymized leaderboard'; end if;
    select public.community_contributor_profile(public_key) into profile_data;
    if profile_data is not null then raise exception 'Private contributor profile should not be public'; end if;
    select item into stories from public.community_stories('osm:relation:16563796') item
      where item->>'destination_id'=test_destination::text limit 1;
    if stories->>'author_label' <> 'Kontributor' then raise exception 'Private author label was exposed'; end if;

    raise exception 'ROLLBACK_COMMUNITY_FIXTURE';
  exception when others then
    if sqlerrm <> 'ROLLBACK_COMMUNITY_FIXTURE' then raise; end if;
  end;
end;
$$;
