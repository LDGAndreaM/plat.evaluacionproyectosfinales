-- Color de marca EvalúaQR como color predeterminado de los eventos
alter table public.events alter column primary_color set default '#6a11cb';

create or replace function public.create_demo_event()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ev uuid;
begin
  ev := private.create_demo_event_base();
  update public.projects
     set semester = case when stand in ('A1', 'A2', 'A3', 'A4') then '7°' else '8°' end
   where event_id = ev;
  update public.events set primary_color = '#6a11cb' where id = ev;
  return ev;
end $$;
revoke execute on function public.create_demo_event() from public, anon;
grant execute on function public.create_demo_event() to authenticated;
