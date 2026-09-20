-- Fees and practical information belong to individual calls.
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
  values(cid,uid,eid,e.name,payload->>'instrument',nullif(payload->>'position',''),(payload->>'call_at')::timestamptz,(payload->>'performance_at')::timestamptz,coalesce(payload->>'venue',e.venue),coalesce(payload->>'address',e.address),nullif(payload->>'repertoire',''),coalesce(payload->>'description',''),coalesce(payload->>'compensation_type','negotiable'),case when payload ? 'compensation_type' then (payload->>'compensation_amount')::numeric else null end,case when payload ? 'compensation_type' then payload->>'currency' else null end);
  insert into public.call_contacts(call_id,name,email,phone) values(cid,profile.name,user_email,profile.phone);
  for f in select * from jsonb_array_elements(files) loop
    if f->>'storage_path' not like uid::text || '/' || cid::text || '/%' then raise exception 'invalid_files'; end if;
    if not exists(select 1 from storage.objects where bucket_id='call-pdfs' and name=f->>'storage_path' and (metadata->>'size')::bigint=(f->>'size')::bigint and metadata->>'mimetype'='application/pdf') then raise exception 'invalid_files'; end if;
    insert into public.attachments(call_id,filename,storage_path,size,content_type) values(cid,f->>'filename',f->>'storage_path',(f->>'size')::integer,'application/pdf');
  end loop;
  return cid;
end $$;

