-- my_classes devuelve también el id del docente (para mostrar su foto y contacto)
drop function if exists public.my_classes();
create function public.my_classes()
returns table (id uuid, name text, subject text, period text, grade text, description text, schedule jsonb, color text,
               teacher_id uuid, teacher text, teacher_email text, archived boolean, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.subject, c.period, c.grade, c.description, c.schedule, c.color, c.owner_id, o.full_name, o.email,
         c.archived_at is not null, s.joined_at
  from public.class_students s
  join public.classes c on c.id = s.class_id
  join public.organizers o on o.id = c.owner_id
  where s.user_id = auth.uid() and s.status = 'active'
  order by c.archived_at nulls first, c.name;
$$;
revoke execute on function public.my_classes() from public, anon;
grant execute on function public.my_classes() to authenticated;
