import { createClient } from '@/lib/supabase/client';
import { ProductForm } from '@/components/ProductForm';

export default async function NewProductPage() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <ProductForm
      initialData={null}
      categories={categories ?? []}
    />
  );
}




