-- Community, server-side screening, proposal polling and actionable notifications.
set search_path=public,extensions,pg_temp;

create table public.content_rules (
 id bigint generated always as identity primary key,
 pattern text not null unique,
 reason text not null,
 action text not null check(action in ('block','review')),
 active boolean not null default true
);
insert into public.content_rules(pattern,reason,action) values
 ('(jual|beli|download|unduh)[[:space:]]+(video[[:space:]]+)?(porno|bokep)','Pornografi atau eksploitasi seksual','block'),
 ('(bunuh|bantai|usir)[[:space:]]+semua[[:space:]]+','Ancaman atau ujaran kebencian terhadap kelompok','review'),
 ('(judi[[:space:]]+online|slot[[:space:]]+gacor|pinjol[[:space:]]+ilegal)','Spam atau promosi ilegal','block'),
 ('(nomor[[:space:]]+ktp|nik[[:space:]]*[:=]|nomor[[:space:]]+kartu[[:space:]]+kredit)','Kemungkinan data pribadi','review'),
 ('(rasis|pornografi|pelecehan|ancaman)','Konten sensitif memerlukan pemeriksaan konteks','review');
alter table public.content_rules enable row level security;
create policy "moderators manage rules" on public.content_rules for all to authenticated using(public.is_moderator()) with check(public.is_moderator());
revoke all on public.content_rules from anon,authenticated;
grant select,insert,update,delete on public.content_rules to authenticated;
grant usage,select on sequence public.content_rules_id_seq to authenticated;

create function public.screen_content(p_text text) returns text[]
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare reasons text[]; blocked text;
 normalized text := regexp_replace(lower(normalize(coalesce(p_text,''),NFKC)), U&'[\200B-\200D\FEFF]', '', 'g');
begin
 select reason into blocked from public.content_rules where active and action='block' and normalized ~* pattern limit 1;
 if blocked is not null then raise exception 'Konten tidak dapat dikirim: %. Perbaiki isi sesuai aturan komunitas.',blocked; end if;
 select coalesce(array_agg(distinct reason),'{}') into reasons from public.content_rules where active and action='review' and normalized ~* pattern;
 return reasons;
end $$;
revoke all on function public.screen_content(text) from public,anon,authenticated;

alter table public.submissions add column screening_reasons text[] not null default '{}';
alter table public.submissions add column poll_started_at timestamptz not null default now();
create function public.screen_submission() returns trigger
language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
 if TG_OP='INSERT' or (new.name,new.address,new.hours,new.description,new.source_url,new.source_label) is distinct from (old.name,old.address,old.hours,old.description,old.source_url,old.source_label) then
  new.screening_reasons := public.screen_content(concat_ws(' ',new.name,new.address,new.hours,new.description,new.source_url,new.source_label));
  if exists(select 1 from public.destinations d where d.city_id=new.city_id and lower(trim(d.name))=lower(trim(new.name)) and ST_DWithin(d.location,new.location,75))
    or exists(select 1 from public.submissions s where s.id<>new.id and s.status='pending' and s.city_id=new.city_id and lower(trim(s.name))=lower(trim(new.name)) and ST_DWithin(s.location,new.location,75)) then
    new.screening_reasons := array_append(new.screening_reasons,'Kemungkinan lokasi duplikat dalam 75 meter');
  end if;
  new.poll_started_at := now();
 end if;
 return new;
end $$;
create trigger screen_submission before insert or update on public.submissions for each row execute function public.screen_submission();
revoke all on function public.screen_submission() from public,anon,authenticated;

