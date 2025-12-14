-- ============================================================================
-- CMS E-Commerce Schema - Single Store Per User (Minimal & Robust)
-- Aligned with PRD Version 2.0
-- ============================================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMERATIONS
-- ============================================================================

create type public.order_status as enum ('pending', 'processing', 'completed', 'cancelled');
create type public.payment_method as enum ('cod', 'card', 'bkash');

-- ============================================================================
-- USER SETTINGS (Replaces Store)
-- ============================================================================

-- User settings for store branding (PRD Section 3.7: Settings & Branding)
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null default 'My Store',
  description text,
  logo_url text,
  support_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  constraint settings_name_check check (char_length(store_name) >= 2)
);

-- ============================================================================
-- CORE TABLES (All user-scoped)
-- ============================================================================

-- Billboards (PRD Entity: Billboard)
create table public.billboards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint billboards_label_check check (char_length(label) >= 2)
);
create index billboards_user_idx on public.billboards(user_id);

-- Categories (PRD Entity: Category)
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  billboard_id uuid references public.billboards(id) on delete set null,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint categories_name_check check (char_length(name) >= 2),
  constraint categories_unique_per_user unique (user_id, lower(name))
);
create index categories_user_idx on public.categories(user_id);

-- Sizes (PRD Entity: Size for Variants)
create table public.sizes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint sizes_value_check check (char_length(value) >= 1),
  constraint sizes_unique_per_user unique (user_id, lower(value))
);
create index sizes_user_idx on public.sizes(user_id);

-- Colors (PRD Entity: Color for Variants)
create table public.colors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint colors_value_check check (value ~* '^#[0-9A-F]{6}$'),
  constraint colors_unique_per_user unique (user_id, lower(value))
);
create index colors_user_idx on public.colors(user_id);

-- Products (PRD Entity: Product)
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  stock_cached integer not null default 0,
  is_featured boolean not null default false,
  is_archived boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  constraint products_name_check check (char_length(name) >= 2),
  constraint products_price_check check (price >= 0),
  constraint products_stock_check check (stock_cached >= 0)
);
create index products_user_idx on public.products(user_id);
create index products_category_idx on public.products(category_id);
create index products_featured_idx on public.products(user_id, is_featured) where is_featured = true;

-- Product Images (PRD: "Multiple image uploads per product")
create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  is_primary boolean not null default false,
  
  constraint product_images_url_check check (char_length(url) > 0)
);
create index product_images_product_idx on public.product_images(product_id);
create index product_images_primary_idx on product_images(product_id, is_primary) where is_primary = true;

