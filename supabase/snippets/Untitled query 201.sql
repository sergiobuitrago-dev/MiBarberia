-- Run as administrator in Supabase SQL Editor, AFTER applying both migrations.
-- First create a confirmed email/password user in Authentication > Users.
-- Change ONLY the two values below. No password belongs in this file.
do $$
declare
  v_owner_email text := 'testdev@gmail.com';
  v_shop_name text := 'Sergio Barber Shop';
  v_user_id uuid;
  v_shop_id uuid;
begin
  if v_owner_email = 'CAMBIAR_CORREO_OWNER' or v_shop_name = 'CAMBIAR_NOMBRE_BARBERIA' then
    raise exception 'Reemplaza el correo del OWNER y el nombre de la barbería.';
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