create table public.submission_votes (
 submission_id uuid references public.submissions(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 choice text not null check(choice in ('valid','fix','doubt')),
 reason text not null default '',
 created_at timestamptz not null default now(),
 primary key(submission_id,user_id)
);
alter table public.submission_votes enable row level security;
create policy "own or moderator vote access" on public.submission_votes for select to authenticated using(user_id=auth.uid() or public.is_moderator());
revoke all on public.submission_votes from anon,authenticated;
grant select on public.submission_votes to authenticated;

create function public.vote_submission(p_id uuid,p_choice text,p_reason text default '') returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.submissions;
begin
 if auth.uid() is null then raise exception 'Masuk untuk memilih'; end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verifikasi email sebelum memilih'; end if;
 select * into s from public.submissions where id=p_id for update;
 if not found or s.status<>'pending' or cardinality(s.screening_reasons)>0 then raise exception 'Usulan tidak menerima suara'; end if;
 if s.contributor_id=auth.uid() then raise exception 'Tidak boleh memilih usulan sendiri'; end if;
 if now()>s.poll_started_at+interval '72 hours' then raise exception 'Polling sudah ditutup'; end if;
 if p_choice not in ('valid','fix','doubt') then raise exception 'Pilihan tidak valid'; end if;
 if char_length(p_reason)>1000 or (p_choice<>'valid' and char_length(trim(p_reason))<10) then raise exception 'Sertakan alasan 10–1000 karakter'; end if;
 perform public.screen_content(p_reason);
 insert into public.submission_votes(submission_id,user_id,choice,reason) values(p_id,auth.uid(),p_choice,trim(p_reason))
 on conflict(submission_id,user_id) do update set choice=excluded.choice,reason=excluded.reason,created_at=now();
end $$;

create function public.list_submission_polls(p_city_id text) returns setof jsonb
language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select jsonb_build_object('id',s.id,'name',s.name,'address',s.address,'source',coalesce(s.source_url,s.source_label),'lat',ST_Y(s.location::geometry),'lon',ST_X(s.location::geometry),
 'ends_at',s.poll_started_at+interval '72 hours','own',s.contributor_id=auth.uid(),
 'valid',(select count(*) from public.submission_votes v where v.submission_id=s.id and choice='valid'),
 'fix',(select count(*) from public.submission_votes v where v.submission_id=s.id and choice='fix'),
 'doubt',(select count(*) from public.submission_votes v where v.submission_id=s.id and choice='doubt'),
 'my_choice',(select choice from public.submission_votes where submission_id=s.id and user_id=auth.uid()))
 from public.submissions s where s.city_id=p_city_id and s.status='pending' and cardinality(s.screening_reasons)=0 and auth.uid() is not null
 order by s.created_at desc limit 50;
$$;
create function public.submission_review_summary(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
 return (select jsonb_build_object('reasons',s.screening_reasons,'ends_at',s.poll_started_at+interval '72 hours',
 'valid',(select count(*) from public.submission_votes where submission_id=s.id and choice='valid'),
 'total',(select count(*) from public.submission_votes where submission_id=s.id),
 'objections',(select coalesce(jsonb_agg(jsonb_build_object('choice',choice,'reason',reason)),'[]') from public.submission_votes where submission_id=s.id and choice<>'valid')) from public.submissions s where id=p_id);
end $$;
-- Preserve existing transactional publication. A trigger adds the consensus gate.
create function public.require_submission_consensus() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare votes integer; yes_votes integer;
begin
 if new.status='published' and old.status='pending' then
  select count(*),count(*) filter(where choice='valid') into votes,yes_votes from public.submission_votes where submission_id=new.id;
  if (cardinality(new.screening_reasons)>0 or votes<3 or yes_votes*3<votes*2)
     and char_length(trim(coalesce(new.moderator_note,'')))<20 then
   raise exception 'Belum memenuhi 3 suara dan dukungan dua pertiga, atau ditandai sistem. Tulis alasan pemeriksaan manual minimal 20 karakter untuk pengecualian.';
  end if;
 end if;
 return new;
end $$;
create trigger require_submission_consensus before update of status on public.submissions for each row execute function public.require_submission_consensus();

alter table public.notifications add column submission_id uuid references public.submissions(id) on delete set null;
create unique index notifications_submission_unique on public.notifications(user_id,submission_id) where submission_id is not null;
create function public.notify_submission_reviewers() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into public.notifications(user_id,title,body,submission_id)
 select id,'Usulan lokasi baru',new.name || ' menunggu validasi dan verifikasi.',new.id from public.profiles where role in ('admin','moderator') and id<>new.contributor_id
 on conflict do nothing;
 return new;
end $$;
create trigger notify_submission_reviewers after insert on public.submissions for each row execute function public.notify_submission_reviewers();
revoke all on function public.notify_submission_reviewers() from public,anon,authenticated;

create table public.community_posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id),
 city_id text not null, kind text not null check(kind in ('story','issue','qna')),
 destination_id uuid references public.destinations(id),
 title text not null check(char_length(trim(title)) between 5 and 160),
 body text not null check(char_length(trim(body)) between 10 and 5000),
 documentation text[] not null default '{}',
 status text not null default 'published' check(status in ('published','review','rejected')),
 screening_reasons text[] not null default '{}', moderator_note text,
 created_at timestamptz not null default now()
);
create index community_posts_feed on public.community_posts(city_id,status,created_at desc);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id), body text not null check(char_length(trim(body)) between 2 and 2000),
 status text not null default 'published' check(status in ('published','review','rejected')),
 moderator_note text,
 created_at timestamptz not null default now()
);
create table public.community_votes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id), value smallint not null check(value in (-1,1)), primary key(post_id,user_id)
);
create table public.community_reports (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id), reason text not null check(char_length(trim(reason)) between 10 and 1000),
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
-- Reads expose public content only; all writes pass through constrained RPCs.
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_votes enable row level security;
alter table public.community_reports enable row level security;
create policy "public posts and own drafts" on public.community_posts for select using(status='published' or author_id=auth.uid() or public.is_moderator());
create policy "public comments" on public.community_comments for select using((status='published' or author_id=auth.uid() or public.is_moderator()) and exists(select 1 from public.community_posts p where p.id=post_id));
create policy "own votes" on public.community_votes for select to authenticated using(user_id=auth.uid());
create policy "moderator reports" on public.community_reports for select to authenticated using(public.is_moderator());
revoke all on public.community_posts,public.community_comments,public.community_votes,public.community_reports from anon,authenticated;
grant select on public.community_posts,public.community_comments to anon,authenticated;
grant select on public.community_votes,public.community_reports to authenticated;