-- Product Variants (PRD Entity: Variant)
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_id uuid references public.sizes(id) on delete set null,
  color_id uuid references public.colors(id) on delete set null,
  stock integer not null default 0,
  sku text,
  
  constraint variants_stock_check check (stock >= 0),
  constraint variants_unique_combo unique (
    product_id,
    coalesce(size_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(color_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
);
create index product_variants_product_idx on public.product_variants(product_id);

-- Orders (PRD Entity: Order)
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  customer_email text,
  phone text,
  address text,
  total_price numeric(10,2) not null,
  status order_status not null default 'pending',
  payment_method payment_method not null default 'cod',
  is_paid boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  constraint orders_total_check check (total_price >= 0),
  constraint orders_email_check check (customer_email is null or customer_email ~* '^[^@]+@[^@]+\.[^@]+$')
);
create index orders_user_idx on public.orders(user_id);
create index orders_created_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(user_id, status);

-- Order Items
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_price_check check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items(order_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.handle_updated_at();

create trigger products_updated_at before update on public.products
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

-- Auto-sync product stock from variants
create or replace function public.sync_product_stock()
returns trigger
language plpgsql
as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);
  
  update public.products
  set stock_cached = coalesce((
    select sum(stock)
    from public.product_variants
    where product_id = target_product_id
  ), 0)
  where id = target_product_id;
  
  return coalesce(new, old);
end;
$$;

create trigger sync_stock_on_variant_change
  after insert or update or delete on public.product_variants
  for each row execute function public.sync_product_stock();

-- Auto-create user settings on first login
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_settings (user_id, store_name)
  values (new.id, 'My Store')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ANALYTICS FUNCTIONS (PRD: Dashboard KPIs & Revenue Chart)
-- ============================================================================

-- Get monthly revenue for dashboard chart
create or replace function public.get_monthly_revenue(
  num_months integer default 12
)
returns table (
  month_label text,
  month_date date,
  revenue numeric
)
language sql
stable
security invoker
as $$
  with months as (
    select generate_series(
      date_trunc('month', timezone('utc', now()) - (num_months - 1 || ' months')::interval),
      date_trunc('month', timezone('utc', now())),
      '1 month'::interval
    )::date as month_start
  )
  select
    to_char(m.month_start, 'Mon') as month_label,
    m.month_start as month_date,
    coalesce(sum(o.total_price), 0) as revenue
  from months m
  left join public.orders o
    on date_trunc('month', o.created_at)::date = m.month_start
    and o.user_id = auth.uid()
    and o.is_paid = true
    and o.status in ('processing', 'completed')
  group by m.month_start
  order by m.month_start;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.user_settings enable row level security;
alter table public.billboards enable row level security;
alter table public.categories enable row level security;
alter table public.sizes enable row level security;
alter table public.colors enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- User Settings policies
create policy "Users manage own settings"
  on public.user_settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Direct user-scoped policies
create policy "Users manage own billboards"
  on public.billboards
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own categories"
  on public.categories
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own sizes"
  on public.sizes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own colors"
  on public.colors
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own products"
  on public.products
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own orders"
  on public.orders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Product-scoped policies
create policy "Users manage own product images"
  on public.product_images
  for all
  using (
    exists (select 1 from public.products where id = product_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.products where id = product_id and user_id = auth.uid())
  );

create policy "Users manage own product variants"
  on public.product_variants
  for all
  using (
    exists (select 1 from public.products where id = product_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.products where id = product_id and user_id = auth.uid())
  );

-- Order-scoped policies
create policy "Users manage own order items"
  on public.order_items
  for all
  using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

-- ============================================================================
-- SEED DATA (Development Only)
-- ============================================================================

do $$
declare
  v_user_id uuid;
  v_billboard_id uuid;
  v_category_id uuid;
  v_size_s uuid;
  v_size_m uuid;
  v_size_l uuid;
  v_color_white uuid;
  v_color_black uuid;
  v_product_id uuid;
begin
  -- Get first auth user
  select id into v_user_id from auth.users order by created_at limit 1;
  
  if v_user_id is null then
    raise notice 'No auth users found - skipping seed data';
    return;
  end if;

  -- Create user settings (will auto-create on login, but set it here for demo)
  insert into public.user_settings (user_id, store_name, description, support_email)
  values (
    v_user_id,
    'Demo Store',
    'A minimalist e-commerce experience',
    'hello@demo.store'
  )
  on conflict (user_id) do update 
    set store_name = excluded.store_name,
        description = excluded.description;

  -- Create billboard
  insert into public.billboards (user_id, label, image_url)
  values (v_user_id, 'Summer Collection', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=400&fit=crop')
  on conflict do nothing
  returning id into v_billboard_id;

  -- Create category
  insert into public.categories (user_id, name, billboard_id)
  values (v_user_id, 'Apparel', v_billboard_id)
  on conflict (user_id, lower(name)) do update set billboard_id = excluded.billboard_id
  returning id into v_category_id;

  -- Create sizes
  insert into public.sizes (user_id, name, value)
  values 
    (v_user_id, 'Small', 'S'),
    (v_user_id, 'Medium', 'M'),
    (v_user_id, 'Large', 'L')
  on conflict (user_id, lower(value)) do nothing;
  
  select id into v_size_s from public.sizes where user_id = v_user_id and value = 'S';
  select id into v_size_m from public.sizes where user_id = v_user_id and value = 'M';
  select id into v_size_l from public.sizes where user_id = v_user_id and value = 'L';

  -- Create colors
  insert into public.colors (user_id, name, value)
  values 
    (v_user_id, 'White', '#FFFFFF'),
    (v_user_id, 'Black', '#000000')
  on conflict (user_id, lower(value)) do nothing;
  
  select id into v_color_white from public.colors where user_id = v_user_id and value = '#FFFFFF';
  select id into v_color_black from public.colors where user_id = v_user_id and value = '#000000';

  -- Create demo product
  insert into public.products (user_id, category_id, name, description, price, is_featured, metadata)
  values (
    v_user_id,
    v_category_id,
    'Essential T-Shirt',
    'Comfortable everyday essential made from premium cotton',
    29.99,
    true,
    '{"Material": "100% Cotton", "Care": "Machine washable"}'::jsonb
  )
  on conflict do nothing
  returning id into v_product_id;

  -- Add product image
  if v_product_id is not null then
    insert into public.product_images (product_id, url, position, is_primary)
    values (v_product_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', 1, true)
    on conflict do nothing;

    -- Add variants
    insert into public.product_variants (product_id, size_id, color_id, stock)
    values
      (v_product_id, v_size_s, v_color_white, 10),
      (v_product_id, v_size_m, v_color_white, 15),
      (v_product_id, v_size_l, v_color_black, 12)
    on conflict do nothing;

    -- Add demo order
    insert into public.orders (
      user_id,
      customer_name,
      customer_email,
      phone,
      address,
      total_price,
      status,
      payment_method,
      is_paid
    )
    values (
      v_user_id,
      'John Doe',
      'john@example.com',
      '+1234567890',
      '123 Main St, City',
      59.98,
      'completed',
      'card',
      true
    )
    on conflict do nothing;
  end if;

  raise notice 'Seed data created successfully';
end;
$$;
