-- =============================================================
-- Co-docentes, avisos del grupo y comentarios en entregas
-- =============================================================

-- ---------- Co-docentes ----------
create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references public.organizers (id) on delete cascade,
  added_by uuid,
  added_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index class_teachers_user_idx on public.class_teachers (user_id);

-- "Docente del grupo" = titular o co-docente (lo usan todas las reglas de Aula)
create or replace function private.owns_class(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = cid and c.owner_id = auth.uid())
      or exists (select 1 from public.class_teachers t where t.class_id = cid and t.user_id = auth.uid());
$$;

create or replace function private.is_class_owner(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classes c where c.id = cid and c.owner_id = auth.uid());
$$;

create or replace function private.class_teacher_ids(cid uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select owner_id from public.classes where id = cid
  union select user_id from public.class_teachers where class_id = cid;
$$;

alter table public.class_teachers enable row level security;
create policy "class_teachers: ver" on public.class_teachers for select to authenticated
  using (private.owns_class(class_id));
create policy "class_teachers: titular quita o uno mismo sale" on public.class_teachers for delete to authenticated
  using (private.is_class_owner(class_id) or user_id = (select auth.uid()));

-- Grupos: los co-docentes ven y editan; solo el titular elimina
drop policy if exists "classes: docente ve" on public.classes;
create policy "classes: docente ve" on public.classes for select to authenticated
  using (private.owns_class(id) or private.in_class(id));
drop policy if exists "classes: docente edita" on public.classes;
create policy "classes: docente edita" on public.classes for update to authenticated
  using (private.owns_class(id)) with check (private.owns_class(id));

create or replace function private.keep_class_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then raise exception 'No se puede cambiar el titular del grupo'; end if;
  return new;
end $$;
create trigger classes_keep_owner before update on public.classes for each row execute function private.keep_class_owner();

create or replace function public.add_class_teacher(cid uuid, teacher_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  o public.organizers;
begin
  if not private.is_class_owner(cid) then raise exception 'Solo el titular del grupo puede agregar co-docentes'; end if;
  select * into o from public.organizers where email = lower(trim(teacher_email));
  if not found then raise exception 'No hay una cuenta con ese correo. Pídele que se registre como docente.'; end if;
  if o.role is distinct from 'teacher' then raise exception 'Esa cuenta no es de docente'; end if;
  if o.id = auth.uid() then raise exception 'Ya eres el titular del grupo'; end if;
  if exists (select 1 from public.class_students s where s.class_id = cid and s.user_id = o.id) then
    raise exception 'Esa persona está inscrita como estudiante en el grupo';
  end if;
  insert into public.class_teachers (class_id, user_id, added_by) values (cid, o.id, auth.uid()) on conflict do nothing;
  insert into public.notifications (user_id, class_id, kind, title, body, link)
  select o.id, cid, 'joined', 'Te agregaron como co-docente', c.name, '/aula/' || cid from public.classes c where c.id = cid;
  return coalesce(nullif(o.full_name, ''), o.email);
end $$;

create or replace function public.class_teacher_list(cid uuid)
returns table (user_id uuid, full_name text, email text, is_owner boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, o.full_name, o.email, o.id = c.owner_id
  from public.classes c
  join public.organizers o on o.id in (select private.class_teacher_ids(c.id))
  where c.id = cid and private.owns_class(cid)
  order by (o.id = c.owner_id) desc, o.full_name;
$$;

-- Pase de lista: también lo abren los co-docentes
create or replace function public.open_attendance(cid uuid, minutes int, topic text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.classes;
  sid uuid;
  prev uuid;
begin
  select * into c from public.classes where id = cid;
  if not found or not private.owns_class(cid) then raise exception 'No tienes acceso a este grupo'; end if;
  if c.archived_at is not null then raise exception 'El grupo está archivado'; end if;
  if minutes not in (2, 5, 10, 15) then raise exception 'Duración no válida'; end if;
  for prev in select id from public.attendance_sessions where class_id = cid and status = 'open' loop
    perform public.close_attendance(prev);
  end loop;
  insert into public.attendance_sessions (class_id, topic, late_after_min, qr_minutes, expires_at)
  values (cid, nullif(left(trim(coalesce(topic, '')), 150), ''), c.att_late_after_min, minutes, now() + make_interval(mins => minutes))
  returning id into sid;
  insert into public.attendance_secrets (session_id) values (sid);
  return sid;
end $$;

-- Perfil visible entre estudiantes y todos los docentes del grupo
create or replace function private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target = auth.uid() or exists (
    select 1 from public.class_students s
    where s.status = 'active'
      and ((s.user_id = target and private.owns_class(s.class_id))
        or (s.user_id = auth.uid() and target in (select private.class_teacher_ids(s.class_id))))
  );
$$;

-- Ayudante: notificar a todos los docentes del grupo
create or replace function private.notify_class_teachers(cid uuid, k text, ref uuid, t text, b text, l text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link)
  select tid, cid, k, ref, left(t, 300), left(b, 600), l from private.class_teacher_ids(cid) tid where tid is not null;
$$;

create or replace function private.on_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a public.activities;
  sname text;
  t text;
  b text;
begin
  select * into a from public.activities where id = new.activity_id;
  if tg_op = 'INSERT' then
    select trim(first_name || ' ' || last_name) into sname from public.class_students where id = new.student_id;
    perform private.notify_class_teachers(new.class_id, 'submission', new.id,
      'Nueva entrega: ' || a.title,
      coalesce(sname, 'Un estudiante') || case when new.team_id is not null then ' (por su equipo)' else '' end
        || case when new.is_late then ' · entregó tarde' else '' end,
      '/aula/' || new.class_id || '/actividades/' || new.activity_id);
  elsif new.status is distinct from old.status and new.status in ('graded', 'returned') then
    if new.status = 'graded' then
      t := 'Calificación: ' || a.title;
      b := 'Obtuviste ' || trim(to_char(new.score * (1 - case when new.is_late then a.late_penalty_pct else 0 end / 100.0), 'FM9990.0'))
           || ' de ' || trim(to_char(a.max_score, 'FM9990.##'));
    else
      t := 'Tu docente pidió correcciones: ' || a.title;
      b := coalesce(left(new.feedback, 200), 'Revisa los comentarios y vuelve a entregar.');
    end if;
    insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link)
    select distinct s.user_id, new.class_id, 'grade', new.id, left(t, 300), left(b, 600), '/actividades/' || new.activity_id
    from public.class_students s
    where s.user_id is not null and (
      s.id = new.student_id
      or (new.team_id is not null and s.id in (select m.student_id from public.activity_team_members m where m.team_id = new.team_id)));
  end if;
  return new;
end $$;

create or replace function private.on_excuse()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  sname text;
  label text;
begin
  select trim(first_name || ' ' || last_name) into sname from public.class_students where id = new.student_id;
  if tg_op = 'INSERT' or (new.status = 'pending' and old.status = 'needs_info') then
    perform private.notify_class_teachers(new.class_id, 'excuse', new.id,
      case when tg_op = 'INSERT' then 'Nuevo justificante' else 'Justificante actualizado' end,
      coalesce(sname, 'Un estudiante') || ' · ' || to_char(new.date_from, 'DD/MM') ||
        case when new.date_to <> new.date_from then '–' || to_char(new.date_to, 'DD/MM') else '' end,
      '/aula/' || new.class_id || '/asistencia?v=justificantes');
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected', 'needs_info') then
    label := case new.status when 'approved' then 'aprobado' when 'rejected' then 'rechazado' else 'requiere más información' end;
    perform private.notify_user(new.user_id, new.class_id, 'excuse', new.id, 'Justificante ' || label,
      coalesce(new.teacher_comment, 'Revisa el detalle en Justificantes.'), '/justificantes');
  end if;
  return new;
end $$;

create or replace function private.on_student_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cname text;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    select c.name into cname from public.classes c where c.id = new.class_id;
    perform private.notify_class_teachers(new.class_id, 'joined', new.id,
      trim(new.first_name || ' ' || new.last_name) || ' se unió a ' || cname, null, '/aula/' || new.class_id || '/estudiantes');
  end if;
  return new;
end $$;

-- Un docente o co-docente no se une como estudiante
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
  if private.owns_class(c.id) then raise exception 'Eres docente de este grupo'; end if;
  select * into me from public.organizers where id = auth.uid();
  select lower(email) into my_email from auth.users where id = auth.uid();

  select id into existing from public.class_students where class_id = c.id and user_id = auth.uid();
  if existing is not null then return c.id; end if;

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

-- ---------- Avisos del grupo ----------
create table public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid references public.organizers (id) on delete set null,
  title text not null check (char_length(title) between 1 and 150),
  body text check (char_length(body) <= 4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index class_announcements_class_idx on public.class_announcements (class_id, created_at desc);
create trigger class_announcements_touch before update on public.class_announcements for each row execute function public.touch_updated_at();

alter table public.class_announcements enable row level security;
create policy "announcements: ver" on public.class_announcements for select to authenticated
  using (private.owns_class(class_id) or private.in_class(class_id));
create policy "announcements: docente crea" on public.class_announcements for insert to authenticated
  with check (private.owns_class(class_id) and author_id = (select auth.uid()));
create policy "announcements: docente edita" on public.class_announcements for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "announcements: docente elimina" on public.class_announcements for delete to authenticated
  using (private.owns_class(class_id));

create or replace function private.on_announcement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cname text;
begin
  select name into cname from public.classes where id = new.class_id;
  perform private.notify_class_students(new.class_id, 'announcement', new.id, 'Aviso: ' || new.title,
    cname || coalesce(' · ' || left(new.body, 160), ''), '/aula/' || new.class_id);
  return new;
end $$;
create trigger class_announcements_notify after insert on public.class_announcements
  for each row execute function private.on_announcement();

-- ---------- Comentarios en entregas ----------
create table public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.activity_submissions (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid references public.organizers (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index submission_comments_sub_idx on public.submission_comments (submission_id, created_at);

create or replace function private.can_see_submission(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activity_submissions s
    where s.id = sid and (private.owns_class(s.class_id) or private.is_my_student_row(s.student_id)
      or (s.team_id is not null and s.team_id = private.my_team(s.activity_id))));
$$;

alter table public.submission_comments enable row level security;
create policy "comments: ver" on public.submission_comments for select to authenticated
  using (private.can_see_submission(submission_id));
create policy "comments: escribir" on public.submission_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_see_submission(submission_id)
    and exists (select 1 from public.activity_submissions s where s.id = submission_id and s.class_id = submission_comments.class_id));
create policy "comments: borrar propio" on public.submission_comments for delete to authenticated
  using (author_id = (select auth.uid()));

create or replace function private.on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s public.activity_submissions;
  a public.activities;
  who text;
begin
  select * into s from public.activity_submissions where id = new.submission_id;
  select * into a from public.activities where id = s.activity_id;
  select coalesce(nullif(full_name, ''), 'Alguien') into who from public.organizers where id = new.author_id;
  if new.author_id in (select private.class_teacher_ids(s.class_id)) then
    insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link)
    select distinct st.user_id, s.class_id, 'comment', s.id, left('Comentario en ' || a.title, 300), left(who || ': ' || new.body, 600), '/actividades/' || a.id
    from public.class_students st
    where st.user_id is not null and st.user_id <> new.author_id and (
      st.id = s.student_id
      or (s.team_id is not null and st.id in (select m.student_id from public.activity_team_members m where m.team_id = s.team_id)));
  else
    insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link)
    select tid, s.class_id, 'comment', s.id, left('Comentario en ' || a.title, 300), left(who || ': ' || new.body, 600),
           '/aula/' || s.class_id || '/actividades/' || a.id
    from private.class_teacher_ids(s.class_id) tid where tid is not null;
  end if;
  return new;
end $$;
create trigger submission_comments_notify after insert on public.submission_comments
  for each row execute function private.on_comment();

-- Nombres de quienes comentan (docentes y estudiantes no se ven entre sí en organizers)
create or replace function public.submission_comment_list(sid uuid)
returns table (id uuid, author_id uuid, author_name text, is_teacher boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.author_id, coalesce(nullif(o.full_name, ''), 'Usuario'),
         c.author_id in (select private.class_teacher_ids(c.class_id)), c.body, c.created_at
  from public.submission_comments c left join public.organizers o on o.id = c.author_id
  where c.submission_id = sid and private.can_see_submission(sid)
  order by c.created_at;
$$;

revoke execute on function public.add_class_teacher(uuid, text), public.class_teacher_list(uuid), public.submission_comment_list(uuid)
  from public, anon;
grant execute on function public.add_class_teacher(uuid, text), public.class_teacher_list(uuid), public.submission_comment_list(uuid)
  to authenticated;
