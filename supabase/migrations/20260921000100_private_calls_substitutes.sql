-- All calls and files become ensemble-private, including previously published calls.
drop policy public_calls on public.calls;
drop policy public_attachments on public.attachments;
revoke select on public.calls, public.attachments from anon;
create policy members_read_calls on public.calls for select to authenticated using (public.is_ensemble_member(ensemble_id));
create policy members_read_attachments on public.attachments for select to authenticated using (exists(select 1 from public.calls c where c.id=call_id and public.is_ensemble_member(c.ensemble_id)));
drop policy read_published_pdf on storage.objects;
create policy members_read_pdf on storage.objects for select to authenticated using (
 bucket_id='call-pdfs' and (exists(select 1 from public.attachments a join public.calls c on c.id=a.call_id where a.storage_path=name and public.is_ensemble_member(c.ensemble_id))
 or ((storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.attachments a where a.storage_path=name)))
);

create table public.ensemble_substitutes (
 id uuid primary key default gen_random_uuid(), ensemble_id uuid not null references public.ensembles(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 instrument text not null check(instrument in ('violin','viola','cello','double_bass','flute','oboe','clarinet','bassoon','horn','trumpet','trombone','bass_trombone','tuba','percussion','drums','piano','other','saxophone','harp','euphonium','cornet','flugelhorn','tenor_horn','baritone_horn','guitar','bass_guitar')),
 phone text not null check(length(btrim(phone)) between 3 and 40),
 email text check(email is null or (length(email) between 3 and 254 and email like '%@%')),
 created_at timestamptz not null default now()
);
create index substitutes_ensemble_instrument on public.ensemble_substitutes(ensemble_id,instrument,name);
alter table public.ensemble_substitutes enable row level security;
revoke all on public.ensemble_substitutes from anon,authenticated;
grant select on public.ensemble_substitutes to authenticated;
create policy members_read_substitutes on public.ensemble_substitutes for select to authenticated using(public.is_ensemble_member(ensemble_id));

create table public.call_invitations (
 call_id uuid not null references public.calls(id) on delete cascade,
 substitute_id uuid not null references public.ensemble_substitutes(id) on delete cascade,
 token_hash text unique not null, expires_at timestamptz not null,
 created_at timestamptz not null default now(), primary key(call_id,substitute_id)
);
alter table public.call_invitations enable row level security;
revoke all on public.call_invitations from anon,authenticated;
alter table public.responses add column substitute_id uuid references public.ensemble_substitutes(id) on delete set null;
create unique index responses_call_substitute on public.responses(call_id,substitute_id) where substitute_id is not null;

create function public.save_substitute(ensemble uuid, payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare sid uuid := (payload->>'id')::uuid;
begin
 perform 1 from public.ensembles where id=ensemble for update;
 if not public.is_ensemble_member(ensemble) then raise exception 'unauthorized'; end if;
 if exists(select 1 from public.ensemble_substitutes where id=sid) then
  if not exists(select 1 from public.ensemble_substitutes where id=sid and ensemble_id=ensemble) then raise exception 'unauthorized'; end if;
  -- Editing a contact revokes links issued for its previous identity/instrument.
  delete from public.call_invitations where substitute_id=sid;
  update public.ensemble_substitutes set name=btrim(payload->>'name'), instrument=payload->>'instrument', phone=btrim(payload->>'phone'),email=nullif(lower(btrim(payload->>'email')),'') where id=sid;
 else
  insert into public.ensemble_substitutes(id,ensemble_id,name,instrument,phone,email) values(sid,ensemble,btrim(payload->>'name'),payload->>'instrument',btrim(payload->>'phone'),nullif(lower(btrim(payload->>'email')),''));
 end if;
 return sid;
end $$;
create function public.remove_substitute(ensemble uuid, substitute uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.ensembles where id=ensemble for update;
 if not public.is_ensemble_member(ensemble) then raise exception 'unauthorized'; end if;
 delete from public.ensemble_substitutes where id=substitute and ensemble_id=ensemble;
end $$;
create function public.invite_substitute(call_id uuid, substitute uuid) returns text
language plpgsql security definer set search_path='' as $$
declare c public.calls; eid uuid; token text := replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
begin
 select ensemble_id into eid from public.calls where id=call_id;
 perform 1 from public.ensembles where id=eid for update;
 if not public.is_ensemble_member(eid) then raise exception 'unauthorized'; end if;
 select * into c from public.calls where id=call_id for update;
 if c.status<>'open' or c.event_at<=now() then raise exception 'closed'; end if;
 if not exists(select 1 from public.ensemble_substitutes s where s.id=substitute and s.ensemble_id=eid and s.instrument=c.instrument) then raise exception 'invalid_substitute'; end if;
 insert into public.call_invitations(call_id,substitute_id,token_hash,expires_at)
 values(c.id,substitute,encode(extensions.digest(token,'sha256'),'hex'),c.event_at+interval '7 days')
 on conflict on constraint call_invitations_pkey do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_at=now();
 return token;
end $$;
revoke all on function public.save_substitute(uuid,jsonb),public.remove_substitute(uuid,uuid),public.invite_substitute(uuid,uuid) from public,anon;
grant execute on function public.save_substitute(uuid,jsonb),public.remove_substitute(uuid,uuid),public.invite_substitute(uuid,uuid) to authenticated;

create or replace function public.submit_response(payload jsonb, ip_hash text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.calls; s public.ensemble_substitutes; eid uuid; attempt_count integer;
begin
 select ensemble_id into eid from public.calls where id=(payload->>'call_id')::uuid;
 perform 1 from public.ensembles where id=eid for update;
 select * into c from public.calls where id=(payload->>'call_id')::uuid for update;
 select s1.* into s from public.ensemble_substitutes s1 join public.call_invitations i on i.substitute_id=s1.id
 where i.call_id=c.id and s1.ensemble_id=eid and s1.instrument=c.instrument and i.expires_at>now()
 and i.token_hash=encode(extensions.digest(payload->>'invite_token','sha256'),'hex');
 if s.id is null then raise exception 'invalid_invitation'; end if;
 if c.status<>'open' or c.event_at<=now() then raise exception 'closed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(ip_hash,0));
 delete from public.response_rate_limits where created_at<now()-interval '1 hour';
 select count(*) into attempt_count from public.response_rate_limits r where r.ip_hash=submit_response.ip_hash and created_at>now()-interval '10 minutes';
 if attempt_count>=5 then raise exception 'rate_limited'; end if;
 insert into public.responses(call_id,substitute_id,name,email,phone,message,availability)
 values(c.id,s.id,s.name,coalesce(s.email,lower(payload->>'email')),s.phone,nullif(payload->>'message',''),payload->>'availability');
 insert into public.response_rate_limits(ip_hash) values(submit_response.ip_hash);
end $$;
-- Existing grants remain service-role-only; there is no public response bypass.

create or replace function public.select_musician(call_id uuid, response_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare c public.calls; eid uuid;
begin
 select ensemble_id into eid from public.calls where id=call_id;
 perform 1 from public.ensembles where id=eid for update;
 if not public.is_ensemble_member(eid) then raise exception 'unauthorized'; end if;
 select * into c from public.calls where id=call_id for update;
 if c.id is null or c.status<>'open' or c.event_at<=now() then raise exception 'closed'; end if;
 update public.responses r set selected=true where r.id=response_id and r.call_id=c.id
 and exists(select 1 from public.ensemble_substitutes s where s.id=r.substitute_id and s.ensemble_id=eid and s.instrument=c.instrument);
 if not found then raise exception 'invalid_response'; end if;
 update public.calls set status='filled',filled_at=now() where id=c.id;
end $$;
