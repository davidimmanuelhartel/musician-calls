create table public.organizer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100), phone text check (length(phone) <= 40), created_at timestamptz not null default now()
);
create table public.calls (
  id uuid primary key default gen_random_uuid(), organizer_id uuid not null references auth.users(id),
  ensemble_name text not null check (length(ensemble_name) between 1 and 150),
  instrument text not null check (instrument in ('violin','viola','cello','double_bass','flute','oboe','clarinet','bassoon','horn','trumpet','trombone','bass_trombone','tuba','percussion','drums','piano','other')),
  position text check (length(position) <= 100), call_at timestamptz not null, performance_at timestamptz,
  event_at timestamptz generated always as (coalesce(performance_at, call_at)) stored,
  timezone text not null default 'Europe/Copenhagen' check (timezone = 'Europe/Copenhagen'),
  venue text not null check (length(venue) between 1 and 200), address text check (length(address) <= 300),
  repertoire text check (length(repertoire) <= 3000), description text check (length(description) <= 5000),
  compensation_type text not null check (compensation_type in ('paid','unpaid','negotiable')),
  compensation_amount numeric(12,2), currency text,
  status text not null default 'open' check (status in ('open','filled')),
  published_at timestamptz not null default now(), filled_at timestamptz,
  check (performance_at is null or performance_at >= call_at),
  check ((compensation_type = 'paid' and compensation_amount > 0 and compensation_amount <= 1000000 and currency in ('DKK','EUR','SEK','NOK','GBP')) or (compensation_type <> 'paid' and compensation_amount is null and currency is null)),
  check ((status = 'open' and filled_at is null) or (status = 'filled' and filled_at is not null))
);
create index calls_open_event on public.calls(event_at) where status = 'open';
create index calls_organizer on public.calls(organizer_id, published_at desc);
create table public.call_contacts (
  call_id uuid primary key references public.calls(id) on delete cascade,
  name text not null check (length(name) between 1 and 100), email text not null check(length(email) <= 254), phone text check(length(phone) <= 40)
);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), call_id uuid not null references public.calls(id) on delete cascade,
  filename text not null check(length(filename) between 1 and 200), storage_path text unique not null,
  size integer not null check(size > 0 and size <= 20971520), content_type text not null check(content_type = 'application/pdf'), created_at timestamptz not null default now()
);
create index attachments_call on public.attachments(call_id);
create table public.responses (
  id uuid primary key default gen_random_uuid(), call_id uuid not null references public.calls(id) on delete cascade,
  name text not null check(length(name) between 1 and 100), email text not null check(length(email) between 3 and 254),
  phone text check(length(phone) <= 40), message text check(length(message) <= 2000), availability text not null check(availability in ('available','maybe')),
  selected boolean not null default false, created_at timestamptz not null default now()
);
create unique index responses_call_email on public.responses(call_id, lower(email));
create unique index responses_one_selected on public.responses(call_id) where selected;
create table public.response_rate_limits (ip_hash text not null, created_at timestamptz not null default now());
create index response_rate_limits_lookup on public.response_rate_limits(ip_hash, created_at);
alter table public.organizer_profiles enable row level security;
alter table public.calls enable row level security;
alter table public.call_contacts enable row level security;
alter table public.attachments enable row level security;
alter table public.responses enable row level security;
alter table public.response_rate_limits enable row level security;
revoke all on public.organizer_profiles, public.calls, public.call_contacts, public.attachments, public.responses, public.response_rate_limits from anon, authenticated;
grant select on public.calls, public.attachments to anon, authenticated;
grant select on public.organizer_profiles, public.call_contacts, public.responses to authenticated;
create policy public_calls on public.calls for select using (true);
create policy public_attachments on public.attachments for select using (true);
create policy own_profile on public.organizer_profiles for select to authenticated using (id = (select auth.uid()));
create policy own_contacts on public.call_contacts for select to authenticated using (exists(select 1 from public.calls c where c.id = call_id and c.organizer_id = (select auth.uid())));
create policy own_responses on public.responses for select to authenticated using (exists(select 1 from public.calls c where c.id = call_id and c.organizer_id = (select auth.uid())));

