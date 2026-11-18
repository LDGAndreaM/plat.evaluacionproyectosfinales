-- =============================================================
-- EvaluaQR Aula · Etapa 2: asistencia con QR, ubicación y justificantes
-- =============================================================

-- Ajustes de asistencia del grupo
alter table public.classes
  add column att_late_after_min int not null default 10 check (att_late_after_min between 0 and 240),
  add column att_lat double precision check (att_lat between -90 and 90),
  add column att_lng double precision check (att_lng between -180 and 180),
  add column att_radius_m int not null default 100 check (att_radius_m between 20 and 5000),
  add column att_require_location boolean not null default false;

-- Sesiones (un pase de lista)
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  topic text check (char_length(topic) <= 150),
  starts_at timestamptz not null default now(),
  late_after_min int not null default 10,
  qr_minutes int not null default 5 check (qr_minutes between 1 and 60),
  expires_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index attendance_sessions_class_idx on public.attendance_sessions (class_id, starts_at desc);

-- Secreto del QR dinámico (sin políticas: nadie lo lee directo)
create table public.attendance_secrets (
  session_id uuid primary key references public.attendance_sessions (id) on delete cascade,
  secret text not null default encode(extensions.gen_random_bytes(24), 'hex')
);
alter table public.attendance_secrets enable row level security;

-- Registros por estudiante
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.class_students (id) on delete cascade,
  status text not null check (status in ('present', 'late', 'absent', 'excused', 'review')),
  method text not null default 'manual' check (method in ('qr', 'code', 'manual', 'auto', 'excuse')),
  checked_at timestamptz,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  location_at timestamptz,
  distance_m double precision,
  location_ok boolean,
  note text check (char_length(note) <= 300),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index attendance_records_student_idx on public.attendance_records (student_id);
create index attendance_records_class_idx on public.attendance_records (class_id);
create trigger attendance_records_touch before update on public.attendance_records
  for each row execute function public.touch_updated_at();

-- Historial de cambios (auditoría)
create table public.attendance_changes (
  id bigint generated always as identity primary key,
  record_id uuid not null references public.attendance_records (id) on delete cascade,
  class_id uuid not null,
  old_status text,
  new_status text not null,
  method text,
  changed_by uuid,
  note text,
  changed_at timestamptz not null default now()
);
create index attendance_changes_record_idx on public.attendance_changes (record_id);

create or replace function private.log_attendance_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.attendance_changes (record_id, class_id, old_status, new_status, method, changed_by, note)
    values (new.id, new.class_id, case when tg_op = 'UPDATE' then old.status end, new.status, new.method, auth.uid(), new.note);
  end if;
  return new;
end $$;
create trigger attendance_records_log after insert or update on public.attendance_records
  for each row execute function private.log_attendance_change();

-- Intentos fallidos de código (anti fuerza bruta)
create table public.attendance_failed_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now()
);
create index attendance_failed_attempts_idx on public.attendance_failed_attempts (user_id, at);
alter table public.attendance_failed_attempts enable row level security;

-- Justificantes
create table public.excuses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.class_students (id) on delete cascade,
  user_id uuid not null references public.organizers (id) on delete cascade,
  date_from date not null,
  date_to date not null,
  reason text not null check (char_length(reason) between 3 and 1500),
  file_path text check (char_length(file_path) <= 300),
  file_name text check (char_length(file_name) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_info')),
  teacher_comment text check (char_length(teacher_comment) <= 1000),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_to >= date_from and date_to - date_from <= 60)
);
create index excuses_class_idx on public.excuses (class_id, status);
create index excuses_user_idx on public.excuses (user_id);
create trigger excuses_touch before update on public.excuses for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
create or replace function private.is_my_student_row(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_students s where s.id = sid and s.user_id = auth.uid());
$$;

alter table public.attendance_sessions enable row level security;
create policy "att_sessions: ver" on public.attendance_sessions for select to authenticated
  using (private.owns_class(class_id) or private.in_class(class_id));
