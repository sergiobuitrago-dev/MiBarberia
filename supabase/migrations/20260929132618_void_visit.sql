-- Phase 3B: permanent cancellation, no direct API writes or restoration.
create function private.void_visit(p_visit_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_shop uuid;
  v_visit uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  -- Same deterministic OWNER selection as requireOwner/create_visit.
  -- Hold membership until commit so revocation cannot interleave.
  select m.barbershop_id into v_shop from public.barbershop_users m
    where m.user_id = v_user and m.role = 'OWNER'
    order by m.created_at, m.id limit 1 for share;
  if v_shop is null then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;

  -- Atomic conditional update: concurrent attempts serialize on the row;
  -- only the first can change ACTIVE to VOIDED. Never inspect foreign rows.
  update public.visits
    set status = 'VOIDED', voided_at = clock_timestamp()
    where id = p_visit_id and barbershop_id = v_shop and status = 'ACTIVE'
    returning id into v_visit;
  if v_visit is null then
    -- Identical response for nonexistent, foreign and already voided visits.
    raise exception 'VISIT_UNAVAILABLE' using errcode = '22023';
  end if;
  return v_visit;
end;
$$;
revoke all on function private.void_visit(uuid) from public, anon, authenticated;
grant execute on function private.void_visit(uuid) to authenticated;

create function public.void_visit(p_visit_id uuid)
returns uuid
language sql security invoker set search_path = ''
as $$ select private.void_visit(p_visit_id); $$;
revoke all on function public.void_visit(uuid) from public, anon, authenticated;
grant execute on function public.void_visit(uuid) to authenticated;
comment on function public.void_visit(uuid) is 'OWNER-only permanent cancellation. Tenant and voided_at derived server-side. Returns UUID; missing, foreign and non-ACTIVE visits share VISIT_UNAVAILABLE.';
comment on table public.visits is 'No direct API writes. create_visit and void_visit are the only API write paths. No editing or restoration.';
