-- =============================================================
-- Plataforma de evaluación de proyectos finales — esquema base
-- =============================================================

create extension if not exists pgcrypto;

-- Código aleatorio legible (sin 0/O/1/I)
create or replace function public.random_code(len int default 6)
returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;

create type public.event_status as enum ('draft', 'open', 'closed', 'published');
create type public.score_method as enum ('average', 'sum', 'trimmed');

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -------------------------------------------------------------
-- Organizadores (perfil de auth.users que NO son anónimos)
-- -------------------------------------------------------------
create table public.organizers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  institution text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.organizers (id, full_name, institution, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      new.raw_user_meta_data ->> 'institution',
      lower(new.email)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- Eventos
-- -------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.organizers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  event_date date,
  venue text,
  logo_url text,
  cover_url text,
  primary_color text not null default '#6d28d9' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  status public.event_status not null default 'draft',
  short_code text not null unique default public.random_code(6),
  access_pin text,
  score_method public.score_method not null default 'average',
  podium_size int not null default 3 check (podium_size between 1 and 20),
  min_evaluations int not null default 3 check (min_evaluations >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_owner_idx on public.events (owner_id);
create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

create table public.event_collaborators (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.organizers (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_collaborators_user_idx on public.event_collaborators (user_id);

-- -------------------------------------------------------------
-- Categorías y proyectos
-- -------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index categories_event_idx on public.categories (event_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  members text[] not null default '{}',
  description text,
  image_url text,
  stand text,
  code text not null default public.random_code(5),
  manual_tiebreak int,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);
create index projects_event_idx on public.projects (event_id);
create index projects_category_idx on public.projects (category_id);

-- -------------------------------------------------------------
-- Formularios
-- -------------------------------------------------------------
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null default 'Formulario de evaluación',
  description text,
  is_published boolean not null default false,
  is_default boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forms_event_idx on public.forms (event_id);
create trigger forms_touch before update on public.forms
  for each row execute function public.touch_updated_at();

-- Qué categorías usan qué formulario (una categoría → un formulario)
create table public.form_categories (
  form_id uuid not null references public.forms (id) on delete cascade,
  category_id uuid not null unique references public.categories (id) on delete cascade,
  primary key (form_id, category_id)
);

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  position int not null default 0,
  type text not null check (type in (
    'short_text', 'long_text', 'number', 'single_choice', 'multiple_choice', 'dropdown',
    'likert', 'linear_scale', 'rating', 'matrix', 'yes_no', 'datetime', 'signature', 'file',
    'section_title', 'paragraph', 'image', 'divider', 'page_break'
  )),
  label text not null default '',
  help text,
  required boolean not null default false,
  scored boolean not null default false,
  weight numeric(6, 2) not null default 0 check (weight >= 0),
  config jsonb not null default '{}'::jsonb,
  logic jsonb,
  created_at timestamptz not null default now()
);
create index form_fields_form_idx on public.form_fields (form_id, position);

-- -------------------------------------------------------------
-- Evaluadores y evaluaciones
-- -------------------------------------------------------------
create table public.evaluators (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  email text,
  institution text,
  created_at timestamptz not null default now(),
  unique (event_id, auth_user_id)
);
create index evaluators_event_idx on public.evaluators (event_id);
create index evaluators_auth_idx on public.evaluators (auth_user_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  evaluator_id uuid not null references public.evaluators (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluator_id, project_id)
);
create index submissions_event_idx on public.submissions (event_id);
create index submissions_project_idx on public.submissions (project_id);
create index submissions_form_idx on public.submissions (form_id);
create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();

-- Coherencia: evaluador, proyecto y formulario deben pertenecer al mismo evento
create or replace function public.check_submission_consistency()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.evaluators where id = new.evaluator_id and event_id = new.event_id)
     or not exists (select 1 from public.projects where id = new.project_id and event_id = new.event_id)
     or not exists (select 1 from public.forms where id = new.form_id and event_id = new.event_id) then
    raise exception 'La evaluación no corresponde a este evento';
  end if;
  if tg_op = 'UPDATE' and (new.evaluator_id <> old.evaluator_id or new.project_id <> old.project_id
                           or new.event_id <> old.event_id) then
    raise exception 'No se puede cambiar el evaluador, proyecto o evento de una evaluación';
  end if;
  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end $$;
create trigger submissions_consistency before insert or update on public.submissions
  for each row execute function public.check_submission_consistency();

-- =============================================================
-- Funciones auxiliares para RLS (security definer, evitan recursión)
-- =============================================================
create or replace function public.is_anonymous_user()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create or replace function public.is_event_owner(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = eid and e.owner_id = auth.uid());
$$;

create or replace function public.is_event_member(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = eid and e.owner_id = auth.uid())
      or exists (select 1 from public.event_collaborators c where c.event_id = eid and c.user_id = auth.uid());
$$;

create or replace function public.can_edit_event(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = eid and e.owner_id = auth.uid())
      or exists (select 1 from public.event_collaborators c
                 where c.event_id = eid and c.user_id = auth.uid() and c.role = 'editor');
$$;

create or replace function public.is_event_evaluator(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.evaluators v where v.event_id = eid and v.auth_user_id = auth.uid());
$$;

create or replace function public.owns_evaluator(evid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.evaluators v where v.id = evid and v.auth_user_id = auth.uid());
$$;

create or replace function public.event_is_open(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = eid and e.status = 'open');
$$;

create or replace function public.form_event_id(fid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select event_id from public.forms where id = fid;
$$;

create or replace function public.form_is_published(fid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_published from public.forms where id = fid), false);
$$;

create or replace function public.shares_event_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    left join public.event_collaborators c on c.event_id = e.id
    where (e.owner_id = auth.uid() or c.user_id = auth.uid())
      and (e.owner_id = other or c.user_id = other
           or exists (select 1 from public.event_collaborators c2 where c2.event_id = e.id and c2.user_id = other))
  );
$$;

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.organizers enable row level security;
alter table public.events enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.forms enable row level security;
alter table public.form_categories enable row level security;
alter table public.form_fields enable row level security;
alter table public.evaluators enable row level security;
alter table public.submissions enable row level security;

-- organizers
create policy "organizers: ver propio o compañeros" on public.organizers for select to authenticated
  using (id = (select auth.uid()) or public.shares_event_with(id));
create policy "organizers: editar propio" on public.organizers for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- events
create policy "events: miembros ven" on public.events for select to authenticated
  using (public.is_event_member(id));
create policy "events: organizador crea" on public.events for insert to authenticated
  with check (owner_id = (select auth.uid()) and not public.is_anonymous_user());
create policy "events: editores modifican" on public.events for update to authenticated
  using (public.can_edit_event(id)) with check (public.can_edit_event(id));
create policy "events: dueño elimina" on public.events for delete to authenticated
  using (owner_id = (select auth.uid()));

-- event_collaborators
create policy "collab: miembros ven" on public.event_collaborators for select to authenticated
  using (public.is_event_member(event_id));
create policy "collab: dueño agrega" on public.event_collaborators for insert to authenticated
  with check (public.is_event_owner(event_id));
create policy "collab: dueño cambia" on public.event_collaborators for update to authenticated
  using (public.is_event_owner(event_id)) with check (public.is_event_owner(event_id));
create policy "collab: dueño o uno mismo elimina" on public.event_collaborators for delete to authenticated
  using (public.is_event_owner(event_id) or user_id = (select auth.uid()));

-- categories
create policy "categories: ver" on public.categories for select to authenticated
  using (public.is_event_member(event_id) or public.is_event_evaluator(event_id));
create policy "categories: crear" on public.categories for insert to authenticated
  with check (public.can_edit_event(event_id));
create policy "categories: editar" on public.categories for update to authenticated
  using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));
