-- Semestre de cada proyecto (se evalúan varios semestres a la vez)
alter table public.projects add column if not exists semester text check (char_length(semester) <= 40);

-- El evento de demostración ahora incluye semestres
alter function public.create_demo_event() rename to create_demo_event_base;
alter function public.create_demo_event_base() set schema private;
revoke execute on function private.create_demo_event_base() from public, anon;

create or replace function public.create_demo_event()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ev uuid;
begin
  ev := private.create_demo_event_base();
  update public.projects
     set semester = case when stand in ('A1', 'A2', 'A3', 'A4') then '7°' else '8°' end
   where event_id = ev;
  return ev;
end $$;
revoke execute on function public.create_demo_event() from public, anon;
grant execute on function public.create_demo_event() to authenticated;
