-- Critical visit writes are permitted ONLY through this authorized transaction.
-- The exposed wrapper is invoker; privileged implementation stays in private.
create function private.create_visit(
  p_barber_id uuid,
  p_items jsonb,
  p_discount_amount bigint,
  p_payment_method text,
  p_customer_id uuid default null,
  p_new_customer jsonb default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_shop uuid;
  v_customer uuid := p_customer_id;
  v_visit uuid;
  v_rate numeric(5,2);
  v_item jsonb;
  v_service public.services%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_seen uuid[] := '{}'::uuid[];
  v_service_id uuid;
  v_price bigint;
  v_subtotal bigint := 0;
  v_total bigint;
  v_name text;
  v_phone text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  -- Same stable membership choice as the app; clients cannot supply a shop id.
  -- The share lock serializes this operation with membership revocation.
  select m.barbershop_id into v_shop from public.barbershop_users m
    where m.user_id = auth.uid() and m.role = 'OWNER'
    order by m.created_at, m.id limit 1 for share;
  if v_shop is null then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;

  if p_payment_method is null or p_payment_method not in ('CASH','TRANSFER','CARD','OTHER') then
    raise exception 'INVALID_PAYMENT' using errcode = '22023';
  end if;
  if p_discount_amount is null or p_discount_amount < 0 or p_discount_amount > 9007199254740991 then
    raise exception 'INVALID_DISCOUNT' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;
  select b.commission_rate into v_rate from public.barbers b
    where b.id = p_barber_id and b.barbershop_id = v_shop and b.is_active for share;
  if not found then raise exception 'BARBER_UNAVAILABLE' using errcode = '22023'; end if;

  if p_customer_id is not null and p_new_customer is not null then
    raise exception 'INVALID_CUSTOMER' using errcode = '22023';
  end if;
  if p_customer_id is not null then
    perform 1 from public.customers c where c.id = p_customer_id and c.barbershop_id = v_shop for share;
    if not found then raise exception 'CUSTOMER_UNAVAILABLE' using errcode = '22023'; end if;
  end if;
  if p_new_customer is not null then
    if jsonb_typeof(p_new_customer) <> 'object' then raise exception 'INVALID_CUSTOMER' using errcode = '22023'; end if;
    if (p_new_customer - 'name' - 'phone') <> '{}'::jsonb or jsonb_typeof(p_new_customer->'name') is distinct from 'string'
      or (p_new_customer ? 'phone' and jsonb_typeof(p_new_customer->'phone') not in ('string','null')) then
      raise exception 'INVALID_CUSTOMER' using errcode = '22023';
    end if;
    v_name := btrim(p_new_customer->>'name');
    v_phone := nullif(btrim(p_new_customer->>'phone'), '');
    if length(v_name) not between 1 and 120 or length(v_phone) > 30 then
      raise exception 'INVALID_CUSTOMER' using errcode = '22023';
    end if;
    insert into public.customers(barbershop_id,name,phone) values(v_shop,v_name,v_phone) returning id into v_customer;
  end if;

  -- Sort locks deterministically; catalog edits/deactivation wait until commit.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'service_id' loop
    if jsonb_typeof(v_item) <> 'object' or (v_item - 'service_id' - 'charged_price') <> '{}'::jsonb then
      raise exception 'INVALID_ITEMS' using errcode = '22023';
    end if;
    if (v_item->>'service_id') is null or (v_item->>'service_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (v_item->>'charged_price') is null or (v_item->>'charged_price') !~ '^[0-9]{1,16}$' then
      raise exception 'INVALID_ITEMS' using errcode = '22023';
    end if;
    v_service_id := (v_item->>'service_id')::uuid;
    v_price := (v_item->>'charged_price')::bigint;
    if v_service_id = any(v_seen) or v_price > 9007199254740991 then
      raise exception 'INVALID_ITEMS' using errcode = '22023';
    end if;
    v_seen := array_append(v_seen,v_service_id);
    select * into v_service from public.services s where s.id = v_service_id and s.barbershop_id = v_shop and s.is_active for share;
    if not found then raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023'; end if;
    v_subtotal := v_subtotal + v_price;
    if v_subtotal > 9007199254740991 then raise exception 'AMOUNT_TOO_LARGE' using errcode = '22023'; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('service_id',v_service.id,'service_name',v_service.name,'catalog_price',v_service.base_price,'charged_price',v_price));
  end loop;
  if p_discount_amount > v_subtotal then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL' using errcode = '22023'; end if;
  v_total := v_subtotal - p_discount_amount;
  insert into public.visits(barbershop_id,customer_id,barber_id,payment_method,subtotal_amount,discount_amount,total_amount,commission_rate,commission_amount,visited_at,notes)
    values(v_shop,v_customer,p_barber_id,p_payment_method,v_subtotal,p_discount_amount,v_total,v_rate,
      round(v_total::numeric * v_rate / 100)::bigint,clock_timestamp(),null)
    returning id into v_visit;
  insert into public.visit_items(barbershop_id,visit_id,service_id,service_name,catalog_price,charged_price)
    select v_shop,v_visit,x.service_id,x.service_name,x.catalog_price,x.charged_price
    from jsonb_to_recordset(v_items) as x(service_id uuid,service_name text,catalog_price bigint,charged_price bigint);
  return v_visit;
end;
$$;
revoke all on function private.create_visit(uuid,jsonb,bigint,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.create_visit(uuid,jsonb,bigint,text,uuid,jsonb) to authenticated;

create function public.create_visit(
  p_barber_id uuid,
  p_items jsonb,
  p_discount_amount bigint,
  p_payment_method text,
  p_customer_id uuid default null,
  p_new_customer jsonb default null
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.create_visit(p_barber_id,p_items,p_discount_amount,p_payment_method,p_customer_id,p_new_customer);
$$;
revoke all on function public.create_visit(uuid,jsonb,bigint,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_visit(uuid,jsonb,bigint,text,uuid,jsonb) to authenticated;
comment on function public.create_visit(uuid,jsonb,bigint,text,uuid,jsonb) is 'Atomic OWNER visit creation; tenant, snapshots, money and time derived server-side. Returns visit UUID.';
comment on table public.visits is 'No direct API writes. create_visit is the only write path; update/void deferred.';
