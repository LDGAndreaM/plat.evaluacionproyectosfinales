-- Corrige: al crear un grupo, el titular debe poder ver la fila recién insertada (insert ... returning).
-- private.owns_class() consulta la tabla y no ve la fila nueva; se agrega la comparación directa de owner_id.
drop policy if exists "classes: docente ve" on public.classes;
create policy "classes: docente ve" on public.classes for select to authenticated
  using (owner_id = (select auth.uid()) or private.owns_class(id) or private.in_class(id));
