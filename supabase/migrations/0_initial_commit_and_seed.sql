-- ============================================================================
-- CMS E-Commerce Schema - Single Store Architecture
-- ============================================================================
-- 
-- Concepts:
-- 1. Single Store: The database serves ONE store instance. All admins manage the same content.
-- 2. Scoped Variants: Sizes & Colors are specific to each Product (not shared globally).
-- 3. Customer Flow:
--    - Guests: Buy without login (Customer info stored in 'orders' table).
--    - Registered: Can be linked via 'customers' table (future feature).
-- 4. Security:
--    - Authenticated Users (Admins): Full access to manage store.
--    - Anonymous Users (Public): Read-only access to products; Can create orders.
--
-- ============================================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMERATIONS
-- ============================================================================

create type public.order_status as enum ('pending', 'processing', 'completed', 'cancelled');
create type public.payment_method as enum ('cod', 'card', 'mbank');

-- ============================================================================
-- STORE SETTINGS (Single Row)
-- ============================================================================
-- Defines global store configuration.
-- Enforced to have only ONE row (ID=1) to prevent multiple store configs.

create table public.store_settings (
  id integer primary key default 1, -- Force singleton: Always ID 1
  store_name text not null default 'My Store',
  description text,
  logo_url text,
  support_email text,
  updated_at timestamptz not null default timezone('utc', now()),
  
  constraint settings_single_row check (id = 1),
  constraint settings_name_check check (char_length(store_name) >= 2)
);

-- ============================================================================
-- CORE TABLES (Global for the store)
-- ============================================================================

-- Billboards: Hero banners for the storefront.
create table public.billboards (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint billboards_label_check check (char_length(label) >= 2)
);

-- Categories: Organize products (e.g. "Shoes", "Shirts").
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint categories_name_check check (char_length(name) >= 2),
  constraint categories_unique_name unique (name)
);

-- Products: The main entity.
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  stock_cached integer not null default 0, -- Denormalized stock count (sum of variants)
  is_featured boolean not null default false,
  is_archived boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  constraint products_name_check check (char_length(name) >= 2),
  constraint products_price_check check (price >= 0),
  constraint products_stock_check check (stock_cached >= 0)
);
create index products_category_idx on public.products(category_id);
create index products_featured_idx on public.products(is_featured) where is_featured = true;

-- Sizes: SCOPED TO PRODUCT.
-- Example: "Product A" has sizes S, M, L. "Product B" has sizes 40, 41, 42.
create table public.sizes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint sizes_value_check check (char_length(value) >= 1)
);
create unique index sizes_unique_per_product_idx on public.sizes (product_id, lower(value));
create index sizes_product_idx on public.sizes(product_id);

-- Colors: SCOPED TO PRODUCT.
-- Example: "Product A" has Red, Blue. "Product B" has Black, White.
create table public.colors (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  
  constraint colors_value_check check (value ~* '^#[0-9A-F]{6}$')
);
create unique index colors_unique_per_product_idx on public.colors (product_id, lower(value));
create index colors_product_idx on public.colors(product_id);

-- Product Images: Multiple images per product.
create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  is_primary boolean not null default false,
  
  constraint product_images_url_check check (char_length(url) > 0)
);
create index product_images_product_idx on public.product_images(product_id);

