-- El rol solo cambia mediante set_my_role / join_class / claim_invitations
revoke update on public.organizers from authenticated, anon;
grant update (full_name, institution) on public.organizers to authenticated;
