-- =============================================================
-- Mi perfil: foto y datos de contacto
-- Solo los ven: la persona, sus docentes (si es estudiante) y sus estudiantes (si es docente).
-- =============================================================

create table public.profile_details (
  user_id uuid primary key references public.organizers (id) on delete cascade,
  avatar_path text check (char_length(avatar_path) <= 300),
  phone text check (char_length(phone) <= 40),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  program text check (char_length(program) <= 150),
  about text check (char_length(about) <= 500),
  updated_at timestamptz not null default now()
);
create trigger profile_details_touch before update on public.profile_details
  for each row execute function public.touch_updated_at();

-- ¿Puedo ver el perfil de "target"? (relación docente ↔ estudiante en un grupo)
create or replace function private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target = auth.uid() or exists (
    select 1 from public.class_students s join public.classes c on c.id = s.class_id
    where s.status = 'active'
      and ((c.owner_id = auth.uid() and s.user_id = target)
        or (s.user_id = auth.uid() and c.owner_id = target))
  );
$$;

alter table public.profile_details enable row level security;
create policy "profile: ver propio o relación docente-estudiante" on public.profile_details for select to authenticated
  using (private.can_view_profile(user_id));
create policy "profile: crear propio" on public.profile_details for insert to authenticated
  with check (user_id = (select auth.uid()) and not private.is_anonymous_user());
create policy "profile: editar propio" on public.profile_details for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Fotos de perfil (privadas; se muestran con URL firmada)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: ver con permiso" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.class_students s join public.classes c on c.id = s.class_id
      where s.status = 'active'
        and ((c.owner_id = auth.uid() and s.user_id::text = (storage.foldername(name))[1])
          or (s.user_id = auth.uid() and c.owner_id::text = (storage.foldername(name))[1]))
    )));
create policy "avatars: subir propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and not private.is_anonymous_user());
create policy "avatars: actualizar propia" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: borrar propia" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
