-- =============================================================
-- Evento de demostración: "Expodiseño AD2026"
-- 3 categorías, 8 proyectos, rúbrica de 5 criterios, 3 evaluadores
-- ficticios y 24 evaluaciones enviadas. Lo crea el organizador
-- que llama a la función (botón "Crear evento de demostración").
-- =============================================================
create or replace function public.create_demo_event()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  ev uuid;
  cat_branding uuid;
  cat_editorial uuid;
  cat_multimedia uuid;
  frm uuid;
  crit uuid[] := '{}';
  comments_field uuid;
  fid uuid;
  proj uuid[] := '{}';
  evals uuid[] := '{}';
  pid uuid;
  likert jsonb := jsonb_build_object('options', jsonb_build_array(
    jsonb_build_object('id', 'o1', 'label', 'Deficiente', 'points', 1),
    jsonb_build_object('id', 'o2', 'label', 'Regular', 'points', 2),
    jsonb_build_object('id', 'o3', 'label', 'Bueno', 'points', 3),
    jsonb_build_object('id', 'o4', 'label', 'Muy bueno', 'points', 4),
    jsonb_build_object('id', 'o5', 'label', 'Excelente', 'points', 5)
  ));
  crit_names text[] := array['Creatividad', 'Concepto', 'Ejecución técnica', 'Presentación', 'Viabilidad'];
  crit_help text[] := array[
    'Originalidad de la propuesta y soluciones visuales poco convencionales.',
    'Claridad de la idea rectora y coherencia con el problema planteado.',
    'Calidad de acabados, dominio de herramientas y cuidado en los detalles.',
    'Claridad y seguridad del equipo al exponer; calidad del montaje del stand.',
    'Posibilidad real de implementarse con el público o cliente objetivo.'
  ];
  crit_weights numeric[] := array[25, 20, 25, 15, 15];
  p_names text[] := array[
    'Raíces del Mar — identidad para cooperativa pesquera',
    'Café Bacochibampo',
    'Revista Marea Alta',
    'Cuentos del Desierto Sonorense',
    'Guaymas en 360°',
    'Señalética Museo Regional',
    'Fanzine Voces Yaquis',
    'App Ruta Verde Guaymas'
  ];
  p_members text[] := array[
    'Ana Sofía Valenzuela|Diego Ruiz|Mariana Félix',
    'Luis Fernando Gil|Camila Moreno',
    'Valeria Ochoa|Jorge Armenta|Paola Leyva',
    'Fernanda Robles|Iván Castro',
    'Regina Encinas|Emilio Duarte|Sara Quiroz',
    'Andrés Montaño|Daniela Soto',
    'Ximena Bórquez|Kevin Cota|Alondra Ríos',
    'Héctor Ibarra|Natalia Corral'
  ];
  p_desc text[] := array[
    'Sistema de identidad visual y empaque para una cooperativa de pescadores de Guaymas.',
    'Branding y punto de venta para una cafetería de especialidad frente al mar.',
    'Revista independiente de cultura y medio ambiente del Golfo de California.',
    'Libro ilustrado de leyendas de la región para lectores infantiles.',
    'Recorrido virtual interactivo por los sitios históricos del puerto.',
    'Sistema de señalización e infografías para el museo regional.',
    'Publicación autogestiva que documenta testimonios de la comunidad yaqui.',
    'Prototipo de app para promover rutas de reciclaje en la ciudad.'
  ];
  p_cat int[] := array[1, 1, 2, 2, 3, 1, 2, 3];
  p_base int[] := array[5, 4, 4, 3, 5, 3, 2, 4];
  ev_names text[] := array['Mtra. Laura Gómez Ayala', 'Arq. Roberto Salinas', 'Lic. Sofía Ramírez Paredes'];
  ev_inst text[] := array['ITSON Guaymas', 'Colegio de Arquitectos de Sonora', 'Agencia Brava Estudio'];
  comments text[] := array[
    'Excelente trabajo de investigación; el sistema visual es muy consistente.',
    'Buena propuesta. Cuidar la legibilidad en tamaños pequeños.',
    'Me gustó mucho el concepto; la presentación oral puede ser más clara.',
    'Propuesta sólida y viable. Recomiendo pruebas con usuarios reales.',
    'Los acabados se ven muy profesionales. ¡Felicidades al equipo!',
    'El concepto es interesante pero falta desarrollar más aplicaciones.'
  ];
  answers jsonb;
  pts int;
  i int;
  e int;
  c int;
  cat_ids uuid[];
