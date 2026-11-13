-- Datos para la pantalla pública de premiación (solo con resultados publicados).
-- No incluye nombres de evaluadores, comentarios, firmas ni archivos.
create or replace function public.get_published_results(code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  ev public.events;
  hidden text[] := array['short_text', 'long_text', 'signature', 'file', 'datetime',
                         'section_title', 'paragraph', 'image', 'divider', 'page_break'];
begin
  select * into ev from public.events where short_code = upper(trim(code));
  if not found or ev.status <> 'published' then
    return null;
  end if;
  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', ev.id, 'name', ev.name, 'logo_url', ev.logo_url, 'cover_url', ev.cover_url,
      'primary_color', ev.primary_color, 'score_method', ev.score_method, 'podium_size', ev.podium_size,
      'event_date', ev.event_date, 'venue', ev.venue, 'short_code', ev.short_code, 'status', ev.status),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'position', c.position) order by c.position)
      from public.categories c where c.event_id = ev.id), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'stand', p.stand, 'category_id', p.category_id, 'members', p.members,
        'image_url', p.image_url, 'manual_tiebreak', p.manual_tiebreak))
      from public.projects p where p.event_id = ev.id), '[]'::jsonb),
    'fields', coalesce((
      select jsonb_agg((to_jsonb(f) - 'help') order by f.position)
      from public.form_fields f join public.forms fo on fo.id = f.form_id
      where fo.event_id = ev.id and f.type <> all (hidden)), '[]'::jsonb),
    'submissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'project_id', s.project_id, 'form_id', s.form_id,
        'evaluator_id', md5(s.evaluator_id::text),
        'answers', (
          select coalesce(jsonb_object_agg(a.key, a.value), '{}'::jsonb)
          from jsonb_each(s.answers) a
          where exists (select 1 from public.form_fields f
                        where f.form_id = s.form_id and f.id::text = a.key and f.type <> all (hidden)))))
      from public.submissions s where s.event_id = ev.id and s.status = 'submitted'), '[]'::jsonb)
  );
end $$;

grant execute on function public.get_published_results(text) to anon, authenticated;
