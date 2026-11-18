-- =============================================================
-- EvaluaQR Aula · Etapa 1: roles, grupos y estudiantes
-- =============================================================

-- Rol del usuario: 'teacher' (docente) o 'student' (estudiante). null = aún no elige.
alter table public.organizers add column if not exists role text check (role in ('teacher', 'student'));
update public.organizers set role = 'teacher' where role is null;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r text := new.raw_user_meta_data ->> 'role';
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.organizers (id, full_name, institution, email, role)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''),
      new.raw_user_meta_data ->> 'institution',
      lower(new.email),
      case when r in ('teacher', 'student') then r else null end
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create or replace function private.is_teacher()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizers o where o.id = auth.uid() and o.role = 'teacher');
$$;

-- Solo los docentes crean eventos y herramientas
drop policy if exists "events: organizador crea" on public.events;
create policy "events: organizador crea" on public.events for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_teacher());
drop policy if exists "tools: dueño crea" on public.teacher_tools;
create policy "tools: dueño crea" on public.teacher_tools for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_teacher());

-- Elegir el rol (solo si aún no tiene uno)
create or replace function public.set_my_role(new_role text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_anonymous_user() then raise exception 'Inicia sesión'; end if;
  if new_role not in ('teacher', 'student') then raise exception 'Rol no válido'; end if;
  update public.organizers set role = new_role where id = auth.uid() and role is null;
  return (select role from public.organizers where id = auth.uid());
end $$;
grant execute on function public.set_my_role(text) to authenticated;

-- -------------------------------------------------------------
-- Grupos
-- -------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.organizers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  subject text check (char_length(subject) <= 150),
  period text check (char_length(period) <= 80),
  grade text check (char_length(grade) <= 40),
  description text check (char_length(description) <= 2000),
  schedule jsonb not null default '[]'::jsonb,
  color text not null default '#6a11cb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  join_code text not null unique default public.random_code(7),
  join_enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index classes_owner_idx on public.classes (owner_id);
create trigger classes_touch before update on public.classes for each row execute function public.touch_updated_at();

-- Lista de estudiantes del grupo (invitados y activos)
create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid references public.organizers (id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  student_number text check (char_length(student_number) <= 40),
  extra_id text check (char_length(extra_id) <= 60),
  section text check (char_length(section) <= 40),
  status text not null default 'invited' check (status in ('invited', 'active')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index class_students_email_uq on public.class_students (class_id, lower(email)) where email is not null;
create unique index class_students_user_uq on public.class_students (class_id, user_id) where user_id is not null;
create index class_students_user_idx on public.class_students (user_id);

create or replace function private.owns_class(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = cid and c.owner_id = auth.uid());
$$;

create or replace function private.in_class(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_students s where s.class_id = cid and s.user_id = auth.uid() and s.status = 'active');
$$;

alter table public.classes enable row level security;
create policy "classes: docente ve" on public.classes for select to authenticated
  using (owner_id = (select auth.uid()) or private.in_class(id));
create policy "classes: docente crea" on public.classes for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_teacher());
create policy "classes: docente edita" on public.classes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "classes: docente elimina" on public.classes for delete to authenticated
  using (owner_id = (select auth.uid()));

alter table public.class_students enable row level security;
-- El docente ve a todos sus alumnos; el alumno solo su propio registro
create policy "class_students: ver" on public.class_students for select to authenticated
  using (private.owns_class(class_id) or user_id = (select auth.uid()));
create policy "class_students: docente agrega" on public.class_students for insert to authenticated
  with check (private.owns_class(class_id));
create policy "class_students: docente edita" on public.class_students for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "class_students: docente elimina" on public.class_students for delete to authenticated
  using (private.owns_class(class_id));

-- Datos públicos de un grupo por su código (para la página de invitación)
create or replace function public.get_class_by_code(code text)
returns table (id uuid, name text, subject text, period text, grade text, color text, teacher text, join_enabled boolean, archived boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.subject, c.period, c.grade, c.color, o.full_name, c.join_enabled, c.archived_at is not null
  from public.classes c join public.organizers o on o.id = c.owner_id
  where c.join_code = upper(trim(code));
$$;
grant execute on function public.get_class_by_code(text) to anon, authenticated;

-- Vincular automáticamente las invitaciones hechas al correo del usuario
create or replace function public.claim_invitations()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  my_email text;
  n integer;
begin
  if auth.uid() is null or private.is_anonymous_user() then return 0; end if;
  select lower(email) into my_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if my_email is null then return 0; end if;
  update public.class_students s
     set user_id = auth.uid(), status = 'active', joined_at = coalesce(s.joined_at, now())
   where lower(s.email) = my_email and s.user_id is null
     and not exists (select 1 from public.class_students x where x.class_id = s.class_id and x.user_id = auth.uid());
  get diagnostics n = row_count;
  if n > 0 then
    update public.organizers set role = 'student' where id = auth.uid() and role is null;
  end if;
  return n;
end $$;
grant execute on function public.claim_invitations() to authenticated;

-- Unirse a un grupo con su código
create or replace function public.join_class(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.classes;
  me public.organizers;
  my_email text;
  existing uuid;
  first_n text;
  last_n text;
begin
  if auth.uid() is null or private.is_anonymous_user() then raise exception 'Inicia sesión para unirte'; end if;
  select * into c from public.classes where join_code = upper(trim(code));
  if not found then raise exception 'El código de grupo no existe'; end if;
  if c.archived_at is not null or not c.join_enabled then raise exception 'Este grupo no está aceptando estudiantes'; end if;
  if c.owner_id = auth.uid() then raise exception 'Eres el docente de este grupo'; end if;
  select * into me from public.organizers where id = auth.uid();
  select lower(email) into my_email from auth.users where id = auth.uid();

  select id into existing from public.class_students where class_id = c.id and user_id = auth.uid();
  if existing is not null then return c.id; end if;

  -- ¿Lo invitaron con su correo? Vincular ese registro
  update public.class_students set user_id = auth.uid(), status = 'active', joined_at = now()
   where class_id = c.id and user_id is null and lower(email) = my_email
   returning id into existing;

  if existing is null then
    first_n := split_part(coalesce(nullif(trim(me.full_name), ''), split_part(my_email, '@', 1)), ' ', 1);
    last_n := trim(substr(coalesce(nullif(trim(me.full_name), ''), ''), char_length(first_n) + 1));
    insert into public.class_students (class_id, user_id, first_name, last_name, email, status, joined_at)
    values (c.id, auth.uid(), left(first_n, 80), left(last_n, 120), my_email, 'active', now());
  end if;
  update public.organizers set role = 'student' where id = auth.uid() and role is null;
  return c.id;
end $$;
grant execute on function public.join_class(text) to authenticated;

-- Grupos del estudiante con nombre del docente
create or replace function public.my_classes()
returns table (id uuid, name text, subject text, period text, grade text, description text, schedule jsonb, color text, teacher text, teacher_email text, archived boolean, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.subject, c.period, c.grade, c.description, c.schedule, c.color, o.full_name, o.email,
         c.archived_at is not null, s.joined_at
  from public.class_students s
  join public.classes c on c.id = s.class_id
  join public.organizers o on o.id = c.owner_id
  where s.user_id = auth.uid() and s.status = 'active'
  order by c.archived_at nulls first, c.name;
$$;
grant execute on function public.my_classes() to authenticated;

-- Funciones solo para usuarios con sesión
revoke execute on function public.set_my_role(text) from anon;
revoke execute on function public.claim_invitations() from anon;
revoke execute on function public.join_class(text) from anon;
revoke execute on function public.my_classes() from anon;