create policy "categories: eliminar" on public.categories for delete to authenticated
  using (public.can_edit_event(event_id));

-- projects
create policy "projects: ver" on public.projects for select to authenticated
  using (public.is_event_member(event_id) or public.is_event_evaluator(event_id));
create policy "projects: crear" on public.projects for insert to authenticated
  with check (public.can_edit_event(event_id));
create policy "projects: editar" on public.projects for update to authenticated
  using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));
create policy "projects: eliminar" on public.projects for delete to authenticated
  using (public.can_edit_event(event_id));

-- forms
create policy "forms: ver" on public.forms for select to authenticated
  using (public.is_event_member(event_id) or (is_published and public.is_event_evaluator(event_id)));
create policy "forms: crear" on public.forms for insert to authenticated
  with check (public.can_edit_event(event_id));
create policy "forms: editar" on public.forms for update to authenticated
  using (public.can_edit_event(event_id)) with check (public.can_edit_event(event_id));
create policy "forms: eliminar" on public.forms for delete to authenticated
  using (public.can_edit_event(event_id));

-- form_categories
create policy "form_categories: ver" on public.form_categories for select to authenticated
  using (public.is_event_member(public.form_event_id(form_id))
         or public.is_event_evaluator(public.form_event_id(form_id)));
create policy "form_categories: crear" on public.form_categories for insert to authenticated
  with check (public.can_edit_event(public.form_event_id(form_id)));
create policy "form_categories: eliminar" on public.form_categories for delete to authenticated
  using (public.can_edit_event(public.form_event_id(form_id)));

-- form_fields
create policy "form_fields: ver" on public.form_fields for select to authenticated
  using (public.is_event_member(public.form_event_id(form_id))
         or (public.form_is_published(form_id) and public.is_event_evaluator(public.form_event_id(form_id))));
create policy "form_fields: crear" on public.form_fields for insert to authenticated
  with check (public.can_edit_event(public.form_event_id(form_id)));
create policy "form_fields: editar" on public.form_fields for update to authenticated
  using (public.can_edit_event(public.form_event_id(form_id)))
  with check (public.can_edit_event(public.form_event_id(form_id)));
