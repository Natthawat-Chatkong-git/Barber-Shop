alter table public.appointments
  alter column customer_id drop not null,
  add column customer_name text,
  add column customer_phone text,
  add column source text not null default 'online',
  add constraint appointments_source_check check (source in ('online', 'walk_in')),
  add constraint appointments_customer_source_check check (
    (source = 'online' and customer_id is not null)
    or
    (source = 'walk_in' and customer_id is null and customer_name is not null and length(btrim(customer_name)) > 0)
  ),
  add constraint appointments_customer_name_length_check check (customer_name is null or length(customer_name) <= 100),
  add constraint appointments_customer_phone_length_check check (customer_phone is null or length(customer_phone) <= 20);

create function private.create_walk_in_appointment(
  p_customer_name text, p_customer_phone text, p_service_ids uuid[], p_starts_at timestamptz,
  p_barber_id uuid default null, p_customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_barber_id uuid;
  v_candidate_id uuid;
  v_appointment_id uuid;
  v_service_count integer;
  v_duration integer;
  v_ends_at timestamptz;
  v_local_start timestamp without time zone;
  v_local_end timestamp without time zone;
  v_business_hours public.business_hours%rowtype;
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;
  if p_customer_name is null or length(btrim(p_customer_name)) = 0 or length(p_customer_name) > 100 then
    raise exception using errcode = '22023', message = 'Customer name is required and must be at most 100 characters';
  end if;
  if p_customer_phone is not null and (length(p_customer_phone) > 20 or p_customer_phone !~ '^[0-9+() -]{7,20}$') then
    raise exception using errcode = '22023', message = 'Invalid customer phone number';
  end if;
  if p_customer_note is not null and length(p_customer_note) > 500 then
    raise exception using errcode = '22023', message = 'Customer note must be at most 500 characters';
  end if;
  if p_starts_at is null or p_starts_at <= now() or p_starts_at > now() + interval '60 days' then
    raise exception using errcode = '22023', message = 'Appointment must be within the next 60 days';
  end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 or cardinality(p_service_ids) > 10
     or array_position(p_service_ids, null) is not null
     or (select count(distinct x) from unnest(p_service_ids) as x) <> cardinality(p_service_ids) then
    raise exception using errcode = '22023', message = 'Select between 1 and 10 unique valid services';
  end if;

  select count(*), coalesce(sum(s.duration_minutes), 0)::integer
  into v_service_count, v_duration
  from public.services s where s.id = any(p_service_ids) and s.is_active = true;
  if v_service_count <> cardinality(p_service_ids) then
    raise exception using errcode = '22023', message = 'One or more selected services are unavailable';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_local_start := p_starts_at at time zone 'Asia/Bangkok';
  v_local_end := v_ends_at at time zone 'Asia/Bangkok';
  if v_local_start::date <> v_local_end::date then
    raise exception using errcode = '22023', message = 'Appointment must finish on the same local business day';
  end if;

  select * into v_business_hours from public.business_hours
  where weekday = extract(dow from v_local_start)::smallint;
  if not found or v_business_hours.is_closed
     or v_local_start::time < v_business_hours.opens_at
     or v_local_end::time > v_business_hours.closes_at then
    raise exception using errcode = '22023', message = 'Appointment is outside business opening hours';
  end if;

  if p_barber_id is not null then
    select b.id into v_barber_id from public.barbers b
    where b.id = p_barber_id and b.is_active = true for update;
    if v_barber_id is null then
      raise exception using errcode = '22023', message = 'Selected barber is unavailable';
    end if;
    if exists (
      select 1 from public.appointments a where a.barber_id = v_barber_id
        and a.status in ('pending'::public.appointment_status, 'confirmed'::public.appointment_status, 'in_progress'::public.appointment_status)
        and a.starts_at < v_ends_at and a.ends_at > p_starts_at
    ) then
      raise exception using errcode = '23P01', message = 'Selected barber is already booked for this time';
    end if;
  else
    for v_candidate_id in
      select b.id from public.barbers b where b.is_active = true order by b.id for update of b skip locked
    loop
      if not exists (
        select 1 from public.appointments a where a.barber_id = v_candidate_id
          and a.status in ('pending'::public.appointment_status, 'confirmed'::public.appointment_status, 'in_progress'::public.appointment_status)
          and a.starts_at < v_ends_at and a.ends_at > p_starts_at
      ) then
        v_barber_id := v_candidate_id;
        exit;
      end if;
    end loop;
    if v_barber_id is null then
      raise exception using errcode = '23P01', message = 'No barber is available for the requested time';
    end if;
  end if;

  insert into public.appointments(customer_id, customer_name, customer_phone, source, barber_id, starts_at, ends_at, customer_note)
  values (null, btrim(p_customer_name), nullif(btrim(p_customer_phone), ''), 'walk_in',
          v_barber_id, p_starts_at, v_ends_at, nullif(btrim(p_customer_note), ''))
  returning id into v_appointment_id;

  insert into public.appointment_services(appointment_id, service_id, service_name, unit_price, duration_minutes)
  select v_appointment_id, s.id, s.name, s.price, s.duration_minutes
  from public.services s where s.id = any(p_service_ids);
  return v_appointment_id;
end;
$function$;

revoke all on function private.create_walk_in_appointment(text, text, uuid[], timestamptz, uuid, text) from public, anon;
grant execute on function private.create_walk_in_appointment(text, text, uuid[], timestamptz, uuid, text) to authenticated;

create function public.create_walk_in_appointment(
  p_customer_name text, p_customer_phone text, p_service_ids uuid[], p_starts_at timestamptz,
  p_barber_id uuid default null, p_customer_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.create_walk_in_appointment(
    p_customer_name, p_customer_phone, p_service_ids, p_starts_at, p_barber_id, p_customer_note
  );
$function$;

revoke all on function public.create_walk_in_appointment(text, text, uuid[], timestamptz, uuid, text) from public, anon;
grant execute on function public.create_walk_in_appointment(text, text, uuid[], timestamptz, uuid, text) to authenticated;
