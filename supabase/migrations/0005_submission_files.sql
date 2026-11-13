-- Archivos que suben los evaluadores (campo "Archivo o foto").
-- Ruta: {event_id}/{auth.uid()}/{archivo}. Privado: lo ve quien lo subió y los organizadores del evento.
insert into storage.buckets (id, name, public, file_size_limit)
values ('submission-files', 'submission-files', false, 10485760)
on conflict (id) do nothing;

create or replace function private.try_uuid(value text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return value::uuid;
exception when others then
  return null;
end $$;

create policy "submission-files: evaluador sube" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-files'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and private.is_event_evaluator(private.try_uuid((storage.foldername(name))[1]))
    and private.event_is_open(private.try_uuid((storage.foldername(name))[1]))
  );
create policy "submission-files: ver propios u organizadores" on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-files'
    and ((storage.foldername(name))[2] = (select auth.uid())::text
         or private.is_event_member(private.try_uuid((storage.foldername(name))[1])))
  );
create policy "submission-files: evaluador elimina propios" on storage.objects for delete to authenticated
  using (bucket_id = 'submission-files' and (storage.foldername(name))[2] = (select auth.uid())::text);
