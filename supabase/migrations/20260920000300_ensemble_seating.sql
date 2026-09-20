-- Existing ensembles keep custom seating until their owner selects a template.
create function public.valid_ensemble_seating(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  if jsonb_array_length(value)>100 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'en') is distinct from 'string'
      or jsonb_typeof(item->'da') is distinct from 'string'
      or jsonb_typeof(item->'instrument') is distinct from 'string'
      or length(btrim(item->>'en')) not between 1 and 100
      or length(btrim(item->>'da')) not between 1 and 100
      or (item->>'instrument') not in ('violin','viola','cello','double_bass','flute','oboe','clarinet','bassoon','horn','trumpet','trombone','bass_trombone','tuba','percussion','drums','piano','other','saxophone','harp','euphonium','cornet','flugelhorn','tenor_horn','baritone_horn','guitar','bass_guitar') then return false; end if;
  end loop;
  return true;
end $$;
alter table public.ensembles
  add column ensemble_type text not null default 'custom' check (ensemble_type in ('symphony','chamber','strings','wind','brass','big_band','custom')),
  add column seating jsonb not null default '[]' check (public.valid_ensemble_seating(seating));
alter table public.calls drop constraint calls_instrument_check;
alter table public.calls add constraint calls_instrument_check check (instrument in ('violin','viola','cello','double_bass','flute','oboe','clarinet','bassoon','horn','trumpet','trombone','bass_trombone','tuba','percussion','drums','piano','other','saxophone','harp','euphonium','cornet','flugelhorn','tenor_horn','baritone_horn','guitar','bass_guitar'));
create or replace function public.save_ensemble(payload jsonb, ensemble uuid default null) returns uuid
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
  update public.ensembles set ensemble_type=coalesce(payload->>'ensemble_type',ensemble_type), seating=coalesce(payload->'seating',seating) where id=eid;
  return eid;
end $$;
revoke all on function public.save_ensemble(jsonb,uuid) from public, anon;
grant execute on function public.save_ensemble(jsonb,uuid) to authenticated;

