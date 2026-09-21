-- Storage checks must see committed metadata even after an uploader leaves an ensemble.
create function public.can_read_call_pdf(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.attachments a join public.calls c on c.id=a.call_id where a.storage_path=path and public.is_ensemble_member(c.ensemble_id))
 or (split_part(path,'/',1)=auth.uid()::text and not exists(select 1 from public.attachments a where a.storage_path=path)));
$$;
create function public.can_delete_staged_pdf(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(path,'/',1)=auth.uid()::text
 and not exists(select 1 from public.attachments a where a.storage_path=path);
$$;
revoke all on function public.can_read_call_pdf(text), public.can_delete_staged_pdf(text) from public,anon;
grant execute on function public.can_read_call_pdf(text),public.can_delete_staged_pdf(text) to authenticated;
drop policy members_read_pdf on storage.objects;
create policy members_read_pdf on storage.objects for select to authenticated using(bucket_id='call-pdfs' and public.can_read_call_pdf(name));
drop policy delete_unpublished_pdf on storage.objects;
create policy delete_unpublished_pdf on storage.objects for delete to authenticated using(bucket_id='call-pdfs' and public.can_delete_staged_pdf(name));
