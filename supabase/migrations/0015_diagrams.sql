-- Nuevas herramientas: mapa conceptual y diagrama de flujo
alter table public.teacher_tools drop constraint if exists teacher_tools_kind_check;
alter table public.teacher_tools add constraint teacher_tools_kind_check
  check (kind in ('wheel', 'wordsearch', 'crossword', 'worksheet', 'trivia', 'conceptmap', 'flowchart'));
