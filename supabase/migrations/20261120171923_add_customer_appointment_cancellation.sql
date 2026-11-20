create function private.cancel_appointment(p_appointment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_appointment_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  update public.appointments
  set status = 'cancelled'::public.appointment_status,
      cancellation_reason = 'Cancelled by customer'
  where id = p_appointment_id
    and customer_id = (select auth.uid())
    and status in ('pending'::public.appointment_status, 'confirmed'::public.appointment_status)
    and starts_at > now()
  returning id into v_appointment_id;

  if v_appointment_id is null then
    raise exception using errcode = '22023',
      message = 'Appointment cannot be cancelled; it may have started, changed status, or not belong to this account';
  end if;

  return v_appointment_id;
end;
$function$;

revoke all on function private.cancel_appointment(uuid) from public, anon;
grant execute on function private.cancel_appointment(uuid) to authenticated;

create function public.cancel_appointment(p_appointment_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.cancel_appointment(p_appointment_id);
$function$;

revoke all on function public.cancel_appointment(uuid) from public, anon;
grant execute on function public.cancel_appointment(uuid) to authenticated;
