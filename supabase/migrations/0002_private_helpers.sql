-- Mueve las funciones auxiliares a un esquema que la API no expone.
-- Las políticas RLS siguen apuntando a ellas (Postgres guarda la referencia por OID).
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_anonymous_user() set schema private;
alter function public.is_event_owner(uuid) set schema private;
alter function public.is_event_member(uuid) set schema private;
alter function public.can_edit_event(uuid) set schema private;
alter function public.is_event_evaluator(uuid) set schema private;
alter function public.owns_evaluator(uuid) set schema private;
alter function public.event_is_open(uuid) set schema private;
alter function public.form_event_id(uuid) set schema private;
alter function public.form_is_published(uuid) set schema private;
alter function public.shares_event_with(uuid) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.check_submission_consistency() set schema private;

-- add_collaborator llama a is_event_owner: actualizar referencia
create or replace function public.add_collaborator(eid uuid, collaborator_email text, collaborator_role text default 'editor')
returns text language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if not private.is_event_owner(eid) then
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
revoke execute on function public.add_collaborator(uuid, text, text) from public, anon;
grant execute on function public.add_collaborator(uuid, text, text) to authenticated;