create function public.create_community_post(p_city_id text,p_kind text,p_destination_id uuid,p_title text,p_body text,p_documentation text[] default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare reasons text[]; post public.community_posts; path text;
begin
 if auth.uid() is null then raise exception 'Masuk untuk membuat posting'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.community_posts where author_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Batas 5 posting per jam tercapai'; end if;
 if p_city_id !~ '^osm:relation:[0-9]+$' then raise exception 'Pilih kota yang valid'; end if;
 if p_kind in ('story','issue') and p_destination_id is null then raise exception 'Pilih lokasi terlebih dahulu'; end if;
 if p_destination_id is not null and not exists(select 1 from public.destinations where id=p_destination_id and city_id=p_city_id and publication_status='published') then raise exception 'Lokasi tidak tersedia di kota ini'; end if;
 reasons:=public.screen_content(concat_ws(' ',p_title,p_body));
 if cardinality(p_documentation)>4 then raise exception 'Maksimal 4 dokumentasi'; end if;
 foreach path in array coalesce(p_documentation,'{}') loop
  if split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='community-documentation' and name=path and owner_id=auth.uid()::text) then raise exception 'Dokumentasi bukan milik akun ini'; end if;
 end loop;
 -- Images require review before public access; keyword screening cannot inspect images.
 if cardinality(p_documentation)>0 then reasons:=array_append(reasons,'Dokumentasi menunggu pemeriksaan gambar'); end if;
 insert into public.community_posts(author_id,city_id,kind,destination_id,title,body,documentation,status,screening_reasons)
 values(auth.uid(),p_city_id,p_kind,p_destination_id,trim(p_title),trim(p_body),coalesce(p_documentation,'{}'),case when cardinality(reasons)>0 then 'review' else 'published' end,reasons) returning * into post;
 return to_jsonb(post);