-- Product Variants: The SKU. Combination of Product + Size + Color.
-- This is what actually holds the inventory count.
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_id uuid references public.sizes(id) on delete set null,
  color_id uuid references public.colors(id) on delete set null,
  stock integer not null default 0,
  sku text,
  
  constraint variants_stock_check check (stock >= 0)
);
create unique index variants_unique_combo_idx on public.product_variants (
  product_id,
  coalesce(size_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(color_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
create index product_variants_product_idx on public.product_variants(product_id);

-- Customers (Global List)
-- "CRM" for the store owner. Can link to Stripe or other external systems.
create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  stripe_customer_id text,
  name text,
  email text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint customers_email_unique unique (email)
);

-- Orders
-- Tracks sales. Can be linked to a known customer OR be a guest checkout (customer_id is null).
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null, -- Optional: Link to saved customer profile
  customer_name text, -- Snapshot: Name at time of purchase (for guests)
  customer_email text, -- Snapshot: Email at time of purchase (for guests)
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
create index orders_created_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status);

-- Order Items
-- The actual items purchased in an order.
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict, -- Prevent deleting products that have sales
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

-- Function: Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.handle_updated_at();

create trigger products_updated_at before update on public.products
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger customers_updated_at before update on public.customers
  for each row execute function public.handle_updated_at();

-- Function: Auto-sync product stock from variants
-- When a variant stock changes, update the parent product's cached total stock.
create or replace function public.sync_product_stock()
returns trigger language plpgsql as $$
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

-- Analytics: Get monthly revenue
-- Used for the Admin Dashboard chart.
create or replace function public.get_monthly_revenue(num_months integer default 12)
returns table (month_label text, month_date date, revenue numeric)
language sql stable security invoker as $$
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
    and o.is_paid = true
    and o.status in ('processing', 'completed')
  group by m.month_start
  order by m.month_start;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.store_settings enable row level security;
alter table public.billboards enable row level security;
alter table public.categories enable row level security;
alter table public.sizes enable row level security;
alter table public.colors enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;

-- POLICIES FOR ADMINS (Authenticated Users)
-- We assume any logged-in user in 'auth.users' is a Store Admin/Staff.
-- They have full CRUD access to everything.

create policy "Admins can do everything" on public.store_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.billboards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.sizes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.colors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.product_images for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.product_variants for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can do everything" on public.customers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Orders: Admins full access to manage orders
create policy "Admins can manage orders" on public.orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admins can manage order items" on public.order_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- POLICIES FOR PUBLIC (Anonymous Guests)
-- This allows the storefront to work for users who are not logged in.

-- 1. Read-Only Access: Guests can see products, categories, etc.
create policy "Public can view store settings" on public.store_settings for select to anon using (true);
create policy "Public can view billboards" on public.billboards for select to anon using (true);
create policy "Public can view categories" on public.categories for select to anon using (true);
create policy "Public can view sizes" on public.sizes for select to anon using (true);
create policy "Public can view colors" on public.colors for select to anon using (true);
create policy "Public can view products" on public.products for select to anon using (true);
create policy "Public can view product images" on public.product_images for select to anon using (true);
create policy "Public can view product variants" on public.product_variants for select to anon using (true);

-- 2. Checkout Access: Guests can CREATE orders, but cannot View/Edit them afterwards.
create policy "Public can create orders" on public.orders for insert to anon with check (true);
create policy "Public can create order items" on public.order_items for insert to anon with check (true);

-- -- ============================================================================
-- -- SEED DATA (Development)
-- -- ============================================================================

-- do $$
-- declare
--   v_billboard_id uuid;
--   v_category_id uuid;
--   v_product_id uuid;
--   v_size_s uuid; v_size_m uuid; v_size_l uuid;
--   v_color_white uuid; v_color_black uuid;
-- begin
--   -- Initialize Store Settings
--   insert into public.store_settings (store_name, description)
--   values ('Demo Store', 'A minimalist e-commerce experience')
--   on conflict (id) do nothing;

--   -- Create billboard
--   insert into public.billboards (label, image_url)
--   values ('Summer Collection', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=400&fit=crop')
--   returning id into v_billboard_id;

--   -- Create category
--   insert into public.categories (name)
--   values ('Apparel')
--   returning id into v_category_id;

--   -- Create product
--   insert into public.products (category_id, name, description, price, is_featured, metadata)
--   values (v_category_id, 'Essential T-Shirt', 'Premium cotton basic', 29.99, true, '{"Material": "Cotton"}'::jsonb)
--   returning id into v_product_id;

--   -- Create sizes for product
--   insert into public.sizes (product_id, name, value) values (v_product_id, 'Small', 'S') returning id into v_size_s;
--   insert into public.sizes (product_id, name, value) values (v_product_id, 'Medium', 'M') returning id into v_size_m;
--   insert into public.sizes (product_id, name, value) values (v_product_id, 'Large', 'L') returning id into v_size_l;

--   -- Create colors for product
--   insert into public.colors (product_id, name, value) values (v_product_id, 'White', '#FFFFFF') returning id into v_color_white;
--   insert into public.colors (product_id, name, value) values (v_product_id, 'Black', '#000000') returning id into v_color_black;

--   -- Create variants
--   insert into public.product_variants (product_id, size_id, color_id, stock)
--   values
--     (v_product_id, v_size_s, v_color_white, 10),
--     (v_product_id, v_size_m, v_color_black, 15);

--   -- Create product image
--   insert into public.product_images (product_id, url, is_primary)
--   values (v_product_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', true);

--   raise notice 'Seed data created.';
-- end;
-- $$;
