-- Keep the privileged booking implementation outside exposed API schemas.
-- The public RPC is a SECURITY INVOKER wrapper and is the only Data API entry point.
alter function public.create_appointment(uuid[], timestamptz, uuid, text) set schema private;

revoke all on function private.create_appointment(uuid[], timestamptz, uuid, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_appointment(uuid[], timestamptz, uuid, text) to authenticated;

create function public.create_appointment(
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_barber_id uuid default null,
  p_customer_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.create_appointment(
    p_service_ids,
    p_starts_at,
    p_barber_id,
    p_customer_note
  );
$function$;

revoke all on function public.create_appointment(uuid[], timestamptz, uuid, text) from public, anon;
grant execute on function public.create_appointment(uuid[], timestamptz, uuid, text) to authenticated;
