-- =============================================================
-- EvaluaQR Aula · Etapa 3: actividades y tareas
-- =============================================================

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  instructions text check (char_length(instructions) <= 10000),
  kind text not null default 'task' check (kind in ('task', 'interactive', 'research')),
  tool_id uuid references public.teacher_tools (id) on delete set null,
  mode text not null default 'individual' check (mode in ('individual', 'team')),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  publish_at timestamptz,
  due_at timestamptz,
  allow_late boolean not null default true,
  late_penalty_pct int not null default 0 check (late_penalty_pct between 0 and 100),
  max_attempts int not null default 1 check (max_attempts between 0 and 20),
  max_score numeric(6, 2) not null default 10 check (max_score > 0 and max_score <= 1000),
  rubric jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array' and octet_length(rubric::text) < 50000),
  accept_text boolean not null default true,
  accept_files boolean not null default true,
  accept_link boolean not null default true,
  resources jsonb not null default '[]'::jsonb check (jsonb_typeof(resources) = 'array' and octet_length(resources::text) < 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_class_idx on public.activities (class_id, due_at);
create trigger activities_touch before update on public.activities for each row execute function public.touch_updated_at();

create table public.activity_teams (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create index activity_teams_activity_idx on public.activity_teams (activity_id);

create table public.activity_team_members (
  team_id uuid not null references public.activity_teams (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.class_students (id) on delete cascade,
  primary key (team_id, student_id),
  unique (activity_id, student_id)
);

create table public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.class_students (id) on delete cascade,
  team_id uuid references public.activity_teams (id) on delete set null,
  attempt int not null default 1,
  body text check (char_length(body) <= 20000),
  link text check (char_length(link) <= 1000),
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array' and octet_length(files::text) < 20000),
  answers jsonb check (octet_length(answers::text) < 300000),
  submitted_at timestamptz not null default now(),
  is_late boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted', 'returned', 'graded')),
  score numeric(7, 2) check (score >= 0),
  rubric_scores jsonb,
  feedback text check (char_length(feedback) <= 5000),
  graded_at timestamptz,
  graded_by uuid
);
create index activity_submissions_activity_idx on public.activity_submissions (activity_id, submitted_at desc);
create index activity_submissions_student_idx on public.activity_submissions (student_id);
create index activity_submissions_team_idx on public.activity_submissions (team_id);

-- -------------------------------------------------------------
-- Ayudantes
-- -------------------------------------------------------------
create or replace function private.activity_visible(a public.activities)
returns boolean language sql stable set search_path = '' as $$
  select a.status <> 'draft' and (a.publish_at is null or a.publish_at <= now());
$$;

create or replace function private.can_see_activity(aid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activities a
    where a.id = aid and (private.owns_class(a.class_id) or (private.in_class(a.class_id) and private.activity_visible(a)))
  );
$$;

create or replace function private.my_team(aid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.team_id from public.activity_team_members m
  join public.class_students s on s.id = m.student_id
  where m.activity_id = aid and s.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.is_teammate(aid uuid, other text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activity_team_members m2
    join public.class_students s2 on s2.id = m2.student_id
    where m2.activity_id = aid and m2.team_id = private.my_team(aid) and s2.user_id::text = other
  );
$$;

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.activities enable row level security;
create policy "activities: ver" on public.activities for select to authenticated
  using (private.owns_class(class_id) or (private.in_class(class_id) and status <> 'draft' and (publish_at is null or publish_at <= now())));
create policy "activities: docente crea" on public.activities for insert to authenticated
  with check (private.owns_class(class_id)
    and (tool_id is null or exists (select 1 from public.teacher_tools t where t.id = tool_id and t.owner_id = (select auth.uid()))));
create policy "activities: docente edita" on public.activities for update to authenticated
  using (private.owns_class(class_id))
  with check (private.owns_class(class_id)
    and (tool_id is null or exists (select 1 from public.teacher_tools t where t.id = tool_id and t.owner_id = (select auth.uid()))));
create policy "activities: docente elimina" on public.activities for delete to authenticated
  using (private.owns_class(class_id));

alter table public.activity_teams enable row level security;
create policy "teams: ver" on public.activity_teams for select to authenticated
  using (private.owns_class(class_id) or private.my_team(activity_id) = id);
create policy "teams: docente crea" on public.activity_teams for insert to authenticated
  with check (private.owns_class(class_id) and exists (select 1 from public.activities a where a.id = activity_id and a.class_id = activity_teams.class_id));
create policy "teams: docente edita" on public.activity_teams for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "teams: docente elimina" on public.activity_teams for delete to authenticated
  using (private.owns_class(class_id));

alter table public.activity_team_members enable row level security;
create policy "team_members: ver" on public.activity_team_members for select to authenticated
  using (exists (select 1 from public.activity_teams t where t.id = team_id and private.owns_class(t.class_id))
    or team_id = private.my_team(activity_id));
create policy "team_members: docente agrega" on public.activity_team_members for insert to authenticated
  with check (exists (select 1 from public.activity_teams t
                      join public.class_students s on s.id = student_id and s.class_id = t.class_id
                      where t.id = team_id and t.activity_id = activity_team_members.activity_id and private.owns_class(t.class_id)));
create policy "team_members: docente quita" on public.activity_team_members for delete to authenticated
  using (exists (select 1 from public.activity_teams t where t.id = team_id and private.owns_class(t.class_id)));

alter table public.activity_submissions enable row level security;
create policy "submissions: ver" on public.activity_submissions for select to authenticated
  using (private.owns_class(class_id) or private.is_my_student_row(student_id)
    or (team_id is not null and team_id = private.my_team(activity_id)));
-- Los estudiantes entregan solo con submit_activity(); el docente califica
create policy "submissions: docente califica" on public.activity_submissions for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "submissions: docente elimina" on public.activity_submissions for delete to authenticated
  using (private.owns_class(class_id));
revoke update on public.activity_submissions from authenticated, anon;
grant update (status, score, rubric_scores, feedback, graded_at, graded_by) on public.activity_submissions to authenticated;

-- -------------------------------------------------------------
-- Funciones
-- -------------------------------------------------------------
-- Entregar (individual o en equipo)
create or replace function public.submit_activity(aid uuid, body text default null, link text default null,
                                                  files jsonb default '[]'::jsonb, answers jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.activities;
  st public.class_students;
  team uuid;
  used int;
  last public.activity_submissions;
  late boolean;
  f jsonb;
  prefix text;
  result uuid;
begin
  if auth.uid() is null or private.is_anonymous_user() then raise exception 'Inicia sesión para entregar'; end if;
  select * into a from public.activities where id = aid;
  if not found then raise exception 'La actividad no existe'; end if;
  select * into st from public.class_students where class_id = a.class_id and user_id = auth.uid() and status = 'active';
  if not found or not private.activity_visible(a) then raise exception 'No tienes acceso a esta actividad'; end if;
  if a.status = 'closed' then raise exception 'La actividad ya está cerrada'; end if;

  if a.mode = 'team' then
    team := private.my_team(aid);
    if team is null then raise exception 'Aún no estás en un equipo. Pide a tu docente que te asigne uno.'; end if;
  end if;

  late := a.due_at is not null and now() > a.due_at;
  if late and not a.allow_late then raise exception 'La fecha límite ya pasó y no se aceptan entregas tardías'; end if;

  select count(*) into used from public.activity_submissions s
   where s.activity_id = aid and (case when team is not null then s.team_id = team else s.student_id = st.id end);
  select * into last from public.activity_submissions s
   where s.activity_id = aid and (case when team is not null then s.team_id = team else s.student_id = st.id end)
   order by s.submitted_at desc limit 1;
  if a.max_attempts > 0 and used >= a.max_attempts and coalesce(last.status, '') <> 'returned' then
    raise exception 'Ya usaste todos tus intentos';
  end if;

  body := nullif(left(trim(coalesce(body, '')), 20000), '');
  link := nullif(left(trim(coalesce(link, '')), 1000), '');
  if link is not null and link !~* '^https?://' then raise exception 'El enlace debe empezar con http:// o https://'; end if;
  files := coalesce(files, '[]'::jsonb);
  if jsonb_typeof(files) <> 'array' or jsonb_array_length(files) > 10 then raise exception 'Máximo 10 archivos'; end if;
  prefix := a.class_id::text || '/' || aid::text || '/' || auth.uid()::text || '/';
  for f in select * from jsonb_array_elements(files) loop
    if coalesce(f ->> 'path', '') not like prefix || '%' then raise exception 'Archivo no válido'; end if;
  end loop;
  if a.kind <> 'interactive' then answers := null; end if;
  if body is null and link is null and jsonb_array_length(files) = 0 and answers is null then
    raise exception 'Tu entrega está vacía';
  end if;

  insert into public.activity_submissions (activity_id, class_id, student_id, team_id, attempt, body, link, files, answers, is_late)
  values (aid, a.class_id, st.id, team, used + 1, body, link, files, answers, late)
  returning id into result;
  return result;
end $$;

-- Herramienta asignada (para el estudiante)
create or replace function public.get_activity_tool(aid uuid)
returns table (kind text, title text, data jsonb)
language sql stable security definer set search_path = '' as $$
  select t.kind, t.title, t.data
  from public.activities a join public.teacher_tools t on t.id = a.tool_id
  where a.id = aid and private.can_see_activity(aid);
$$;

-- Mi equipo (nombre y compañeros)
create or replace function public.my_activity_team(aid uuid)
returns table (team_id uuid, team_name text, member_name text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.name, trim(s.first_name || ' ' || s.last_name), s.user_id = auth.uid()
  from public.activity_teams t
  join public.activity_team_members m on m.team_id = t.id
  join public.class_students s on s.id = m.student_id
  where t.id = private.my_team(aid) and private.can_see_activity(aid)
  order by s.last_name, s.first_name;
$$;

revoke execute on function public.submit_activity(uuid, text, text, jsonb, jsonb), public.get_activity_tool(uuid),
  public.my_activity_team(uuid) from public, anon;
grant execute on function public.submit_activity(uuid, text, text, jsonb, jsonb), public.get_activity_tool(uuid),
  public.my_activity_team(uuid) to authenticated;

-- Archivos: {class_id}/{activity_id}/recursos/... (docente) y {class_id}/{activity_id}/{user_id}/... (estudiante)
insert into storage.buckets (id, name, public, file_size_limit)
values ('activity-files', 'activity-files', false, 26214400)
on conflict (id) do nothing;

create policy "activity files: ver" on storage.objects for select to authenticated
  using (bucket_id = 'activity-files' and (
    private.owns_class(private.try_uuid((storage.foldername(objects.name))[1]))
    or ((storage.foldername(objects.name))[3] = 'recursos' and private.can_see_activity(private.try_uuid((storage.foldername(objects.name))[2])))
    or (storage.foldername(objects.name))[3] = (select auth.uid())::text
    or private.is_teammate(private.try_uuid((storage.foldername(objects.name))[2]), (storage.foldername(objects.name))[3])));
create policy "activity files: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'activity-files' and (
    (private.owns_class(private.try_uuid((storage.foldername(objects.name))[1])) and (storage.foldername(objects.name))[3] = 'recursos')
    or ((storage.foldername(objects.name))[3] = (select auth.uid())::text
        and private.in_class(private.try_uuid((storage.foldername(objects.name))[1])))));
create policy "activity files: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'activity-files' and (
    (private.owns_class(private.try_uuid((storage.foldername(objects.name))[1])) and (storage.foldername(objects.name))[3] = 'recursos')
    or (storage.foldername(objects.name))[3] = (select auth.uid())::text));
