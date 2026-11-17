-- Herramientas para maestros: ruleta, sopa de letras y crucigrama, guardadas por usuario.
create table public.teacher_tools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.organizers (id) on delete cascade,
  kind text not null check (kind in ('wheel', 'wordsearch', 'crossword')),
  title text not null default '' check (char_length(title) <= 200),
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) < 600000),
  is_public boolean not null default false,
  share_code text not null unique default public.random_code(8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_tools_owner_idx on public.teacher_tools (owner_id, updated_at desc);
create trigger teacher_tools_touch before update on public.teacher_tools
  for each row execute function public.touch_updated_at();

alter table public.teacher_tools enable row level security;
create policy "tools: dueño ve" on public.teacher_tools for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "tools: dueño crea" on public.teacher_tools for insert to authenticated
  with check (owner_id = (select auth.uid()) and not private.is_anonymous_user());
create policy "tools: dueño edita" on public.teacher_tools for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "tools: dueño elimina" on public.teacher_tools for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Versión pública (para estudiantes) solo si el maestro activó "compartir"
create or replace function public.get_shared_tool(code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kind', t.kind, 'title', t.title, 'data', t.data - 'history')
  from public.teacher_tools t
  where t.share_code = upper(trim(code)) and t.is_public;
$$;
grant execute on function public.get_shared_tool(text) to anon, authenticated;