end $$;

create function public.list_community_feed(p_city_id text,p_kind text,p_before timestamptz default null) returns setof jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'kind',p.kind,'title',p.title,'body',p.body,'status',p.status,'documentation',p.documentation,'created_at',p.created_at,
 'author',case when pr.public_profile or pr.id=auth.uid() then pr.display_name else 'Warga TAPETA' end,
 'destination_id',d.id,'place',d.name,
 'score',(select coalesce(sum(value),0) from public.community_votes where post_id=p.id),
 'my_vote',(select value from public.community_votes where post_id=p.id and user_id=auth.uid()),
 'moderator_note',p.moderator_note,
 'comment_count',(select count(*) from public.community_comments where post_id=p.id and status='published'))
 from public.community_posts p join public.profiles pr on pr.id=p.author_id left join public.destinations d on d.id=p.destination_id
 where p.city_id=p_city_id and p.kind=p_kind and (p.status='published' or p.author_id=auth.uid()) and (p_before is null or p.created_at<p_before)
 order by p.created_at desc,p.id limit 20;
$$;

create function public.community_action(p_post_id uuid,p_action text,p_text text default '',p_value smallint default 1) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.community_posts; reasons text[];
begin
 if auth.uid() is null then raise exception 'Masuk untuk berpartisipasi'; end if;
 select * into p from public.community_posts where id=p_post_id for update;
 if not found or p.status<>'published' then raise exception 'Posting tidak tersedia'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if p_action='vote' then
  if p.author_id=auth.uid() then raise exception 'Tidak boleh memilih posting sendiri'; end if;
  if p_value=0 then delete from public.community_votes where post_id=p.id and user_id=auth.uid();
  else insert into public.community_votes(post_id,user_id,value) values(p.id,auth.uid(),p_value) on conflict(post_id,user_id) do update set value=excluded.value; end if;
 elsif p_action='comment' then
  if (select count(*) from public.community_comments where author_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Batas 20 komentar per jam tercapai'; end if;
  reasons:=public.screen_content(p_text);
  insert into public.community_comments(post_id,author_id,body,status) values(p.id,auth.uid(),trim(p_text),case when cardinality(reasons)>0 then 'review' else 'published' end);
 elsif p_action='report' then
  insert into public.community_reports(post_id,user_id,reason) values(p.id,auth.uid(),trim(p_text)) on conflict(post_id,user_id) do nothing;
  if (select count(*) from public.community_reports where post_id=p.id)>=3 then update public.community_posts set status='review',screening_reasons=array_append(screening_reasons,'Dilaporkan minimal 3 akun') where id=p.id; end if;
 else raise exception 'Aksi tidak valid'; end if;
end $$;

create function public.list_community_comments(p_post_id uuid) returns setof jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',c.id,'body',c.body,'status',c.status,'author',case when pr.public_profile or pr.id=auth.uid() then pr.display_name else 'Warga TAPETA' end,'created_at',c.created_at,'moderator_note',c.moderator_note)
 from public.community_comments c join public.profiles pr on pr.id=c.author_id join public.community_posts p on p.id=c.post_id
 where c.post_id=p_post_id and (p.status='published' or p.author_id=auth.uid() or public.is_moderator()) and (c.status='published' or c.author_id=auth.uid() or public.is_moderator())
 order by c.created_at desc limit 100;
$$;
create table public.community_moderation_events (
 id bigint generated always as identity primary key,
 content_id uuid not null, content_kind text not null check(content_kind in ('post','comment')),
 actor_id uuid not null references public.profiles(id), action text not null,
 note text not null, created_at timestamptz not null default now()
);
alter table public.community_moderation_events enable row level security;
revoke all on public.community_moderation_events from anon,authenticated;
create policy "moderators read community decisions" on public.community_moderation_events for select to authenticated using(public.is_moderator());
grant select on public.community_moderation_events to authenticated;

create function public.review_community_content(p_id uuid,p_kind text,p_action text,p_note text default '') returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare current_status text;
begin
 if not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
 if p_action not in ('published','rejected') or char_length(trim(p_note))<4 then raise exception 'Keputusan dan alasan minimal 4 karakter wajib'; end if;
 if p_kind='post' then
  select status into current_status from public.community_posts where id=p_id for update;
  if current_status is distinct from 'review' then raise exception 'Posting sudah diputuskan atau tidak tersedia'; end if;
  update public.community_posts set status=p_action,moderator_note=p_note where id=p_id;
 elsif p_kind='comment' then
  select status into current_status from public.community_comments where id=p_id for update;
  if current_status is distinct from 'review' then raise exception 'Komentar sudah diputuskan atau tidak tersedia'; end if;
  update public.community_comments set status=p_action,moderator_note=p_note where id=p_id;
 else raise exception 'Jenis konten tidak valid'; end if;
 insert into public.community_moderation_events(content_id,content_kind,actor_id,action,note) values(p_id,p_kind,auth.uid(),p_action,p_note);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-documentation','community-documentation',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "upload own documentation" on storage.objects for insert to authenticated with check(bucket_id='community-documentation' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "read visible documentation" on storage.objects for select using(bucket_id='community-documentation' and (owner_id=auth.uid()::text or public.is_moderator() or exists(select 1 from public.community_posts p where p.status='published' and name=any(p.documentation))));
create policy "remove unattached documentation" on storage.objects for delete to authenticated using(bucket_id='community-documentation' and owner_id=auth.uid()::text and not exists(select 1 from public.community_posts p where name=any(p.documentation)));

-- Explicit function privileges: no anonymous write paths.
revoke all on function public.vote_submission(uuid,text,text),public.list_submission_polls(text),public.submission_review_summary(uuid),public.require_submission_consensus(),public.create_community_post(text,text,uuid,text,text,text[]),public.list_community_feed(text,text,timestamptz),public.community_action(uuid,text,text,smallint),public.list_community_comments(uuid),public.review_community_content(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.vote_submission(uuid,text,text),public.list_submission_polls(text),public.submission_review_summary(uuid),public.create_community_post(text,text,uuid,text,text,text[]),public.community_action(uuid,text,text,smallint),public.review_community_content(uuid,text,text,text) to authenticated;
grant execute on function public.list_community_feed(text,text,timestamptz),public.list_community_comments(uuid) to anon,authenticated;

-- Keep older visit-story write paths subject to the same text policy.
create function public.screen_legacy_story() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if TG_OP='INSERT' or new.body is distinct from old.body then perform public.screen_content(new.body); end if;
 return new;
end $$;
create trigger screen_legacy_story before insert or update of body on public.visit_stories for each row execute function public.screen_legacy_story();
revoke all on function public.screen_legacy_story() from public,anon,authenticated;

create function public.list_admin_screened_submissions() returns setof jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.is_moderator() then raise exception 'Akses moderator diperlukan'; end if;
 return query select j.value || jsonb_build_object('screening_reasons',s.screening_reasons,
   'poll_total',(select count(*) from public.submission_votes where submission_id=s.id),
   'poll_valid',(select count(*) from public.submission_votes where submission_id=s.id and choice='valid'))
 from public.list_admin_submissions() as j(value) join public.submissions s on s.id=(j.value->>'id')::uuid;
end $$;
revoke all on function public.list_admin_screened_submissions() from public,anon,authenticated;
grant execute on function public.list_admin_screened_submissions() to authenticated;
