-- Las funciones de Aula requieren sesión (quitar el permiso público heredado)
revoke execute on function public.set_my_role(text), public.claim_invitations(), public.join_class(text), public.my_classes() from public, anon;
grant execute on function public.set_my_role(text), public.claim_invitations(), public.join_class(text), public.my_classes() to authenticated;
