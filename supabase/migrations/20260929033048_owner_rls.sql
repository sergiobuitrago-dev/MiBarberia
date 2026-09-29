-- The only SECURITY DEFINER helper is a private authorization lookup, not a CRUD RPC.
-- auth.uid() comes from the verified JWT supplied by Supabase's Data API.
create function private.owned_barbershop_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select membership.barbershop_id
  from public.barbershop_users as membership
  where membership.user_id = (select auth.uid())
    and (select auth.uid()) is not null
    and membership.role = 'OWNER';
$$;
revoke all on function private.owned_barbershop_ids() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.owned_barbershop_ids() to authenticated;

grant select on public.barbershops, public.barbershop_users, public.barbers,
  public.services, public.customers, public.visits, public.visit_items,
  public.loyalty_programs to authenticated;

create policy owner_read_shop on public.barbershops
  for select to authenticated
  using (id in (select private.owned_barbershop_ids()));
create policy owner_update_shop on public.barbershops
  for update to authenticated
  using (id in (select private.owned_barbershop_ids()))
  with check (id in (select private.owned_barbershop_ids()));
grant update (name, google_review_url) on public.barbershops to authenticated;

-- No API inserts, updates or deletes for memberships, regardless of role.
create policy owner_read_own_membership on public.barbershop_users
  for select to authenticated
  using (user_id = (select auth.uid()) and role = 'OWNER');

do $$
declare table_name text;
begin
  foreach table_name in array array['barbers', 'services', 'customers', 'loyalty_programs', 'visits', 'visit_items'] loop
    execute format('create policy owner_read on public.%I for select to authenticated using (barbershop_id in (select private.owned_barbershop_ids()))', table_name);
  end loop;
  foreach table_name in array array['barbers', 'services', 'customers', 'loyalty_programs'] loop
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (barbershop_id in (select private.owned_barbershop_ids()))', table_name);
    execute format('create policy owner_update on public.%I for update to authenticated using (barbershop_id in (select private.owned_barbershop_ids())) with check (barbershop_id in (select private.owned_barbershop_ids()))', table_name);
  end loop;
end;
$$;

-- Column grants keep primary keys, tenant ownership and timestamps immutable to API clients.
grant insert (barbershop_id, name, commission_rate, is_active) on public.barbers to authenticated;
grant update (name, commission_rate, is_active) on public.barbers to authenticated;
grant insert (barbershop_id, name, base_price, is_active) on public.services to authenticated;
grant update (name, base_price, is_active) on public.services to authenticated;
grant insert (barbershop_id, name, phone) on public.customers to authenticated;
grant update (name, phone) on public.customers to authenticated;
grant insert (barbershop_id, required_visits, reward_description, is_active) on public.loyalty_programs to authenticated;
grant update (required_visits, reward_description, is_active) on public.loyalty_programs to authenticated;

-- No DELETE grants or policies. visits/visit_items deliberately have SELECT only.
