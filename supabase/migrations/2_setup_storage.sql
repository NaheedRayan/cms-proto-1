-- Create a storage bucket for billboards
insert into storage.buckets (id, name, public)
values ('billboards', 'billboards', true)
on conflict (id) do nothing;

-- Allow public access to view images
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Billboards images are publicly accessible'
  ) then
    create policy "Billboards images are publicly accessible"
      on storage.objects for select
      using ( bucket_id = 'billboards' );
  end if;
end $$;

-- Allow authenticated users to upload images
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can upload billboard images'
  ) then
    create policy "Authenticated users can upload billboard images"
      on storage.objects for insert
      with check ( bucket_id = 'billboards' and auth.role() = 'authenticated' );
  end if;
end $$;

-- Allow authenticated users to update/delete their uploaded images (or all images since they are admins)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can update billboard images'
  ) then
    create policy "Authenticated users can update billboard images"
      on storage.objects for update
      using ( bucket_id = 'billboards' and auth.role() = 'authenticated' );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can delete billboard images'
  ) then
    create policy "Authenticated users can delete billboard images"
      on storage.objects for delete
      using ( bucket_id = 'billboards' and auth.role() = 'authenticated' );
  end if;
end $$;

-- Create a storage bucket for products
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Allow public access to view product images
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Products images are publicly accessible'
  ) then
    create policy "Products images are publicly accessible"
      on storage.objects for select
      using ( bucket_id = 'products' );
  end if;
end $$;

-- Allow authenticated users to upload product images
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can upload product images'
  ) then
    create policy "Authenticated users can upload product images"
      on storage.objects for insert
      with check ( bucket_id = 'products' and auth.role() = 'authenticated' );
  end if;
end $$;

-- Allow authenticated users to update/delete their uploaded images
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can update product images'
  ) then
    create policy "Authenticated users can update product images"
      on storage.objects for update
      using ( bucket_id = 'products' and auth.role() = 'authenticated' );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'objects' 
    and schemaname = 'storage' 
    and policyname = 'Authenticated users can delete product images'
  ) then
    create policy "Authenticated users can delete product images"
      on storage.objects for delete
      using ( bucket_id = 'products' and auth.role() = 'authenticated' );
  end if;
end $$;

