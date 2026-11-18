-- Fichas interactivas (tipo "worksheet") y respuestas de alumnos
alter table public.teacher_tools drop constraint if exists teacher_tools_kind_check;
alter table public.teacher_tools add constraint teacher_tools_kind_check
  check (kind in ('wheel', 'wordsearch', 'crossword', 'worksheet'));

-- Imágenes de páginas, audios y presentaciones de las fichas (lectura pública, URLs no adivinables)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worksheet-assets', 'worksheet-assets', true, 26214400,
        array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a',
              'audio/wav', 'audio/ogg', 'audio/webm',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'application/vnd.ms-powerpoint'])
on conflict (id) do nothing;

create policy "worksheet-assets: maestro sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'worksheet-assets' and not private.is_anonymous_user()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "worksheet-assets: maestro elimina" on storage.objects for delete to authenticated
  using (bucket_id = 'worksheet-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.worksheet_submissions (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.teacher_tools (id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 120),
  student_group text check (char_length(student_group) <= 80),
  answers jsonb not null default '{}'::jsonb check (octet_length(answers::text) < 300000),
  manual_points jsonb not null default '{}'::jsonb,
  feedback text check (char_length(feedback) <= 4000),
  created_at timestamptz not null default now()
);
create index worksheet_submissions_tool_idx on public.worksheet_submissions (tool_id, created_at desc);

create or replace function private.owns_tool(tid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teacher_tools t where t.id = tid and t.owner_id = auth.uid());
$$;

alter table public.worksheet_submissions enable row level security;
create policy "ws_sub: maestro ve" on public.worksheet_submissions for select to authenticated
  using (private.owns_tool(tool_id));
create policy "ws_sub: maestro califica" on public.worksheet_submissions for update to authenticated
  using (private.owns_tool(tool_id)) with check (private.owns_tool(tool_id));
create policy "ws_sub: maestro elimina" on public.worksheet_submissions for delete to authenticated
  using (private.owns_tool(tool_id));

-- El alumno (sin cuenta) envía sus respuestas a una ficha compartida
create or replace function public.submit_worksheet(code text, student_name text, student_group text, answers jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t public.teacher_tools;
  result uuid;
begin
  select * into t from public.teacher_tools where share_code = upper(trim(code));
  if not found or not t.is_public or t.kind <> 'worksheet' then
    raise exception 'Esta ficha no está disponible';
  end if;
  if coalesce(trim(student_name), '') = '' then
    raise exception 'Escribe tu nombre';
  end if;
  insert into public.worksheet_submissions (tool_id, student_name, student_group, answers)
  values (t.id, left(trim(student_name), 120), nullif(left(trim(coalesce(student_group, '')), 80), ''), coalesce(answers, '{}'::jsonb))
  returning id into result;
  return result;
end $$;
grant execute on function public.submit_worksheet(text, text, text, jsonb) to anon, authenticated;
