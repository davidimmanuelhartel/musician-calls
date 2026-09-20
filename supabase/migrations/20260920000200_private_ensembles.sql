-- Shared private workspaces. Public calls retain a snapshot of their published details.
create table public.ensembles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (length(btrim(name)) between 1 and 150),
  venue text not null check (length(btrim(venue)) between 1 and 200),
  address text not null default '' check (length(address) <= 300),
  description text not null default '' check (length(description) <= 5000),
  compensation_type text not null default 'negotiable' check (compensation_type in ('paid','unpaid','negotiable')),
  compensation_amount numeric(12,2), currency text,
  created_at timestamptz not null default now(),
  check ((compensation_type = 'paid' and compensation_amount > 0 and compensation_amount <= 1000000 and currency in ('DKK','EUR','SEK','NOK','GBP')) or (compensation_type <> 'paid' and compensation_amount is null and currency is null))
);
create unique index ensembles_owner_name on public.ensembles(owner_id, lower(btrim(name)));
create table public.ensemble_members (
  ensemble_id uuid not null references public.ensembles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(), primary key (ensemble_id, user_id)
);
create index ensemble_members_user on public.ensemble_members(user_id);
create table public.ensemble_invites (
  ensemble_id uuid primary key references public.ensembles(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null default now() + interval '30 days'
);
create function public.is_ensemble_member(ensemble uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.ensemble_members where ensemble_id = ensemble and user_id = auth.uid());
$$;
revoke all on function public.is_ensemble_member(uuid) from public, anon;
grant execute on function public.is_ensemble_member(uuid) to authenticated;
alter table public.ensembles enable row level security;
alter table public.ensemble_members enable row level security;
alter table public.ensemble_invites enable row level security;
revoke all on public.ensembles, public.ensemble_members, public.ensemble_invites from anon, authenticated;
grant select on public.ensembles, public.ensemble_members to authenticated;
create policy members_read_ensemble on public.ensembles for select to authenticated using (public.is_ensemble_member(id));
create policy members_read_roster on public.ensemble_members for select to authenticated using (public.is_ensemble_member(ensemble_id));

alter table public.calls add column ensemble_id uuid references public.ensembles(id);
-- Preserve earlier calls and group them by their creator and ensemble name. Do not infer
-- shared membership between unrelated users merely because they typed the same name.
do $$
declare c record; eid uuid;
begin
  for c in select distinct on (organizer_id, lower(btrim(ensemble_name))) * from public.calls order by organizer_id, lower(btrim(ensemble_name)), published_at desc loop
    insert into public.ensembles(owner_id,name,venue,address,description,compensation_type,compensation_amount,currency)
    values(c.organizer_id,btrim(c.ensemble_name),c.venue,coalesce(c.address,''),coalesce(c.description,''),c.compensation_type,c.compensation_amount,c.currency) returning id into eid;
    insert into public.ensemble_members(ensemble_id,user_id) values(eid,c.organizer_id);
    update public.calls set ensemble_id=eid where organizer_id=c.organizer_id and lower(btrim(ensemble_name))=lower(btrim(c.ensemble_name));
  end loop;
end $$;
alter table public.calls alter column ensemble_id set not null;
create index calls_ensemble on public.calls(ensemble_id, published_at desc);

drop policy own_contacts on public.call_contacts;
drop policy own_responses on public.responses;
create policy ensemble_contacts on public.call_contacts for select to authenticated using (exists(select 1 from public.calls c where c.id=call_id and public.is_ensemble_member(c.ensemble_id)));
create policy ensemble_responses on public.responses for select to authenticated using (exists(select 1 from public.calls c where c.id=call_id and public.is_ensemble_member(c.ensemble_id)));

create function public.save_ensemble(payload jsonb, ensemble uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); eid uuid := ensemble;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'unauthorized'; end if;
  if ensemble is null then
    -- A caller-generated ID makes creation retryable without creating duplicate ensembles.
    eid := (payload->>'id')::uuid;
    if exists(select 1 from public.ensembles where id=eid and owner_id=uid) then return eid; end if;
    insert into public.ensembles(id,owner_id,name,venue,address,description,compensation_type,compensation_amount,currency)
    values(eid,uid,btrim(payload->>'name'),payload->>'venue',coalesce(payload->>'address',''),coalesce(payload->>'description',''),payload->>'compensation_type',(payload->>'compensation_amount')::numeric,payload->>'currency');
    insert into public.ensemble_members(ensemble_id,user_id) values(eid,uid);
    insert into public.organizer_profiles(id,name,phone) values(uid,payload->>'organizer_name',nullif(payload->>'organizer_phone','')) on conflict(id) do update set name=excluded.name,phone=excluded.phone;
  else
    if not exists(select 1 from public.ensembles where id=eid and owner_id=uid) then raise exception 'unauthorized'; end if;
    update public.ensembles set name=btrim(payload->>'name'),venue=payload->>'venue',address=coalesce(payload->>'address',''),description=coalesce(payload->>'description',''),compensation_type=payload->>'compensation_type',compensation_amount=(payload->>'compensation_amount')::numeric,currency=payload->>'currency' where id=eid;
  end if;
  return eid;
end $$;
revoke all on function public.save_ensemble(jsonb,uuid) from public, anon;
grant execute on function public.save_ensemble(jsonb,uuid) to authenticated;

create function public.create_ensemble_invite(ensemble uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
begin
  if auth.uid() is null or not exists(select 1 from public.ensembles where id=ensemble and owner_id=auth.uid()) then raise exception 'unauthorized'; end if;
  -- Serialize rotation and joining on the workspace row.
  perform 1 from public.ensembles where id=ensemble for update;
  insert into public.ensemble_invites(ensemble_id,token_hash,expires_at)
  values(ensemble,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '30 days')
  on conflict(ensemble_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  return token;
end $$;
revoke all on function public.create_ensemble_invite(uuid) from public, anon;
grant execute on function public.create_ensemble_invite(uuid) to authenticated;

create function public.join_ensemble(token text, member_name text, member_phone text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare eid uuid; uid uuid := auth.uid();
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'unauthorized'; end if;
  select ensemble_id into eid from public.ensemble_invites where token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at > now();
  if eid is null then raise exception 'invalid_invite'; end if;
  perform 1 from public.ensembles where id=eid for update;
  if not exists(select 1 from public.ensemble_invites where ensemble_id=eid and token_hash=encode(extensions.digest(token,'sha256'),'hex') and expires_at > now()) then raise exception 'invalid_invite'; end if;
  insert into public.organizer_profiles(id,name,phone) values(uid,btrim(member_name),nullif(member_phone,'')) on conflict(id) do update set name=excluded.name,phone=excluded.phone;
  insert into public.ensemble_members(ensemble_id,user_id) values(eid,uid) on conflict do nothing;
  return eid;
end $$;
revoke all on function public.join_ensemble(text,text,text) from public, anon;
grant execute on function public.join_ensemble(text,text,text) to authenticated;

create function public.remove_ensemble_member(ensemble uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.ensembles where id=ensemble and owner_id=auth.uid() and owner_id<>member) then raise exception 'unauthorized'; end if;
  perform 1 from public.ensembles where id=ensemble for update;
  delete from public.ensemble_members where ensemble_id=ensemble and user_id=member;
  -- Revoke outstanding invitations so the removed member cannot reuse an old link.
  delete from public.ensemble_invites where ensemble_id=ensemble;
end $$;
revoke all on function public.remove_ensemble_member(uuid,uuid) from public, anon;
grant execute on function public.remove_ensemble_member(uuid,uuid) to authenticated;

create function public.ensemble_roster(ensemble uuid) returns table(user_id uuid, name text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id,p.name,m.joined_at from public.ensemble_members m join public.organizer_profiles p on p.id=m.user_id
  where m.ensemble_id=ensemble and public.is_ensemble_member(ensemble) order by m.joined_at;
$$;
revoke all on function public.ensemble_roster(uuid) from public, anon;
grant execute on function public.ensemble_roster(uuid) to authenticated;

create or replace function public.publish_call(payload jsonb, files jsonb default '[]') returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cid uuid := (payload->>'id')::uuid; eid uuid := (payload->>'ensemble_id')::uuid; f jsonb; user_email text; e public.ensembles; profile public.organizer_profiles;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  -- Lock the workspace while checking membership, also serializing against removal.
  select * into e from public.ensembles where id=eid for update;
  if e.id is null or not public.is_ensemble_member(eid) then raise exception 'unauthorized'; end if;
  select email into user_email from auth.users where id=uid and email_confirmed_at is not null;
  select * into profile from public.organizer_profiles where id=uid;
  if user_email is null or profile.id is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.calls where id=cid and organizer_id=uid and ensemble_id=eid) then return cid; end if;
  if coalesce((payload->>'performance_at')::timestamptz,(payload->>'call_at')::timestamptz) <= now() then raise exception 'expired'; end if;
  if jsonb_typeof(files) <> 'array' or jsonb_array_length(files) > 10 then raise exception 'invalid_files'; end if;
  insert into public.calls(id,organizer_id,ensemble_id,ensemble_name,instrument,position,call_at,performance_at,venue,address,repertoire,description,compensation_type,compensation_amount,currency)
  values(cid,uid,eid,e.name,payload->>'instrument',nullif(payload->>'position',''),(payload->>'call_at')::timestamptz,(payload->>'performance_at')::timestamptz,coalesce(payload->>'venue',e.venue),coalesce(payload->>'address',e.address),nullif(payload->>'repertoire',''),coalesce(payload->>'description',e.description),coalesce(payload->>'compensation_type',e.compensation_type),case when payload ? 'compensation_type' then (payload->>'compensation_amount')::numeric else e.compensation_amount end,case when payload ? 'compensation_type' then payload->>'currency' else e.currency end);
  insert into public.call_contacts(call_id,name,email,phone) values(cid,profile.name,user_email,profile.phone);
  for f in select * from jsonb_array_elements(files) loop
    if f->>'storage_path' not like uid::text || '/' || cid::text || '/%' then raise exception 'invalid_files'; end if;
    if not exists(select 1 from storage.objects where bucket_id='call-pdfs' and name=f->>'storage_path' and (metadata->>'size')::bigint=(f->>'size')::bigint and metadata->>'mimetype'='application/pdf') then raise exception 'invalid_files'; end if;
    insert into public.attachments(call_id,filename,storage_path,size,content_type) values(cid,f->>'filename',f->>'storage_path',(f->>'size')::integer,'application/pdf');
  end loop;
  return cid;
end $$;

create or replace function public.select_musician(call_id uuid, response_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare c public.calls; eid uuid;
begin
  select ensemble_id into eid from public.calls where id=call_id;
  perform 1 from public.ensembles where id=eid for update;
  if auth.uid() is null or not public.is_ensemble_member(eid) then raise exception 'unauthorized'; end if;
  select * into c from public.calls where id=call_id for update;
  if c.id is null or c.status <> 'open' or c.event_at <= now() then raise exception 'closed'; end if;
  update public.responses set selected=true where id=response_id and responses.call_id=select_musician.call_id;
  if not found then raise exception 'invalid_response'; end if;
  update public.calls set status='filled',filled_at=now() where id=call_id;
end $$;
