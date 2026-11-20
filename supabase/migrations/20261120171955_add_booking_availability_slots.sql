create function private.get_available_slots(
  p_service_ids uuid[],
  p_date date,
  p_barber_id uuid default null
)
returns table(slot_start timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_duration integer;
  v_count integer;
  v_hours public.business_hours%rowtype;
  v_local_open timestamp without time zone;
  v_local_close timestamp without time zone;
  v_local_slot timestamp without time zone;
  v_start timestamptz;
  v_end timestamptz;
  v_available boolean;
begin
  if p_date is null
     or p_date < (now() at time zone 'Asia/Bangkok')::date
     or p_date > (now() at time zone 'Asia/Bangkok')::date + 60
     or p_service_ids is null
     or cardinality(p_service_ids) = 0
     or cardinality(p_service_ids) > 10
     or array_position(p_service_ids, null) is not null
     or (select count(distinct x) from unnest(p_service_ids) as x) <> cardinality(p_service_ids) then
    return;
  end if;

  select count(*), coalesce(sum(s.duration_minutes), 0)::integer
  into v_count, v_duration
  from public.services s
  where s.id = any(p_service_ids) and s.is_active = true;

  if v_count <> cardinality(p_service_ids) or v_duration <= 0 then
    return;
  end if;

  if p_barber_id is not null and not exists (
    select 1 from public.barbers b where b.id = p_barber_id and b.is_active = true
  ) then
    return;
  end if;

  select * into v_hours
  from public.business_hours
  where weekday = extract(dow from p_date)::smallint;

  if not found or v_hours.is_closed or v_hours.opens_at is null or v_hours.closes_at is null then
    return;
  end if;

  v_local_open := p_date + v_hours.opens_at;
  v_local_close := p_date + v_hours.closes_at;

  for v_local_slot in
    select generate_series(
      v_local_open,
      v_local_close - make_interval(mins => v_duration),
      interval '15 minutes'
    )
  loop
    v_start := v_local_slot at time zone 'Asia/Bangkok';
    v_end := v_start + make_interval(mins => v_duration);

    if v_start <= now() then
      continue;
    end if;

    if p_barber_id is not null then
      select exists (
        select 1
        from public.barbers b
        where b.id = p_barber_id
          and b.is_active = true
          and not exists (
            select 1 from public.appointments a
            where a.barber_id = b.id
              and a.status in ('pending'::public.appointment_status, 'confirmed'::public.appointment_status, 'in_progress'::public.appointment_status)
              and a.starts_at < v_end and a.ends_at > v_start
          )
      ) into v_available;
    else
      select exists (
        select 1
        from public.barbers b
        where b.is_active = true
          and not exists (
            select 1 from public.appointments a
            where a.barber_id = b.id
              and a.status in ('pending'::public.appointment_status, 'confirmed'::public.appointment_status, 'in_progress'::public.appointment_status)
              and a.starts_at < v_end and a.ends_at > v_start
          )
      ) into v_available;
    end if;

    if v_available then
      slot_start := v_start;
      return next;
    end if;
  end loop;
end;
$function$;

revoke all on function private.get_available_slots(uuid[], date, uuid) from public, anon;
grant execute on function private.get_available_slots(uuid[], date, uuid) to authenticated;

create function public.get_available_slots(
  p_service_ids uuid[],
  p_date date,
  p_barber_id uuid default null
)
returns table(slot_start timestamptz)
language sql
stable
security invoker
set search_path = ''
as $function$
  select * from private.get_available_slots(p_service_ids, p_date, p_barber_id);
$function$;

revoke all on function public.get_available_slots(uuid[], date, uuid) from public, anon;
grant execute on function public.get_available_slots(uuid[], date, uuid) to authenticated;
