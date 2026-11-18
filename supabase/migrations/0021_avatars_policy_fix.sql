-- Corrige la política de lectura de fotos: "name" se resolvía como classes.name dentro del EXISTS
drop policy if exists "avatars: ver con permiso" on storage.objects;
create policy "avatars: ver con permiso" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and private.can_view_profile(((storage.foldername(objects.name))[1])::uuid));