create policy "att_sessions: docente edita" on public.attendance_sessions for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "att_sessions: docente elimina" on public.attendance_sessions for delete to authenticated
  using (private.owns_class(class_id));

alter table public.attendance_records enable row level security;
create policy "att_records: ver" on public.attendance_records for select to authenticated
  using (private.owns_class(class_id) or private.is_my_student_row(student_id));
create policy "att_records: docente crea" on public.attendance_records for insert to authenticated
  with check (private.owns_class(class_id)
    and exists (select 1 from public.attendance_sessions x where x.id = session_id and x.class_id = attendance_records.class_id)
    and exists (select 1 from public.class_students y where y.id = student_id and y.class_id = attendance_records.class_id));
create policy "att_records: docente edita" on public.attendance_records for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "att_records: docente elimina" on public.attendance_records for delete to authenticated
  using (private.owns_class(class_id));

alter table public.attendance_changes enable row level security;
create policy "att_changes: ver" on public.attendance_changes for select to authenticated
  using (private.owns_class(class_id)
    or exists (select 1 from public.attendance_records r where r.id = record_id and private.is_my_student_row(r.student_id)));

alter table public.excuses enable row level security;
create policy "excuses: ver" on public.excuses for select to authenticated
  using (user_id = (select auth.uid()) or private.owns_class(class_id));
create policy "excuses: estudiante crea" on public.excuses for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and private.is_my_student_row(student_id)
    and exists (select 1 from public.class_students s where s.id = student_id and s.class_id = excuses.class_id and s.status = 'active'));
create policy "excuses: estudiante corrige" on public.excuses for update to authenticated
  using (user_id = (select auth.uid()) and status in ('pending', 'needs_info'))
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "excuses: estudiante retira" on public.excuses for delete to authenticated
  using (user_id = (select auth.uid()) and status in ('pending', 'needs_info'));
-- El estudiante solo puede tocar estas columnas; la revisión va por review_excuse()
revoke insert, update on public.excuses from authenticated, anon;
grant insert (class_id, student_id, user_id, date_from, date_to, reason, file_path, file_name, status) on public.excuses to authenticated;
grant update (date_from, date_to, reason, file_path, file_name, status) on public.excuses to authenticated;

-- -------------------------------------------------------------
-- Funciones
-- -------------------------------------------------------------
-- Fecha local (Sonora, sin horario de verano)
create or replace function private.local_date(ts timestamptz)
returns date language sql immutable set search_path = '' as $$
  select (ts at time zone 'America/Hermosillo')::date;
$$;

-- Código de 6 dígitos para una ranura de 30 s
create or replace function private.att_code(sec text, slot bigint)
returns text language sql immutable set search_path = '' as $$
  select lpad(((('x' || substr(encode(extensions.hmac(slot::text, sec, 'sha256'), 'hex'), 1, 7))::bit(28)::int) % 1000000)::text, 6, '0');
$$;