create policy "form_fields: eliminar" on public.form_fields for delete to authenticated
  using (public.can_edit_event(public.form_event_id(form_id)));

-- evaluators (el alta se hace con la función join_event)
create policy "evaluators: ver propio o miembros" on public.evaluators for select to authenticated
  using (auth_user_id = (select auth.uid()) or public.is_event_member(event_id));
create policy "evaluators: editar propio" on public.evaluators for update to authenticated
  using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
create policy "evaluators: editores eliminan" on public.evaluators for delete to authenticated
  using (public.can_edit_event(event_id));

-- submissions
create policy "submissions: ver propias o miembros" on public.submissions for select to authenticated
  using (public.owns_evaluator(evaluator_id) or public.is_event_member(event_id));
create policy "submissions: evaluador crea si abierto" on public.submissions for insert to authenticated
  with check (public.owns_evaluator(evaluator_id) and public.event_is_open(event_id));
create policy "submissions: evaluador edita si abierto" on public.submissions for update to authenticated
  using (public.owns_evaluator(evaluator_id) and public.event_is_open(event_id))
  with check (public.owns_evaluator(evaluator_id) and public.event_is_open(event_id));
create policy "submissions: editores eliminan" on public.submissions for delete to authenticated
  using (public.can_edit_event(event_id));

-- =============================================================
-- Funciones públicas (RPC)
-- =============================================================

-- Información pública mínima de un evento (para la portada del evaluador)
create or replace function public.get_public_event(code text)
returns table (
  id uuid, name text, description text, event_date date, venue text,
  logo_url text, cover_url text, primary_color text, status public.event_status,
  short_code text, requires_pin boolean
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.name, e.description, e.event_date, e.venue, e.logo_url, e.cover_url,
         e.primary_color, e.status, e.short_code,
         (e.access_pin is not null and e.access_pin <> '')
  from public.events e
  where e.short_code = upper(trim(code));
$$;

-- Registrar (o actualizar) al evaluador anónimo en un evento, validando el PIN
create or replace function public.join_event(
  code text, pin text default null, evaluator_name text default null,
  evaluator_email text default null, evaluator_institution text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ev public.events;
  result uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;
  select * into ev from public.events where short_code = upper(trim(code));
  if not found then
    raise exception 'Evento no encontrado';
  end if;
  if ev.status <> 'open' then
    raise exception 'El evento no está recibiendo evaluaciones';
  end if;
  if ev.access_pin is not null and ev.access_pin <> ''
     and upper(trim(coalesce(pin, ''))) <> upper(trim(ev.access_pin)) then
    raise exception 'PIN incorrecto';
  end if;
  if coalesce(trim(evaluator_name), '') = '' then
    raise exception 'Escribe tu nombre';
  end if;

  insert into public.evaluators (event_id, auth_user_id, name, email, institution)
  values (ev.id, auth.uid(), trim(evaluator_name), nullif(trim(evaluator_email), ''),
          nullif(trim(evaluator_institution), ''))
  on conflict (event_id, auth_user_id) do update
    set name = excluded.name, email = excluded.email, institution = excluded.institution
  returning id into result;
  return result;
end $$;

-- Agregar co-organizador por correo (solo el dueño)
create or replace function public.add_collaborator(eid uuid, collaborator_email text, collaborator_role text default 'editor')
returns text language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if not public.is_event_owner(eid) then
    raise exception 'Solo el dueño del evento puede agregar co-organizadores';
  end if;
  select id into target from public.organizers where email = lower(trim(collaborator_email));
  if target is null then
    return 'not_found';
  end if;
  if target = auth.uid() then
    return 'self';
  end if;
  insert into public.event_collaborators (event_id, user_id, role)
  values (eid, target, coalesce(collaborator_role, 'editor'))
  on conflict (event_id, user_id) do update set role = excluded.role;
  return 'ok';
end $$;

-- Permisos de ejecución
revoke execute on function public.add_collaborator(uuid, text, text) from public, anon;
grant execute on function public.add_collaborator(uuid, text, text) to authenticated;
revoke execute on function public.join_event(text, text, text, text, text) from public, anon;
grant execute on function public.join_event(text, text, text, text, text) to authenticated;
grant execute on function public.get_public_event(text) to anon, authenticated;

-- =============================================================
-- Tiempo real (para el ranking en vivo)
-- =============================================================
alter publication supabase_realtime add table public.submissions;

-- =============================================================
-- Almacenamiento de imágenes del evento (logos, portadas, fotos)
-- Ruta: {auth.uid()}/archivo.ext  — lectura pública
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-assets', 'event-assets', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "event-assets: organizador sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-assets' and not public.is_anonymous_user()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event-assets: organizador actualiza" on storage.objects for update to authenticated
  using (bucket_id = 'event-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "event-assets: organizador elimina" on storage.objects for delete to authenticated
  using (bucket_id = 'event-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
