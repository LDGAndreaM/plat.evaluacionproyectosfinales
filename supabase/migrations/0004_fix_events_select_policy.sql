-- La política de lectura debe reconocer al dueño por columna, para que
-- "insert ... returning" funcione (la función auxiliar no ve la fila nueva).
drop policy "events: miembros ven" on public.events;
create policy "events: miembros ven" on public.events for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_event_member(id));