create or replace function private.haversine_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- Abrir pase de lista (cierra cualquier otro abierto del grupo)
create or replace function public.open_attendance(cid uuid, minutes int, topic text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.classes;
  sid uuid;
  prev uuid;
begin
  select * into c from public.classes where id = cid and owner_id = auth.uid();
  if not found then raise exception 'No tienes acceso a este grupo'; end if;
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

-- Código vigente para proyectar (solo el docente)
create or replace function public.attendance_code(sid uuid)
returns table (code text, slot_ends_at timestamptz, expires_at timestamptz, status text)
language plpgsql security definer set search_path = '' as $$
declare
  s public.attendance_sessions;
  sec text;
  slot bigint := floor(extract(epoch from now()) / 30);
begin
  select * into s from public.attendance_sessions where id = sid;
  if not found or not private.owns_class(s.class_id) then raise exception 'No tienes acceso'; end if;
  select a.secret into sec from public.attendance_secrets a where a.session_id = sid;
  return query select private.att_code(sec, slot), to_timestamp((slot + 1) * 30), s.expires_at, s.status;
end $$;

-- Extender / reabrir el QR
create or replace function public.extend_attendance(sid uuid, minutes int)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.attendance_sessions;
begin
  select * into s from public.attendance_sessions where id = sid;
  if not found or not private.owns_class(s.class_id) then raise exception 'No tienes acceso'; end if;
  if minutes not in (2, 5, 10, 15) then raise exception 'Duración no válida'; end if;
  update public.attendance_sessions set expires_at = now() + make_interval(mins => minutes), status = 'open', closed_at = null where id = sid;
end $$;

-- Cerrar: faltas a quien no registró y aplicar justificantes aprobados
create or replace function public.close_attendance(sid uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  s public.attendance_sessions;
  n integer;
  d date;
begin
  select * into s from public.attendance_sessions where id = sid;
  if not found or not private.owns_class(s.class_id) then raise exception 'No tienes acceso'; end if;
  d := private.local_date(s.starts_at);
  insert into public.attendance_records (session_id, class_id, student_id, status, method, note)
  select sid, s.class_id, cs.id,
         case when exists (select 1 from public.excuses e where e.student_id = cs.id and e.status = 'approved' and d between e.date_from and e.date_to)
              then 'excused' else 'absent' end,
         'auto', null
  from public.class_students cs
  where cs.class_id = s.class_id and cs.status = 'active'
    and not exists (select 1 from public.attendance_records r where r.session_id = sid and r.student_id = cs.id);
  get diagnostics n = row_count;
  update public.attendance_sessions set status = 'closed', closed_at = now(), expires_at = least(expires_at, now()) where id = sid;
  return n;
end $$;

-- Registro del estudiante (QR o código)
create or replace function public.check_in(
  code text,
  session uuid default null,
  lat double precision default null,
  lng double precision default null,
  accuracy double precision default null,
  location_error text default null
)
returns table (status text, class_name text, distance_m double precision, location_ok boolean, already boolean)
language plpgsql security definer set search_path = '' as $$
declare
  slot bigint := floor(extract(epoch from now()) / 30);
  s public.attendance_sessions;
  c public.classes;
  st public.class_students;
  sec text;
  found_session boolean := false;
  existing public.attendance_records;
  mins double precision;
  st_status text;
  dist double precision;
  loc_ok boolean;
  why text;
begin
  if auth.uid() is null or private.is_anonymous_user() then raise exception 'Inicia sesión para registrar tu asistencia'; end if;
  if (select count(*) from public.attendance_failed_attempts f where f.user_id = auth.uid() and f.at > now() - interval '10 minutes') >= 8 then
    raise exception 'Demasiados intentos. Espera unos minutos.';
  end if;
  code := regexp_replace(coalesce(code, ''), '\D', '', 'g');

  -- Buscar la sesión abierta (de mis grupos) cuyo código coincide
  for s in
    select x.* from public.attendance_sessions x
    join public.class_students y on y.class_id = x.class_id and y.user_id = auth.uid() and y.status = 'active'
    where x.status = 'open' and (session is null or x.id = session)
  loop
    select a.secret into sec from public.attendance_secrets a where a.session_id = s.id;
    if code in (private.att_code(sec, slot), private.att_code(sec, slot - 1), private.att_code(sec, slot - 2)) then
      found_session := true;
      exit;
    end if;
  end loop;

  if not found_session then
    insert into public.attendance_failed_attempts (user_id) values (auth.uid());
    if session is not null and exists (select 1 from public.attendance_sessions x where x.id = session and (x.status = 'closed' or x.expires_at < now())) then
      raise exception 'El pase de lista ya se cerró. Habla con tu docente.';
    end if;
    raise exception 'El código no es válido o ya caducó. Escanea el QR de nuevo.';
  end if;
  if s.expires_at < now() then raise exception 'El tiempo para registrarse terminó. Habla con tu docente.'; end if;

  select * into c from public.classes where id = s.class_id;
  select * into st from public.class_students where class_id = s.class_id and user_id = auth.uid();

  select * into existing from public.attendance_records r where r.session_id = s.id and r.student_id = st.id;
  if found then
    return query select existing.status, c.name, existing.distance_m, existing.location_ok, true;
    return;
  end if;

  mins := extract(epoch from (now() - s.starts_at)) / 60;
  st_status := case when mins <= s.late_after_min then 'present' else 'late' end;

  if lat is not null and lng is not null then
    if c.att_lat is not null and c.att_lng is not null then
      dist := private.haversine_m(lat, lng, c.att_lat, c.att_lng);
      -- Se toma en cuenta la precisión del GPS (máx. 150 m)
      loc_ok := dist - least(coalesce(accuracy, 0), 150) <= c.att_radius_m;
      if not loc_ok then why := format('Ubicación a %s m del aula', round(dist)); end if;
    end if;
  elsif c.att_require_location then
    loc_ok := false;
    why := coalesce('Sin ubicación: ' || nullif(left(location_error, 120), ''), 'Sin ubicación');
  end if;
  if loc_ok = false then st_status := 'review'; end if;

  insert into public.attendance_records (session_id, class_id, student_id, status, method, checked_at, lat, lng, accuracy_m, location_at,
                                         distance_m, location_ok, note)
  values (s.id, s.class_id, st.id, st_status, case when session is null then 'code' else 'qr' end, now(), lat, lng, accuracy,
          case when lat is not null then now() end, dist, loc_ok, why);
  return query select st_status, c.name, dist, loc_ok, false;
end $$;

-- Revisar justificante
create or replace function public.review_excuse(eid uuid, decision text, comment text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  e public.excuses;
  n integer := 0;
begin
  select * into e from public.excuses where id = eid;
  if not found or not private.owns_class(e.class_id) then raise exception 'No tienes acceso'; end if;
  if decision not in ('approved', 'rejected', 'needs_info') then raise exception 'Decisión no válida'; end if;
  if decision in ('rejected', 'needs_info') and coalesce(trim(comment), '') = '' then
    raise exception 'Escribe un comentario para el estudiante';
  end if;
  update public.excuses set status = decision, teacher_comment = nullif(left(trim(coalesce(comment, '')), 1000), ''),
         reviewed_at = now(), reviewed_by = auth.uid() where id = eid;
  if decision = 'approved' then
    update public.attendance_records r set status = 'excused', method = 'excuse', note = 'Justificante aprobado'
    from public.attendance_sessions s
    where r.session_id = s.id and r.student_id = e.student_id and r.status = 'absent'
      and private.local_date(s.starts_at) between e.date_from and e.date_to;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;

revoke execute on function public.open_attendance(uuid, int, text), public.attendance_code(uuid), public.extend_attendance(uuid, int),
  public.close_attendance(uuid), public.check_in(text, uuid, double precision, double precision, double precision, text),
  public.review_excuse(uuid, text, text) from public, anon;
grant execute on function public.open_attendance(uuid, int, text), public.attendance_code(uuid), public.extend_attendance(uuid, int),
  public.close_attendance(uuid), public.check_in(text, uuid, double precision, double precision, double precision, text),
  public.review_excuse(uuid, text, text) to authenticated;

-- private.try_uuid(text) ya existe (migraciones anteriores)

-- Archivos de justificantes (privados): {class_id}/{user_id}/archivo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('excuses', 'excuses', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "excuses files: ver" on storage.objects for select to authenticated
  using (bucket_id = 'excuses' and (
    (storage.foldername(objects.name))[2] = (select auth.uid())::text
    or private.owns_class(private.try_uuid((storage.foldername(objects.name))[1]))));
create policy "excuses files: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'excuses' and (storage.foldername(objects.name))[2] = (select auth.uid())::text
    and private.in_class(private.try_uuid((storage.foldername(objects.name))[1])));
create policy "excuses files: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'excuses' and (storage.foldername(objects.name))[2] = (select auth.uid())::text);
