-- =============================================================
-- EvaluaQR Aula · Etapa 5: notificaciones en la plataforma
-- =============================================================
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.organizers (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  ref_id uuid,
  title text not null check (char_length(title) <= 300),
  body text check (char_length(body) <= 600),
  link text check (char_length(link) <= 300),
  created_at timestamptz not null default now(),
  visible_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, visible_at desc);
create index notifications_ref_idx on public.notifications (ref_id);

alter table public.notifications enable row level security;
create policy "notifications: ver propias" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and visible_at <= now());
create policy "notifications: marcar leídas" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: borrar propias" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- Ayudante: notificar a todos los estudiantes activos de un grupo
create or replace function private.notify_class_students(cid uuid, k text, ref uuid, t text, b text, l text, vis timestamptz default now())
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link, visible_at)
  select s.user_id, cid, k, ref, left(t, 300), left(b, 600), l, coalesce(vis, now())
  from public.class_students s where s.class_id = cid and s.status = 'active' and s.user_id is not null;
$$;

create or replace function private.notify_user(uid uuid, cid uuid, k text, ref uuid, t text, b text, l text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, class_id, kind, ref_id, title, body, link)
  select uid, cid, k, ref, left(t, 300), left(b, 600), l where uid is not null;
$$;

create or replace function private.fmt_due(ts timestamptz)
returns text language sql immutable set search_path = '' as $$
  select case when ts is null then 'sin fecha límite'
    else 'entrega ' || to_char(ts at time zone 'America/Hermosillo', 'DD/MM/YYYY HH24:MI') end;
$$;

-- 1) Actividad publicada → estudiantes (si es programada, aparece en su fecha)
create or replace function private.on_activity_published()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cname text;
begin
  select name into cname from public.classes where id = new.class_id;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status = 'draft') then
    perform private.notify_class_students(new.class_id, 'activity', new.id, 'Nueva actividad: ' || new.title,
      cname || ' · ' || private.fmt_due(new.due_at), '/actividades/' || new.id, coalesce(new.publish_at, now()));
  elsif tg_op = 'UPDATE' and new.status = 'published' and new.publish_at is distinct from old.publish_at then
    update public.notifications set visible_at = coalesce(new.publish_at, now())
     where ref_id = new.id and kind = 'activity' and read_at is null;
  elsif tg_op = 'UPDATE' and new.status = 'draft' and old.status <> 'draft' then
    delete from public.notifications where ref_id = new.id and kind = 'activity' and visible_at > now();
  end if;
  return new;
end $$;
create trigger activities_notify after insert or update of status, publish_at on public.activities
  for each row execute function private.on_activity_published();

-- 2) Entregas: nueva → docente; calificada/devuelta → estudiante(s)
create or replace function private.on_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  a public.activities;
  owner uuid;
  sname text;
  t text;
  b text;
begin
  select * into a from public.activities where id = new.activity_id;
  if tg_op = 'INSERT' then
    select c.owner_id into owner from public.classes c where c.id = new.class_id;
    select trim(first_name || ' ' || last_name) into sname from public.class_students where id = new.student_id;
    perform private.notify_user(owner, new.class_id, 'submission', new.id,
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
create trigger activity_submissions_notify after insert or update of status on public.activity_submissions
  for each row execute function private.on_submission();

-- 3) Justificantes
create or replace function private.on_excuse()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  sname text;
  label text;
begin
  select c.owner_id into owner from public.classes c where c.id = new.class_id;
  select trim(first_name || ' ' || last_name) into sname from public.class_students where id = new.student_id;
  if tg_op = 'INSERT' or (new.status = 'pending' and old.status = 'needs_info') then
    perform private.notify_user(owner, new.class_id, 'excuse', new.id,
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
create trigger excuses_notify after insert or update of status on public.excuses
  for each row execute function private.on_excuse();

-- 4) Pase de lista abierto → estudiantes; falta al cerrar → estudiante
create or replace function private.on_attendance_session()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cname text;
begin
  select name into cname from public.classes where id = new.class_id;
  perform private.notify_class_students(new.class_id, 'attendance', new.id, 'Pase de lista abierto: ' || cname,
    'Escanea el QR o escribe el código en Asistencia.', '/asistencia');
  return new;
end $$;
create trigger attendance_sessions_notify after insert on public.attendance_sessions
  for each row execute function private.on_attendance_session();

create or replace function private.on_absence()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  cname text;
  d timestamptz;
begin
  if new.status <> 'absent' then return new; end if;
  select user_id into uid from public.class_students where id = new.student_id;
  select name into cname from public.classes where id = new.class_id;
  select starts_at into d from public.attendance_sessions where id = new.session_id;
  perform private.notify_user(uid, new.class_id, 'absence', new.id, 'Falta registrada: ' || cname,
    to_char(d at time zone 'America/Hermosillo', 'DD/MM/YYYY') || ' · Si tuviste un motivo, envía un justificante.', '/asistencia');
  return new;
end $$;
create trigger attendance_records_absence_notify after insert on public.attendance_records
  for each row execute function private.on_absence();

-- 5) Estudiante se unió → docente
create or replace function private.on_student_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  cname text;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    select c.owner_id, c.name into owner, cname from public.classes c where c.id = new.class_id;
    if owner <> new.user_id then
      perform private.notify_user(owner, new.class_id, 'joined', new.id,
        trim(new.first_name || ' ' || new.last_name) || ' se unió a ' || cname, null, '/aula/' || new.class_id || '/estudiantes');
    end if;
  end if;
  return new;
end $$;
create trigger class_students_joined_notify after insert or update of status on public.class_students
  for each row execute function private.on_student_joined();