-- A call becomes visible only when its validated attachment metadata is committed with it.
create function public.publish_call(payload jsonb, files jsonb default '[]') returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cid uuid := (payload->>'id')::uuid; f jsonb; user_email text;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  select email into user_email from auth.users where id = uid and email_confirmed_at is not null;
  if user_email is null then raise exception 'unauthorized'; end if;
  if coalesce((payload->>'performance_at')::timestamptz,(payload->>'call_at')::timestamptz) <= now() then raise exception 'expired'; end if;
  if jsonb_typeof(files) <> 'array' or jsonb_array_length(files) > 10 then raise exception 'invalid_files'; end if;
  -- Retrying after a lost network response must not duplicate a published call.
  if exists(select 1 from public.calls where id = cid and organizer_id = uid) then return cid; end if;
  insert into public.calls(id, organizer_id, ensemble_name, instrument, position, call_at, performance_at, venue, address, repertoire, description, compensation_type, compensation_amount, currency)
  values(cid, uid, payload->>'ensemble_name', payload->>'instrument', nullif(payload->>'position',''), (payload->>'call_at')::timestamptz, (payload->>'performance_at')::timestamptz, payload->>'venue', nullif(payload->>'address',''), nullif(payload->>'repertoire',''), nullif(payload->>'description',''), payload->>'compensation_type', (payload->>'compensation_amount')::numeric, payload->>'currency');
  insert into public.call_contacts(call_id,name,email,phone) values(cid,payload->>'organizer_name',user_email,nullif(payload->>'organizer_phone',''));
  insert into public.organizer_profiles(id,name,phone) values(uid,payload->>'organizer_name',nullif(payload->>'organizer_phone','')) on conflict(id) do update set name=excluded.name, phone=excluded.phone;
  for f in select * from jsonb_array_elements(files) loop
    if f->>'storage_path' not like uid::text || '/' || cid::text || '/%' then raise exception 'invalid_files'; end if;
    if not exists(select 1 from storage.objects where bucket_id = 'call-pdfs' and name = f->>'storage_path' and (metadata->>'size')::bigint = (f->>'size')::bigint and metadata->>'mimetype' = 'application/pdf') then raise exception 'invalid_files'; end if;
    insert into public.attachments(call_id,filename,storage_path,size,content_type) values(cid,f->>'filename',f->>'storage_path',(f->>'size')::integer,'application/pdf');
  end loop;
  return cid;
end $$;
revoke all on function public.publish_call(jsonb,jsonb) from public, anon;
grant execute on function public.publish_call(jsonb,jsonb) to authenticated;

-- Only the application server may submit anonymously. All paths serialize on the call row.
create function public.submit_response(payload jsonb, ip_hash text) returns void language plpgsql security definer set search_path = '' as $$
declare c public.calls; attempt_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(ip_hash, 0));
  delete from public.response_rate_limits where created_at < now() - interval '1 hour';
  select count(*) into attempt_count from public.response_rate_limits r where r.ip_hash = submit_response.ip_hash and created_at > now() - interval '10 minutes';
  if attempt_count >= 5 then raise exception 'rate_limited'; end if;
  select * into c from public.calls where id = (payload->>'call_id')::uuid for update;
  if c.id is null or c.status <> 'open' or c.event_at <= now() then raise exception 'closed'; end if;
  insert into public.responses(call_id,name,email,phone,message,availability) values(c.id,payload->>'name',lower(payload->>'email'),nullif(payload->>'phone',''),nullif(payload->>'message',''),payload->>'availability');
  insert into public.response_rate_limits(ip_hash) values(submit_response.ip_hash);
end $$;
revoke all on function public.submit_response(jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_response(jsonb,text) to service_role;

create function public.select_musician(call_id uuid, response_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare c public.calls;
begin
  select * into c from public.calls where id = call_id for update;
  if c.id is null or c.organizer_id <> auth.uid() or auth.uid() is null then raise exception 'unauthorized'; end if;
  if c.status <> 'open' or c.event_at <= now() then raise exception 'closed'; end if;
  update public.responses set selected = true where id = response_id and responses.call_id = select_musician.call_id;
  if not found then raise exception 'invalid_response'; end if;
  update public.calls set status = 'filled', filled_at = now() where id = call_id;
end $$;
revoke all on function public.select_musician(uuid,uuid) from public, anon;
grant execute on function public.select_musician(uuid,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('call-pdfs','call-pdfs',false,20971520,array['application/pdf']);
create policy upload_own_pdf on storage.objects for insert to authenticated with check(bucket_id='call-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text and not exists(select 1 from public.calls c where c.id::text = (storage.foldername(name))[2]));
create policy read_published_pdf on storage.objects for select to anon, authenticated using(bucket_id='call-pdfs' and (exists(select 1 from public.attachments a where a.storage_path = name) or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy delete_unpublished_pdf on storage.objects for delete to authenticated using(bucket_id='call-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text and not exists(select 1 from public.attachments a where a.storage_path = name));
