-- Cada maestro puede listar (y por lo tanto eliminar) solo sus propios archivos de fichas
create policy "worksheet-assets: maestro lista" on storage.objects for select to authenticated
  using (bucket_id = 'worksheet-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
