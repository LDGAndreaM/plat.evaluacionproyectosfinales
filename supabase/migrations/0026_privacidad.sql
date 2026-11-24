-- =============================================================
-- Aviso de privacidad: consentimiento y eliminación de cuenta
-- =============================================================
alter table public.organizers
  add column privacy_accepted_at timestamptz,
  add column privacy_version text check (char_length(privacy_version) <= 20);

-- Al registrarse con correo, la aceptación llega en los metadatos
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r text := new.raw_user_meta_data ->> 'role';
  v text := new.raw_user_meta_data ->> 'privacy_version';
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.organizers (id, full_name, institution, email, role, privacy_accepted_at, privacy_version)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''),
      new.raw_user_meta_data ->> 'institution',
      lower(new.email),
      case when r in ('teacher', 'student') then r else null end,
      case when v is not null then now() end,
      left(v, 20)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.accept_privacy(version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_anonymous_user() then raise exception 'Inicia sesión'; end if;
  update public.organizers set privacy_accepted_at = now(), privacy_version = left(version, 20) where id = auth.uid();
end $$;

-- Eliminar la propia cuenta.
-- Se borran: perfil, foto y contacto, grupos/eventos/herramientas propias (si es docente), justificantes propios,
-- y las coordenadas de ubicación de sus registros de asistencia. Las calificaciones y la asistencia quedan
-- en el expediente del docente sin vínculo a la cuenta.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or private.is_anonymous_user() then raise exception 'Inicia sesión'; end if;
  update public.attendance_records r set lat = null, lng = null, accuracy_m = null, location_at = null
    from public.class_students s where s.id = r.student_id and s.user_id = me;
  delete from public.excuses where user_id = me;
  delete from public.notifications where user_id = me;
  delete from auth.users where id = me;
end $$;

revoke execute on function public.accept_privacy(text), public.delete_my_account() from public, anon;
grant execute on function public.accept_privacy(text), public.delete_my_account() to authenticated;

-- El docente puede borrar los archivos de sus grupos (justificantes y entregas) al eliminar su cuenta o un grupo
create policy "excuses files: docente borra" on storage.objects for delete to authenticated
  using (bucket_id = 'excuses' and private.owns_class(private.try_uuid((storage.foldername(objects.name))[1])));
create policy "activity files: docente borra entregas" on storage.objects for delete to authenticated
  using (bucket_id = 'activity-files' and private.owns_class(private.try_uuid((storage.foldername(objects.name))[1])));

-- Las cuentas que ya existían deben aceptar el aviso al entrar (privacy_accepted_at queda vacío)
