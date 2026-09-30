-- Run as administrator in Supabase SQL Editor, AFTER applying ALL versioned migrations to the intended project.
-- First create a confirmed email/password user in Authentication > Users.
-- Change ONLY the two values below. No password belongs in this file.
do $$
declare
  v_owner_email text := ''; -- REQUIRED: confirmed Auth user email
  v_shop_name text := ''; -- REQUIRED: actual shop name
  v_user_id uuid;
  v_shop_id uuid;
begin
  v_owner_email := lower(btrim(v_owner_email));
  v_shop_name := btrim(v_shop_name);
  if coalesce(v_owner_email, '') = '' or coalesce(v_shop_name, '') = ''
    or v_owner_email ~* '^(CAMBIAR|TU_CORREO|OWNER_EMAIL)'
    or v_shop_name ~* '^(CAMBIAR|TU_BARBERIA|SHOP_NAME)' then
    raise exception 'Introduce valores explícitos de correo OWNER y nombre de barbería antes de ejecutar.';
  end if;
  if v_owner_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(v_shop_name) > 120 then
    raise exception 'Revisa el correo OWNER y el nombre de barbería (máximo 120 caracteres).';
  end if;

  select id into v_user_id from auth.users
    where lower(email) = lower(btrim(v_owner_email)) and email_confirmed_at is not null;
  if v_user_id is null then
    raise exception 'Primero crea y confirma el usuario en Authentication > Users.';
  end if;
  if exists (select 1 from public.barbershop_users where user_id = v_user_id and role = 'OWNER') then
    raise exception 'Este usuario ya tiene una barbería OWNER. No se creó otra barbería.';
  end if;

  insert into public.barbershops (name)
    values (btrim(v_shop_name)) returning id into v_shop_id;
  insert into public.barbershop_users (barbershop_id, user_id, role)
    values (v_shop_id, v_user_id, 'OWNER');

  raise notice 'Barbería creada: %. OWNER vinculado: %.', v_shop_id, v_user_id;
end;
$$;
