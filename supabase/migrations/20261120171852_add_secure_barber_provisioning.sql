create function private.create_barber(
  p_profile_id uuid,
  p_display_name text,
  p_bio text,
  p_experience_years integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_barber_id uuid;
  v_role public.user_role;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_profile_id is null
     or p_display_name is null
     or length(btrim(p_display_name)) = 0
     or length(p_display_name) > 100
     or (p_bio is not null and length(p_bio) > 1000)
     or p_experience_years is null
     or p_experience_years < 0
     or p_experience_years > 80 then
    raise exception using errcode = '22023', message = 'Invalid barber profile details';
  end if;

  select role into v_role
  from public.profiles
  where id = p_profile_id
  for update;

  if not found or v_role = 'admin'::public.user_role then
    raise exception using errcode = '22023', message = 'Select a valid non-admin profile';
  end if;

  update public.profiles
  set role = 'barber'::public.user_role
  where id = p_profile_id;

  insert into public.barbers(profile_id, display_name, bio, experience_years, is_active)
  values (p_profile_id, btrim(p_display_name), nullif(btrim(p_bio), ''), p_experience_years, true)
  returning id into v_barber_id;

  return v_barber_id;
end;
$function$;

revoke all on function private.create_barber(uuid, text, text, integer) from public, anon;
grant execute on function private.create_barber(uuid, text, text, integer) to authenticated;

create function public.create_barber(
  p_profile_id uuid,
  p_display_name text,
  p_bio text,
  p_experience_years integer
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.create_barber(p_profile_id, p_display_name, p_bio, p_experience_years);
$function$;

revoke all on function public.create_barber(uuid, text, text, integer) from public, anon;
grant execute on function public.create_barber(uuid, text, text, integer) to authenticated;
