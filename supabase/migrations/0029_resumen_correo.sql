-- Resumen diario por correo (opcional) y consulta ligera para mantener activo el proyecto.

alter table public.organizers
  add column if not exists email_digest boolean not null default true,
  add column if not exists last_digest_at timestamptz;

-- Lo llama el cron diario con la llave de servicio. Devuelve, por usuario, sus notificaciones
-- sin leer desde el último resumen y las actividades que vencen en las próximas 30 h sin entregar.
create or replace function public.email_digest_batch(max_users int default 300)
returns table (user_id uuid, email text, full_name text, notices jsonb, due jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with u as (
    select o.id, o.email, o.full_name, coalesce(o.last_digest_at, now() - interval '1 day') as since
    from public.organizers o
    where o.email_digest and o.email is not null
      and (o.last_digest_at is null or o.last_digest_at < now() - interval '20 hours')
    order by o.last_digest_at nulls first
    limit max_users
  ),
  n as (
    select u.id,
           jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'body', x.body, 'link', x.link) order by x.visible_at desc) as items
    from u
    join public.notifications x on x.user_id = u.id and x.read_at is null and x.visible_at > u.since and x.visible_at <= now()
    group by u.id
  ),
  d as (
    select cs.user_id as id,
           jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'class', c.name, 'due_at', a.due_at) order by a.due_at) as items
    from u
    join public.class_students cs on cs.user_id = u.id and cs.status = 'active'
    join public.classes c on c.id = cs.class_id and c.archived_at is null
    join public.activities a on a.class_id = cs.class_id and a.status = 'published'
      and (a.publish_at is null or a.publish_at <= now())
      and a.due_at between now() and now() + interval '30 hours'
    where not exists (
      select 1 from public.activity_submissions s
      where s.activity_id = a.id
        and (s.student_id = cs.id
             or s.team_id in (select m.team_id from public.activity_team_members m where m.activity_id = a.id and m.student_id = cs.id))
    )
    group by cs.user_id
  ),
  upd as (
    update public.organizers o set last_digest_at = now() from u where o.id = u.id returning o.id
  )
  select u.id, u.email, u.full_name, n.items, d.items
  from u
  left join n on n.id = u.id
  left join d on d.id = u.id
  where (n.items is not null or d.items is not null)
    and (select count(*) from upd) >= 0;
end $$;

revoke all on function public.email_digest_batch(int) from public, anon, authenticated;
grant execute on function public.email_digest_batch(int) to service_role;

-- Consulta mínima para el cron (evita que el plan gratuito pause el proyecto por inactividad).
create or replace function public.ping()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now() $$;

grant execute on function public.ping() to anon, authenticated;

-- Cada quien puede activar o desactivar su resumen.
grant update (email_digest) on public.organizers to authenticated;