begin
  if me is null or private.is_anonymous_user() then
    raise exception 'Inicia sesión como organizador';
  end if;

  insert into public.events (owner_id, name, description, event_date, venue, primary_color, status,
                             score_method, podium_size, min_evaluations)
  values (me, 'Expodiseño AD2026 (demostración)',
          'Exposición de proyectos finales de la Licenciatura en Diseño Gráfico. Evento de prueba con datos ficticios.',
          date '2026-12-04', 'ITSON Unidad Guaymas — Explanada principal', '#7c3aed', 'open',
          'average', 3, 3)
  returning id into ev;

  insert into public.categories (event_id, name, position) values (ev, 'Branding', 0) returning id into cat_branding;
  insert into public.categories (event_id, name, position) values (ev, 'Editorial', 1) returning id into cat_editorial;
  insert into public.categories (event_id, name, position) values (ev, 'Multimedia', 2) returning id into cat_multimedia;
  cat_ids := array[cat_branding, cat_editorial, cat_multimedia];

  insert into public.forms (event_id, title, description, is_published, is_default)
  values (ev, 'Rúbrica de proyecto final',
          'Evalúa cada criterio observando el stand y la exposición del equipo.', true, true)
  returning id into frm;

  insert into public.form_fields (form_id, position, type, label, help)
  values (frm, 0, 'section_title', 'Criterios de evaluación', 'Selecciona el nivel que mejor describe el proyecto.');

  for c in 1..5 loop
    insert into public.form_fields (form_id, position, type, label, help, required, scored, weight, config)
    values (frm, c, 'likert', crit_names[c], crit_help[c], true, true, crit_weights[c], likert)
    returning id into fid;
    crit := crit || fid;
  end loop;

  insert into public.form_fields (form_id, position, type, label, help, config)
  values (frm, 6, 'long_text', 'Comentarios para el equipo', 'Opcional. El equipo podrá recibir esta retroalimentación.',
          jsonb_build_object('placeholder', 'Fortalezas y áreas de mejora…'))
  returning id into comments_field;

  for i in 1..8 loop
    insert into public.projects (event_id, category_id, name, members, description, stand)
    values (ev, cat_ids[p_cat[i]], p_names[i],
            string_to_array(p_members[i], '|'),
            p_desc[i], 'A' || i)
    returning id into pid;
    proj := proj || pid;
  end loop;

  for e in 1..3 loop
    insert into public.evaluators (event_id, auth_user_id, name, institution)
    values (ev, null, ev_names[e], ev_inst[e])
    returning id into fid;
    evals := evals || fid;
  end loop;

  for i in 1..8 loop
    for e in 1..3 loop
      answers := '{}'::jsonb;
      for c in 1..5 loop
        pts := greatest(1, least(5, p_base[i] + ((i * 7 + e * 3 + c * 5) % 3) - 1));
        answers := answers || jsonb_build_object(crit[c]::text, 'o' || pts);
      end loop;
      answers := answers || jsonb_build_object(comments_field::text, comments[1 + ((i + e) % 6)]);
      insert into public.submissions (event_id, evaluator_id, project_id, form_id, answers, status, submitted_at)
      values (ev, evals[e], proj[i], frm, answers, 'submitted', now() - make_interval(mins => (90 - i * 10 - e * 3)));
    end loop;
  end loop;

  return ev;
end $$;

revoke execute on function public.create_demo_event() from public, anon;
grant execute on function public.create_demo_event() to authenticated;
