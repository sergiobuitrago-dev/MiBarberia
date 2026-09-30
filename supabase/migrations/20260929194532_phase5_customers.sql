-- Derived, non-materialized activity. Aggregate only visits, never visit_items.
create view public.customer_activity with (security_invoker = true) as
select c.id, c.barbershop_id, c.name, c.phone,
  a.total_visits, a.total_spent, a.last_visit
from public.customers c
cross join lateral (
  select count(*)::text as total_visits,
    coalesce(sum(v.total_amount),0)::text as total_spent,
    max(v.visited_at) as last_visit
  from public.visits v
  where v.barbershop_id=c.barbershop_id and v.customer_id=c.id and v.status='ACTIVE'
) a;
revoke all on public.customer_activity from public, anon, authenticated;
grant select on public.customer_activity to authenticated;
comment on view public.customer_activity is 'Read-only live customer summary; underlying OWNER RLS applies. One ACTIVE visit counts once regardless of services. Exact numeric strings; no persisted metrics.';

create function public.search_customers(p_query text default '', p_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_shop uuid;
  v_query text := btrim(coalesce(p_query,''));
  v_digits text;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select m.barbershop_id into v_shop from public.barbershop_users m
    where m.user_id=auth.uid() and m.role='OWNER' order by m.created_at,m.id limit 1;
  if v_shop is null then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
  if length(v_query)>120 or p_page is null or p_page<1 or p_page>100000 then
    raise exception 'INVALID_SEARCH' using errcode='22023';
  end if;
  v_digits := regexp_replace(v_query,'[^0-9]','','g');
  with matched as (
    select c.* from public.customer_activity c
    where c.barbershop_id=v_shop and (
      v_query='' or strpos(lower(c.name),lower(v_query))>0
      or (v_digits<>'' and v_query ~ '^[0-9+().[:space:]-]+$'
        and strpos(regexp_replace(coalesce(c.phone,''),'[^0-9]','','g'),v_digits)>0)
    )
  ), page_rows as (
    select * from matched order by last_visit desc nulls last, name, id
    limit 25 offset ((p_page-1)*25)
  )
  select jsonb_build_object(
    'total',(select count(*)::text from matched),
    'customers',coalesce((select jsonb_agg(to_jsonb(p)-'barbershop_id' order by p.last_visit desc nulls last,p.name,p.id) from page_rows p),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.search_customers(text,integer) from public,anon,authenticated;
grant execute on function public.search_customers(text,integer) to authenticated;
comment on function public.search_customers(text,integer) is 'OWNER-derived tenant, literal name and format-tolerant phone search; ACTIVE activity ordering and bounded 25-row pages. RLS stays active.';
