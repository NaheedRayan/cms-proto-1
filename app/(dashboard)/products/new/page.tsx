import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/ProductForm';

export default async function NewProductPage() {
  const supabase = await createClient();

  const [categoriesRes, colorsRes, sizesRes] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('colors').select('*').order('name'),
    supabase.from('sizes').select('*').order('name'),
  ]);

  return (
    <ProductForm
      initialData={null}
      categories={categoriesRes.data ?? []}
      colors={colorsRes.data ?? []}
      sizes={sizesRes.data ?? []}
    />
  );
}




