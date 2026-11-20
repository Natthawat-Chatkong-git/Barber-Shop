create or replace function public.create_appointment(
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_barber_id uuid default null,
  p_customer_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if p_service_ids is null
     or cardinality(p_service_ids) = 0
     or cardinality(p_service_ids) > 10
     or array_position(p_service_ids, null) is not null
     or (select count(distinct x) from unnest(p_service_ids) as x) <> cardinality(p_service_ids) then
    raise exception using errcode = '22023', message = 'Select between 1 and 10 unique valid services';
  end if;

  if p_customer_note is not null and length(p_customer_note) > 500 then
    raise exception using errcode = '22023', message = 'Customer note must be at most 500 characters';
  end if;

  if p_starts_at is null
     or p_starts_at <= now()
     or p_starts_at > now() + interval '60 days' then
    raise exception using errcode = '22023', message = 'Appointment must be within the next 60 days';
  end if;

  return private.create_appointment(p_service_ids, p_starts_at, p_barber_id, p_customer_note);
end;
$function$;

revoke all on function public.create_appointment(uuid[], timestamptz, uuid, text) from public, anon;
grant execute on function public.create_appointment(uuid[], timestamptz, uuid, text) to authenticated;

alter table public.appointments
  add constraint appointments_customer_note_length_check
    check (customer_note is null or length(customer_note) <= 500),
  add constraint appointments_cancellation_reason_length_check
    check (cancellation_reason is null or length(cancellation_reason) <= 500);

alter table public.reviews
  add constraint reviews_comment_length_check
    check (comment is null or length(comment) <= 1000);
