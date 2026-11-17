-- Con Google, el nombre puede llegar como "name" en lugar de "full_name"
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.organizers (id, full_name, institution, email)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'name', ''),
      new.raw_user_meta_data ->> 'institution',
      lower(new.email)
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
