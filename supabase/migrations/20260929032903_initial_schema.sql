-- Phase 1: schema only. Critical visit writes stay inaccessible to API roles.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  currency_code char(3) not null default 'COP' check (currency_code = 'COP'),
  timezone text not null default 'America/Bogota' check (timezone = 'America/Bogota'),
  google_review_url text check (google_review_url is null or google_review_url ~ '^https://[^[:space:]]+$'),
  created_at timestamptz not null default now()
);

create table public.barbershop_users (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'BARBER')),
  created_at timestamptz not null default now(),
  unique (barbershop_id, user_id)
);
create index barbershop_users_user_shop_idx on public.barbershop_users(user_id, barbershop_id);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  commission_rate numeric(5,2) not null check (commission_rate between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  base_price bigint not null check (base_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  phone text check (phone is null or length(btrim(phone)) between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, id)
);
create index customers_shop_name_idx on public.customers(barbershop_id, name);
create index customers_shop_phone_idx on public.customers(barbershop_id, phone) where phone is not null;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  customer_id uuid,
  barber_id uuid not null,
  payment_method text not null check (payment_method in ('CASH', 'TRANSFER', 'CARD', 'OTHER')),
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0 and discount_amount <= subtotal_amount),
  total_amount bigint not null check (total_amount >= 0 and total_amount = subtotal_amount - discount_amount),
  commission_rate numeric(5,2) not null check (commission_rate between 0 and 100),
  commission_amount bigint not null check (
    commission_amount >= 0 and commission_amount = round(total_amount::numeric * commission_rate / 100)::bigint
  ),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'VOIDED')),
  notes text,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  check ((status = 'VOIDED') = (voided_at is not null)),
  unique (barbershop_id, id),
  foreign key (barbershop_id, barber_id) references public.barbers(barbershop_id, id) on delete restrict,
  foreign key (barbershop_id, customer_id) references public.customers(barbershop_id, id) on delete restrict
);
create index visits_shop_date_idx on public.visits(barbershop_id, visited_at desc);
create index visits_shop_customer_date_idx on public.visits(barbershop_id, customer_id, visited_at desc);
create index visits_shop_barber_idx on public.visits(barbershop_id, barber_id);

create table public.visit_items (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete restrict,
  visit_id uuid not null,
  service_id uuid not null,
  service_name text not null check (length(btrim(service_name)) between 1 and 120),
  catalog_price bigint not null check (catalog_price >= 0),
  charged_price bigint not null check (charged_price >= 0),
  created_at timestamptz not null default now(),
  foreign key (barbershop_id, visit_id) references public.visits(barbershop_id, id) on delete restrict,
  foreign key (barbershop_id, service_id) references public.services(barbershop_id, id) on delete restrict
);
create index visit_items_shop_visit_idx on public.visit_items(barbershop_id, visit_id);
create index visit_items_shop_service_idx on public.visit_items(barbershop_id, service_id);

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null unique references public.barbershops(id) on delete restrict,
  required_visits integer not null check (required_visits > 0),
  reward_description text not null check (length(btrim(reward_description)) between 1 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['barbers', 'services', 'customers', 'visits', 'loyalty_programs'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
  foreach table_name in array array['barbershops', 'barbershop_users', 'barbers', 'services', 'customers', 'visits', 'visit_items', 'loyalty_programs'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end;
$$;

comment on table public.visits is 'No direct API writes. Transactional create/update/void functions are deferred to Phase 3.';
