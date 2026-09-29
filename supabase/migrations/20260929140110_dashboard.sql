-- Read-only dashboard. RLS stays active; no privileged aggregate bypass.
create function public.get_dashboard(
  p_period text default 'today', p_start_date date default null, p_end_date date default null
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_shop uuid;
  v_timezone text;
  v_now timestamptz := statement_timestamp();
  v_local timestamp;
  v_start timestamptz;
  v_end timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select m.barbershop_id, s.timezone into v_shop, v_timezone
    from public.barbershop_users m join public.barbershops s on s.id = m.barbershop_id
    where m.user_id = auth.uid() and m.role = 'OWNER'
    order by m.created_at, m.id limit 1;
  if v_shop is null then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
  v_local := v_now at time zone v_timezone;
  case p_period
    when 'today' then
      v_start := v_local::date::timestamp at time zone v_timezone;
      v_end := (v_local::date + 1)::timestamp at time zone v_timezone;
    when 'week' then
      v_start := date_trunc('week', v_local) at time zone v_timezone;
      v_end := v_now;
    when 'month' then
      v_start := date_trunc('month', v_local) at time zone v_timezone;
      v_end := v_now;
    when 'custom' then
      if p_start_date is null or p_end_date is null or not isfinite(p_start_date) or not isfinite(p_end_date)
        or p_start_date > p_end_date or p_start_date < date '0001-01-01' or p_end_date > date '9999-12-31' then
        raise exception 'INVALID_PERIOD' using errcode = '22023';
      end if;
      v_start := p_start_date::timestamp at time zone v_timezone;
      v_end := (p_end_date + 1)::timestamp at time zone v_timezone;
    else raise exception 'INVALID_PERIOD' using errcode = '22023';
  end case;
  with active_visits as (
    select v.id, v.barber_id, v.payment_method, v.total_amount, v.commission_amount, v.visited_at
    from public.visits v
    where v.barbershop_id = v_shop and v.status = 'ACTIVE'
      and v.visited_at >= v_start and v.visited_at < v_end
  ), payment_totals as (
    select payment_method, sum(total_amount) amount from active_visits group by payment_method
  ), barber_totals as (
    select barber_id, count(*) visits, sum(total_amount) production, sum(commission_amount) commission
    from active_visits group by barber_id
  ), service_totals as (
    select i.service_id, count(*) quantity,
      (array_agg(i.service_name order by v.visited_at desc, v.id desc, i.id desc))[1] historical_name
    from active_visits v join public.visit_items i on i.visit_id = v.id and i.barbershop_id = v_shop
    group by i.service_id
  ), top_services as (
    select t.service_id, coalesce(s.name, t.historical_name) name, t.quantity
    from service_totals t left join public.services s on s.id = t.service_id and s.barbershop_id = v_shop
    order by t.quantity desc, t.service_id limit 5
  )
  select jsonb_build_object(
    'period', p_period, 'timezone', v_timezone, 'start', v_start, 'end', v_end, 'today', v_local::date,
    -- Decimal strings preserve exact COP sums even above JavaScript's safe integer.
    'totals', (select jsonb_build_object('sales',coalesce(sum(total_amount),0)::text,'visits',count(*)::text,
      'commissions',coalesce(sum(commission_amount),0)::text,'shop',coalesce(sum(total_amount-commission_amount),0)::text) from active_visits),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('method',payment_method,'amount',amount::text)
      order by case payment_method when 'CASH' then 1 when 'TRANSFER' then 2 when 'CARD' then 3 else 4 end) from payment_totals),'[]'::jsonb),
    'barbers', coalesce((select jsonb_agg(jsonb_build_object('id',t.barber_id,'name',b.name,'visits',t.visits::text,
      'production',t.production::text,'commission',t.commission::text) order by t.production desc,t.barber_id)
      from barber_totals t join public.barbers b on b.id=t.barber_id and b.barbershop_id=v_shop),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(jsonb_build_object('id',service_id,'name',name,'quantity',quantity::text)
      order by quantity desc,service_id) from top_services),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_dashboard(text,date,date) from public, anon, authenticated;
grant execute on function public.get_dashboard(text,date,date) to authenticated;
comment on function public.get_dashboard(text,date,date) is 'OWNER aggregate read with RLS. Tenant/timezone derived server-side; ACTIVE visits only. Local calendar periods, exclusive upper bound. Exact numeric strings; no persisted metrics.';
