-- ============================================================================
-- SEED DATA (Development) 
-- ============================================================================



-- also create a user with the following credentials:
-- username: naheed28ray@gmail.com
-- password: 123456789
-- and assign the role of admin to the user



do $$
declare
  v_billboard_id uuid;
  v_category_id uuid;
  v_product_id uuid;
  v_size_s uuid; v_size_m uuid; v_size_l uuid;
  v_color_white uuid; v_color_black uuid;
  v_user_id uuid;
begin
 
  -- Initialize Store Settings
  insert into public.store_settings (store_name, description)
  values ('Demo Store', 'A minimalist e-commerce experience')
  on conflict (id) do nothing;

  -- Create billboard
  insert into public.billboards (label, image_url)
  values ('Summer Collection', 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=400&fit=crop')
  returning id into v_billboard_id;

  -- Create category
  insert into public.categories (name)
  values ('Apparel')
  returning id into v_category_id;

  -- Create product
  insert into public.products (category_id, name, description, price, is_featured, metadata)
  values (v_category_id, 'Essential T-Shirt', 'Premium cotton basic', 29.99, true, '{"Material": "Cotton"}'::jsonb)
  returning id into v_product_id;

  -- Create sizes for product
  insert into public.sizes (product_id, name, value) values (v_product_id, 'Small', 'S') returning id into v_size_s;
  insert into public.sizes (product_id, name, value) values (v_product_id, 'Medium', 'M') returning id into v_size_m;
  insert into public.sizes (product_id, name, value) values (v_product_id, 'Large', 'L') returning id into v_size_l;

  -- Create colors for product
  insert into public.colors (product_id, name, value) values (v_product_id, 'White', '#FFFFFF') returning id into v_color_white;
  insert into public.colors (product_id, name, value) values (v_product_id, 'Black', '#000000') returning id into v_color_black;

  -- Create variants
  insert into public.product_variants (product_id, size_id, color_id, stock)
  values
    (v_product_id, v_size_s, v_color_white, 10),
    (v_product_id, v_size_m, v_color_black, 15);

  -- Create product image
  insert into public.product_images (product_id, url, is_primary)
  values (v_product_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', true);

  raise notice 'Seed data created.';
end;
$$;
