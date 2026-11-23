-- =============================================================
-- EvaluaQR Aula · Etapa 4: calificaciones con ponderaciones
-- =============================================================
alter table public.classes
  add column grade_settings jsonb not null default '{
    "scale": 10,
    "passing": 6,
    "visible_to_students": true,
    "missing_counts_zero": true,
    "categories": [
      {"id": "act", "name": "Actividades", "weight": 70, "type": "activities"},
      {"id": "asis", "name": "Asistencia", "weight": 10, "type": "attendance"},
      {"id": "exa", "name": "Examen", "weight": 20, "type": "manual"}
    ]
  }'::jsonb check (jsonb_typeof(grade_settings) = 'object' and octet_length(grade_settings::text) < 20000);

alter table public.activities add column grade_category text check (char_length(grade_category) <= 40);

-- Calificaciones capturadas a mano (examen, participación…), en la escala del grupo
create table public.class_manual_grades (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.class_students (id) on delete cascade,
  category_id text not null check (char_length(category_id) <= 40),
  score numeric(6, 2) check (score >= 0 and score <= 100),
  updated_at timestamptz not null default now(),
  primary key (student_id, category_id)
);
create index class_manual_grades_class_idx on public.class_manual_grades (class_id);
create trigger class_manual_grades_touch before update on public.class_manual_grades
  for each row execute function public.touch_updated_at();

create or replace function private.grades_visible(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (c.grade_settings ->> 'visible_to_students')::boolean from public.classes c where c.id = cid), true);
$$;

alter table public.class_manual_grades enable row level security;
create policy "manual_grades: ver" on public.class_manual_grades for select to authenticated
  using (private.owns_class(class_id) or (private.is_my_student_row(student_id) and private.grades_visible(class_id)));
create policy "manual_grades: docente crea" on public.class_manual_grades for insert to authenticated
  with check (private.owns_class(class_id)
    and exists (select 1 from public.class_students s where s.id = student_id and s.class_id = class_manual_grades.class_id));
create policy "manual_grades: docente edita" on public.class_manual_grades for update to authenticated
  using (private.owns_class(class_id)) with check (private.owns_class(class_id));
create policy "manual_grades: docente elimina" on public.class_manual_grades for delete to authenticated
  using (private.owns_class(class_id));
