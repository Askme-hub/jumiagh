
-- Enum
create type public.app_role as enum ('admin', 'user');

-- Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null,
  old_price numeric,
  image_url text,
  stock integer not null default 0,
  discount integer,
  category text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('JM' || to_char(now(),'YYMMDD') || lpad(floor(random()*1000000)::text,6,'0')),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'placed',
  total numeric not null,
  item_count integer not null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric not null,
  old_price numeric,
  image_url text,
  qty integer not null
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);

create table public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  product_name text,
  product_image text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- New user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Order status logging
create or replace function public.log_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') or (tg_op='UPDATE' and old.status is distinct from new.status) then
    insert into public.order_status_history(order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger trg_order_status
after insert or update on public.orders
for each row execute function public.log_order_status();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inbox_messages enable row level security;

create policy "profiles self read" on public.profiles for select using (auth.uid()=id);
create policy "profiles self update" on public.profiles for update using (auth.uid()=id);
create policy "profiles admin read" on public.profiles for select using (public.has_role(auth.uid(),'admin'));

create policy "roles self read" on public.user_roles for select using (auth.uid()=user_id);
create policy "roles admin all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "products read all" on public.products for select using (true);
create policy "products admin write" on public.products for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "orders self read" on public.orders for select using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "orders self insert" on public.orders for insert with check (auth.uid()=user_id);
create policy "orders admin update" on public.orders for update using (public.has_role(auth.uid(),'admin'));

create policy "order_items read" on public.order_items for select using (
  exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "order_items insert" on public.order_items for insert with check (
  exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())
);

create policy "status_history read" on public.order_status_history for select using (
  exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin')))
);

create policy "inbox read" on public.inbox_messages for select using (user_id=auth.uid() or user_id is null or public.has_role(auth.uid(),'admin'));
create policy "inbox update self" on public.inbox_messages for update using (user_id=auth.uid());
create policy "inbox admin write" on public.inbox_messages for insert with check (public.has_role(auth.uid(),'admin'));
create policy "inbox admin delete" on public.inbox_messages for delete using (public.has_role(auth.uid(),'admin'));
